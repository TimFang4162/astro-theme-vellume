function setMenuState(
  menuButton: HTMLButtonElement,
  menuIcon: Element | null,
  closeIcon: Element | null,
  mobileDrawer: HTMLElement,
  overlay: HTMLElement,
  pageShell: HTMLElement[],
  isOpen: boolean,
) {
  menuIcon?.classList.toggle("hidden", isOpen);
  closeIcon?.classList.toggle("hidden", !isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  mobileDrawer.setAttribute("aria-hidden", String(!isOpen));

  mobileDrawer.classList.toggle("translate-x-full", !isOpen);
  mobileDrawer.classList.toggle("pointer-events-none", !isOpen);
  overlay.classList.toggle("opacity-0", !isOpen);
  overlay.classList.toggle("pointer-events-none", !isOpen);
  document.body.classList.toggle("overflow-hidden", isOpen);
  pageShell.forEach((element) => {
    element.toggleAttribute("inert", isOpen);
    element.setAttribute("aria-hidden", isOpen ? "true" : "false");
  });
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
      ].join(","),
    ),
  ).filter((element) => element.getClientRects().length > 0);
}

export function initMobileMenu(root: ParentNode = document) {
  const menuButton = root.querySelector<HTMLButtonElement>(
    "#mobile-menu-button",
  );
  const mobileDrawer = root.querySelector<HTMLElement>("#mobile-drawer");
  const overlay = root.querySelector<HTMLElement>("#mobile-drawer-overlay");

  if (!menuButton || !mobileDrawer || !overlay) {
    return;
  }

  if (menuButton.dataset.menuReady === "true") {
    return;
  }

  menuButton.dataset.menuReady = "true";

  const controller = new AbortController();
  const menuIcon = menuButton.querySelector(".menu-icon");
  const closeIcon = menuButton.querySelector(".close-icon");
  const desktopMedia = window.matchMedia("(min-width: 1024px)");
  const pageShell = [
    document.querySelector<HTMLElement>("header"),
    document.querySelector<HTMLElement>("main"),
    document.querySelector<HTMLElement>("footer"),
  ].filter((element): element is HTMLElement => element instanceof HTMLElement);
  let isMenuOpen = false;
  let previousFocusedElement: HTMLElement | null = null;

  const cleanup = () => {
    document.body.classList.remove("overflow-hidden");
    pageShell.forEach((element) => {
      element.removeAttribute("inert");
      element.removeAttribute("aria-hidden");
    });
    desktopMedia.removeEventListener("change", handleDesktopChange);
    controller.abort();
  };

  const closeMenu = () => {
    if (!isMenuOpen) {
      return;
    }

    isMenuOpen = false;
    setMenuState(
      menuButton,
      menuIcon,
      closeIcon,
      mobileDrawer,
      overlay,
      pageShell,
      false,
    );
    (previousFocusedElement?.isConnected
      ? previousFocusedElement
      : menuButton
    ).focus({ preventScroll: true });
  };

  const openMenu = () => {
    if (isMenuOpen) {
      return;
    }

    previousFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    isMenuOpen = true;
    setMenuState(
      menuButton,
      menuIcon,
      closeIcon,
      mobileDrawer,
      overlay,
      pageShell,
      true,
    );
    const [firstFocusable] = getFocusableElements(mobileDrawer);
    (firstFocusable ?? mobileDrawer).focus({ preventScroll: true });
  };

  menuButton.addEventListener(
    "click",
    (event) => {
      event.stopPropagation();
      if (isMenuOpen) {
        closeMenu();
        return;
      }

      openMenu();
    },
    { signal: controller.signal },
  );

  overlay.addEventListener("click", closeMenu, {
    signal: controller.signal,
  });

  mobileDrawer
    .querySelectorAll("a, button[data-mobile-drawer-close]")
    .forEach((link) => {
      if (link === menuButton) {
        return;
      }

      link.addEventListener("click", closeMenu, {
        signal: controller.signal,
      });
    });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isMenuOpen) {
        return;
      }

      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(mobileDrawer);

      if (focusableElements.length === 0) {
        event.preventDefault();
        mobileDrawer.focus({ preventScroll: true });
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    },
    { signal: controller.signal },
  );

  const handleDesktopChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      closeMenu();
    }
  };

  desktopMedia.addEventListener("change", handleDesktopChange);

  window.addEventListener("pagehide", cleanup, {
    once: true,
    signal: controller.signal,
  });

  document.addEventListener("astro:before-swap", cleanup, {
    once: true,
    signal: controller.signal,
  });
}
