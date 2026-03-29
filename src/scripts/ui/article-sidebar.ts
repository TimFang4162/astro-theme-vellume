import { runOnPageLoad } from "./page-load";

const DESKTOP_BREAKPOINT_PX = 1024;
const SMALL_PANEL_MAX_VH_RATIO = 0.5;

function getPixelValue(value: string): number {
  const pixelValue = Number.parseFloat(value);
  return Number.isFinite(pixelValue) ? pixelValue : 0;
}

interface MeasuredPanel {
  panel: HTMLElement;
  chromeHeight: number;
  naturalHeight: number;
}

function measurePanel(panel: HTMLElement): MeasuredPanel | null {
  const body = panel.querySelector<HTMLElement>("[data-sidebar-panel-body]");

  if (!body) {
    return null;
  }

  const panelHeight = panel.getBoundingClientRect().height;
  const bodyHeight = body.getBoundingClientRect().height;
  const chromeHeight = Math.max(panelHeight - bodyHeight, 0);
  const naturalHeight = Math.max(chromeHeight + body.scrollHeight, 0);

  return { panel, chromeHeight, naturalHeight };
}

function setPanelHeight(panel: HTMLElement, height: number): void {
  const nextHeight = `${Math.max(height, 0)}px`;
  panel.style.height = nextHeight;
  panel.style.maxHeight = nextHeight;
}

function applySidebarLayout(sidebar: HTMLElement): void {
  const panels = Array.from(
    sidebar.querySelectorAll<HTMLElement>("[data-sidebar-panel]"),
  );

  if (!panels.length) {
    return;
  }

  if (
    window.innerWidth < DESKTOP_BREAKPOINT_PX ||
    window.getComputedStyle(sidebar).display === "none"
  ) {
    for (const panel of panels) {
      panel.style.removeProperty("height");
      panel.style.removeProperty("max-height");
    }
    return;
  }

  const measuredPanels = panels
    .map((panel) => measurePanel(panel))
    .filter((panel): panel is MeasuredPanel => panel !== null);

  if (!measuredPanels.length) {
    return;
  }

  const sidebarStyle = window.getComputedStyle(sidebar);
  const availableHeight =
    getPixelValue(sidebarStyle.maxHeight) ||
    sidebar.getBoundingClientRect().height;
  const gap = getPixelValue(sidebarStyle.rowGap || sidebarStyle.gap);

  if (availableHeight <= 0) {
    return;
  }

  if (measuredPanels.length === 1) {
    const panel = measuredPanels[0];
    setPanelHeight(panel.panel, Math.min(panel.naturalHeight, availableHeight));
    return;
  }

  const totalNaturalHeight =
    measuredPanels.reduce((total, panel) => total + panel.naturalHeight, 0) +
    gap * (measuredPanels.length - 1);

  if (totalNaturalHeight <= availableHeight) {
    for (const panel of measuredPanels) {
      setPanelHeight(panel.panel, panel.naturalHeight);
    }
    return;
  }

  const smallPanelThreshold = window.innerHeight * SMALL_PANEL_MAX_VH_RATIO;
  const preferredPanels = [...measuredPanels]
    .filter((panel) => panel.naturalHeight <= smallPanelThreshold)
    .sort((left, right) => left.naturalHeight - right.naturalHeight);

  for (const preferredPanel of preferredPanels) {
    const otherPanel = measuredPanels.find(
      (panel) => panel.panel !== preferredPanel.panel,
    );

    if (!otherPanel) {
      continue;
    }

    const remainingHeight =
      availableHeight - gap - preferredPanel.naturalHeight;

    if (remainingHeight < otherPanel.chromeHeight) {
      continue;
    }

    setPanelHeight(preferredPanel.panel, preferredPanel.naturalHeight);
    setPanelHeight(
      otherPanel.panel,
      Math.min(otherPanel.naturalHeight, remainingHeight),
    );
    return;
  }

  const sharedHeight = Math.max(
    (availableHeight - gap * (measuredPanels.length - 1)) /
      measuredPanels.length,
    0,
  );

  for (const panel of measuredPanels) {
    setPanelHeight(panel.panel, Math.max(sharedHeight, panel.chromeHeight));
  }
}

function initArticleSidebar(sidebar: Element): void {
  if (
    !(sidebar instanceof HTMLElement) ||
    sidebar.dataset.articleSidebarReady === "true"
  ) {
    return;
  }

  sidebar.dataset.articleSidebarReady = "true";

  let frameId = 0;
  const controller = new AbortController();

  const requestLayout = () => {
    if (frameId) {
      return;
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = 0;
      applySidebarLayout(sidebar);
    });
  };

  const mutationObserver = new MutationObserver(requestLayout);
  mutationObserver.observe(sidebar, {
    subtree: true,
    attributes: true,
    attributeFilter: ["data-collapsed"],
  });

  const resizeObserver = new ResizeObserver(requestLayout);
  resizeObserver.observe(sidebar);
  sidebar
    .querySelectorAll<HTMLElement>(
      "[data-sidebar-panel], [data-sidebar-panel-body]",
    )
    .forEach((element) => {
      resizeObserver.observe(element);
    });

  requestLayout();
  window.addEventListener("resize", requestLayout, {
    passive: true,
    signal: controller.signal,
  });

  const cleanup = () => {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    mutationObserver.disconnect();
    resizeObserver.disconnect();
    controller.abort();
    sidebar.dataset.articleSidebarReady = "false";
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

function start(): void {
  document.querySelectorAll("[data-article-sidebar]").forEach((sidebar) => {
    initArticleSidebar(sidebar);
  });
}

runOnPageLoad(start);
