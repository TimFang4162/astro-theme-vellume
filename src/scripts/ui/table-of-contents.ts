import { runOnPageLoad } from "./page-load";

const MOBILE_DRAWER_SYNC_DELAY_MS = 320;

interface TocLinkEntry {
  depth: number;
  node: HTMLElement;
  slug: string;
  element: HTMLElement;
  link: HTMLAnchorElement;
  progressBar: HTMLElement;
}

function buildTocLinks(links: HTMLAnchorElement[]): TocLinkEntry[] {
  return links
    .map((link) => {
      const slug = link.dataset.heading;
      const element = slug ? document.getElementById(slug) : null;
      const progressBar = link.parentElement?.querySelector(".toc-progress");
      const node = link.closest(".toc-node");
      const depth = Number(
        node instanceof HTMLElement ? (node.dataset.depth ?? 0) : 0,
      );

      if (
        !slug ||
        !(element instanceof HTMLElement) ||
        !(progressBar instanceof HTMLElement) ||
        !(node instanceof HTMLElement) ||
        !Number.isFinite(depth)
      ) {
        return null;
      }

      return {
        depth,
        node,
        slug,
        element,
        link,
        progressBar,
      };
    })
    .filter((item): item is TocLinkEntry => item !== null);
}

function isLinkVisible(link: HTMLElement) {
  return !link.closest('.toc-node[data-collapsed="true"] > .toc-children');
}

function getSectionEnd(
  tocLinks: TocLinkEntry[],
  index: number,
  depth: number,
  includeSubtree: boolean,
  fallbackEnd: number,
) {
  if (!includeSubtree) {
    return tocLinks[index + 1]?.element.offsetTop ?? fallbackEnd;
  }

  for (let cursor = index + 1; cursor < tocLinks.length; cursor += 1) {
    if (tocLinks[cursor].depth <= depth) {
      return tocLinks[cursor].element.offsetTop;
    }
  }

  return fallbackEnd;
}

function getOffsetWithinScrollContainer(
  scrollContainer: HTMLElement,
  element: HTMLElement,
) {
  const elementTop = element.getBoundingClientRect().top;
  const containerTop = scrollContainer.getBoundingClientRect().top;

  return elementTop - containerTop + scrollContainer.scrollTop;
}

function getDocumentScrollOffset() {
  const rootStyle = window.getComputedStyle(document.documentElement);
  const rawOffset = rootStyle.getPropertyValue("--scroll-offset-block").trim();

  if (!rawOffset) {
    return 88;
  }

  if (rawOffset.endsWith("rem")) {
    const rootFontSize = Number.parseFloat(rootStyle.fontSize || "16");
    const remValue = Number.parseFloat(rawOffset);

    if (Number.isFinite(rootFontSize) && Number.isFinite(remValue)) {
      return rootFontSize * remValue;
    }
  }

  const pixelValue = Number.parseFloat(rawOffset);
  return Number.isFinite(pixelValue) ? pixelValue : 88;
}

function syncActiveLinksIntoView(
  scrollContainer: HTMLElement,
  activeLinks: HTMLAnchorElement[],
) {
  if (activeLinks.length === 0) {
    return;
  }

  const firstLink = activeLinks[0];
  const lastLink = activeLinks[activeLinks.length - 1];
  const topTarget =
    getOffsetWithinScrollContainer(scrollContainer, firstLink) - 12;
  const bottomTarget =
    getOffsetWithinScrollContainer(scrollContainer, lastLink) +
    lastLink.offsetHeight +
    12;
  const visibleTop = scrollContainer.scrollTop;
  const visibleBottom = visibleTop + scrollContainer.clientHeight;

  if (topTarget < visibleTop) {
    scrollContainer.scrollTo({
      top: Math.max(topTarget, 0),
      behavior: "auto",
    });
    return;
  }

  if (bottomTarget > visibleBottom) {
    scrollContainer.scrollTo({
      top: bottomTarget - scrollContainer.clientHeight,
      behavior: "auto",
    });
  }
}

function setNodeCollapsed(node: HTMLElement, collapsed: boolean) {
  if (!node.dataset.collapsed) {
    return;
  }

  node.dataset.collapsed = collapsed ? "true" : "false";
  const button = node.querySelector("[data-toc-toggle]");

  if (button instanceof HTMLButtonElement) {
    button.setAttribute("aria-expanded", collapsed ? "false" : "true");
  }
}

function updateActionButtonsState(
  collapsibleNodes: HTMLElement[],
  actionButtons: HTMLButtonElement[],
) {
  const collapsedStates = collapsibleNodes.map(
    (node) => node.dataset.collapsed === "true",
  );
  const allCollapsed =
    collapsedStates.length > 0 && collapsedStates.every(Boolean);
  const allExpanded =
    collapsedStates.length > 0 &&
    collapsedStates.every((collapsed) => !collapsed);

  actionButtons.forEach((button) => {
    const action = button.dataset.tocAction;
    const isDisabled =
      (action === "expand" && allExpanded) ||
      (action === "collapse" && allCollapsed);

    button.disabled = isDisabled;
    button.setAttribute("aria-disabled", isDisabled ? "true" : "false");
  });
}

function initTocInstance(toc: Element) {
  if (!(toc instanceof HTMLElement) || toc.dataset.tocReady === "true") {
    return;
  }

  const scrollRegion = toc.querySelector("[data-toc-scroll]");
  const scrollContainer =
    scrollRegion instanceof HTMLElement ? scrollRegion : toc;
  const mobileDrawer = toc.closest("#mobile-drawer");
  const isInMobileDrawer = mobileDrawer instanceof HTMLElement;
  const article = document.querySelector("article");
  const links = Array.from(
    toc.querySelectorAll<HTMLAnchorElement>("a[data-heading]"),
  );
  const toggleButtons = Array.from(
    toc.querySelectorAll<HTMLButtonElement>("button[data-toc-toggle]"),
  );
  const actionButtons = Array.from(
    toc.querySelectorAll<HTMLButtonElement>("button[data-toc-action]"),
  );
  const collapsibleNodes = Array.from(
    toc.querySelectorAll<HTMLElement>(".toc-node[data-collapsed]"),
  );
  const tocLinks = buildTocLinks(links);

  if (!tocLinks.length || !(article instanceof HTMLElement)) {
    return;
  }

  toc.dataset.tocReady = "true";

  let frameId = 0;
  let mobileDrawerSyncTimeout = 0;
  let mobileDrawerObserver: MutationObserver | null = null;
  const controller = new AbortController();

  const requestUpdate = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;

      const viewportHeight = window.innerHeight;
      const articleTop = article.offsetTop;
      const articleBottom =
        articleTop + (article.offsetHeight ?? document.body.offsetHeight);
      const pageOffset = window.scrollY - articleTop;
      const activeLinks: HTMLAnchorElement[] = [];

      tocLinks.forEach((entry, index) => {
        const isCollapsed = entry.node.dataset.collapsed === "true";
        const sectionEnd = getSectionEnd(
          tocLinks,
          index,
          entry.depth,
          isCollapsed,
          articleBottom,
        );
        const rangeTop = entry.element.offsetTop - pageOffset;
        const rangeBottom =
          sectionEnd - pageOffset - entry.element.offsetHeight;
        const denominator = Math.max(rangeBottom - rangeTop, 1);
        const fillStart = Math.max(
          0,
          Math.min(1, (0 - rangeTop) / denominator),
        );
        const fillEnd = Math.max(
          0,
          Math.min(1, (viewportHeight - rangeTop) / denominator),
        );
        const progress = Math.max(fillEnd - fillStart, 0);
        const inView = rangeTop < viewportHeight && rangeBottom > 0;
        const visible = isLinkVisible(entry.link);

        entry.link.classList.toggle("active", inView && visible);
        entry.link.classList.remove("active-first", "active-last");
        entry.progressBar.style.setProperty(
          "--toc-progress-read-end",
          `${fillStart * 100}%`,
        );
        entry.progressBar.style.setProperty(
          "--toc-progress-active-end",
          `${fillEnd * 100}%`,
        );
        entry.progressBar.classList.toggle(
          "has-progress",
          visible && (fillStart > 0 || progress > 0),
        );

        if (inView && visible) {
          activeLinks.push(entry.link);
        }
      });

      activeLinks.forEach((link, index) => {
        const isFirst = index === 0;
        const isLast = index === activeLinks.length - 1;

        link.classList.toggle("active-first", isFirst);
        link.classList.toggle("active-last", isLast);
      });

      syncActiveLinksIntoView(scrollContainer, activeLinks);
    });
  };

  const handleLinkClick = (event: Event) => {
    const link = event.currentTarget;

    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const slug = link.dataset.heading;
    const target = slug ? document.getElementById(slug) : null;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    event.preventDefault();
    history.pushState(
      null,
      target.textContent || "",
      link.getAttribute("href"),
    );
    const targetTop =
      window.scrollY +
      target.getBoundingClientRect().top -
      getDocumentScrollOffset();

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  };

  const handleToggleClick = (event: Event) => {
    const button = event.currentTarget;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const node = button.closest(".toc-node");

    if (!(node instanceof HTMLElement)) {
      return;
    }

    setNodeCollapsed(node, node.dataset.collapsed !== "true");
    updateActionButtonsState(collapsibleNodes, actionButtons);
    requestUpdate();
  };

  const handleActionClick = (event: Event) => {
    const button = event.currentTarget;

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const action = button.dataset.tocAction;

    if (action !== "expand" && action !== "collapse") {
      return;
    }

    const shouldCollapse = action === "collapse";
    collapsibleNodes.forEach((node) => {
      setNodeCollapsed(node, shouldCollapse);
    });
    updateActionButtonsState(collapsibleNodes, actionButtons);
    requestUpdate();
  };

  const scheduleMobileDrawerSync = () => {
    if (!isInMobileDrawer || !(mobileDrawer instanceof HTMLElement)) {
      return;
    }

    if (mobileDrawerSyncTimeout) {
      window.clearTimeout(mobileDrawerSyncTimeout);
      mobileDrawerSyncTimeout = 0;
    }

    if (mobileDrawer.getAttribute("aria-hidden") !== "false") {
      return;
    }

    requestUpdate();
    mobileDrawerSyncTimeout = window.setTimeout(() => {
      mobileDrawerSyncTimeout = 0;
      requestUpdate();
    }, MOBILE_DRAWER_SYNC_DELAY_MS);
  };

  const handleMobileDrawerTransitionEnd = (event: TransitionEvent) => {
    if (
      !(mobileDrawer instanceof HTMLElement) ||
      event.target !== mobileDrawer ||
      event.propertyName !== "transform"
    ) {
      return;
    }

    scheduleMobileDrawerSync();
  };

  links.forEach((link) => {
    link.addEventListener("click", handleLinkClick, {
      signal: controller.signal,
    });
  });
  toggleButtons.forEach((button) => {
    button.addEventListener("click", handleToggleClick, {
      signal: controller.signal,
    });
  });
  actionButtons.forEach((button) => {
    button.addEventListener("click", handleActionClick, {
      signal: controller.signal,
    });
  });

  updateActionButtonsState(collapsibleNodes, actionButtons);
  requestUpdate();
  window.addEventListener("scroll", requestUpdate, {
    passive: true,
    signal: controller.signal,
  });
  window.addEventListener("resize", requestUpdate, {
    passive: true,
    signal: controller.signal,
  });
  window.addEventListener("hashchange", requestUpdate, {
    signal: controller.signal,
  });

  if (mobileDrawer instanceof HTMLElement) {
    mobileDrawerObserver = new MutationObserver(scheduleMobileDrawerSync);
    mobileDrawerObserver.observe(mobileDrawer, {
      attributes: true,
      attributeFilter: ["aria-hidden", "class"],
    });
    mobileDrawer.addEventListener(
      "transitionend",
      handleMobileDrawerTransitionEnd,
      { signal: controller.signal },
    );
  }

  const cleanup = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    if (mobileDrawerSyncTimeout) {
      window.clearTimeout(mobileDrawerSyncTimeout);
      mobileDrawerSyncTimeout = 0;
    }

    mobileDrawerObserver?.disconnect();
    mobileDrawerObserver = null;
    controller.abort();
    toc.dataset.tocReady = "false";
  };

  window.addEventListener("pagehide", cleanup, {
    once: true,
    signal: controller.signal,
  });
  document.addEventListener("astro:before-swap", cleanup, {
    once: true,
    signal: controller.signal,
  });
}

function start() {
  document.querySelectorAll("[data-toc-root]").forEach((toc) => {
    initTocInstance(toc);
  });
}

runOnPageLoad("ui:table-of-contents", start);
