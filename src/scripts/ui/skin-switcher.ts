import { runOnPageLoad } from "./page-load";

const STORAGE_KEY = "vellume-skin";
const TRANSITION_SUPPRESS_MS = 600;

/**
 * Skin switcher: the menu is delegated end-to-end (document-level click and
 * Escape handling), so instances — header and mobile drawer — need no
 * per-page binding and nothing leaks across ClientRouter swaps. Selection
 * state is read from the `data-skin` root attribute on every page load.
 */

function containers(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>("[data-skin-switcher]"),
  );
}

function isOpen(container: HTMLElement): boolean {
  return (
    container
      .querySelector<HTMLElement>("[data-skin-switcher-menu]")
      ?.classList.contains("hidden") === false
  );
}

function setOpen(container: HTMLElement, open: boolean) {
  const menu = container.querySelector<HTMLElement>(
    "[data-skin-switcher-menu]",
  );
  const toggle = container.querySelector<HTMLElement>(
    "[data-skin-switcher-toggle]",
  );
  if (!menu || !toggle || isOpen(container) === open) return;

  menu.classList.toggle("hidden", !open);
  toggle.setAttribute("aria-expanded", String(open));

  if (open) {
    container.querySelector<HTMLElement>("[aria-checked='true']")?.focus();
  } else {
    toggle.focus({ preventScroll: true });
  }
}

function closeAll() {
  for (const container of containers()) {
    setOpen(container, false);
  }
}

function applySkin(name: string) {
  const root = document.documentElement;
  if (root.dataset.skin === name) return;

  root.classList.add("no-transition");
  window.setTimeout(
    () => root.classList.remove("no-transition"),
    TRANSITION_SUPPRESS_MS,
  );
  root.dataset.skin = name;
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Private-mode storage failures leave the choice session-only.
  }
  syncSelection();
}

/** Mirror the active skin onto every mounted menu's check state. */
function syncSelection() {
  const current = document.documentElement.dataset.skin ?? "default";
  for (const option of document.querySelectorAll<HTMLElement>(
    "[data-skin-option]",
  )) {
    const active = option.dataset.skinOption === current;
    option.setAttribute("aria-checked", String(active));
    for (const icon of option.querySelectorAll<HTMLElement>(
      "[data-skin-check]",
    )) {
      icon.classList.toggle("hidden", !active);
    }
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return;

  const option = event.target.closest<HTMLElement>("[data-skin-option]");
  if (option) {
    applySkin(option.dataset.skinOption ?? "default");
    closeAll();
    return;
  }

  const toggle = event.target.closest<HTMLElement>(
    "[data-skin-switcher-toggle]",
  );
  if (toggle) {
    const container = toggle.closest<HTMLElement>("[data-skin-switcher]");
    if (container) setOpen(container, !isOpen(container));
    return;
  }

  if (!event.target.closest("[data-skin-switcher]")) {
    closeAll();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") closeAll();
}

function initSkinSwitcher() {
  syncSelection();
  // Close any menu left open when the toggle buttons are reached via
  // keyboard before any click has happened.
  for (const container of containers()) {
    setOpen(container, false);
  }
}

document.addEventListener("click", onDocumentClick);
document.addEventListener("keydown", onKeydown);

runOnPageLoad("ui:skin-switcher", initSkinSwitcher);
