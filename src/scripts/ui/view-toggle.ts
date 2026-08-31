const DEFAULT_VIEW = "card";
const STORAGE_KEY = "vellume:view-preferences";

function getViewKey(root: HTMLElement) {
  return root.dataset.viewKey || "";
}

function readStoredView(root: HTMLElement): string | null {
  const key = getViewKey(root);

  if (!key) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }

    const view = (parsed as Record<string, unknown>)[key];

    if (typeof view !== "string") {
      return null;
    }

    // Only restore a view this root actually offers a button for.
    const isOffered = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-view-btn]"),
    ).some((button) => button.dataset.viewBtn === view);

    return isOffered ? view : null;
  } catch {
    return null;
  }
}

function writeStoredView(root: HTMLElement, view: string) {
  const key = getViewKey(root);

  if (!key) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    const prefs =
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};

    prefs[key] = view;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Preferences are best-effort; storage may be unavailable.
  }
}

function updateView(root: HTMLElement, view: string) {
  root.dataset.view = view;

  const target = root.querySelector<HTMLElement>("[data-view-target]");

  if (target) {
    target.dataset.viewTarget = view;
  }

  root.querySelectorAll<HTMLElement>("[data-view-item]").forEach((item) => {
    item.dataset.viewItem = view;
  });

  root.querySelectorAll<HTMLElement>("[data-view-btn]").forEach((button) => {
    const isActive = button.dataset.viewBtn === view;

    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export function initViewToggles() {
  document.querySelectorAll<HTMLElement>("[data-view-root]").forEach((root) => {
    const storedView = readStoredView(root);
    const initialView = storedView ?? (root.dataset.view || DEFAULT_VIEW);

    if (root.dataset.viewReady === "true") {
      updateView(root, initialView);
      return;
    }

    root.dataset.viewReady = "true";
    updateView(root, initialView);

    // One delegated listener per root instead of one per button.
    root.addEventListener("click", (event) => {
      const button = (event.target as Element | null)?.closest?.(
        "[data-view-btn]",
      ) as HTMLButtonElement | null;

      if (!button || !root.contains(button)) {
        return;
      }

      const view = button.dataset.viewBtn || DEFAULT_VIEW;

      updateView(root, view);
      writeStoredView(root, view);
    });
  });
}
