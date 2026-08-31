export function getFocusableElements(container: ParentNode) {
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

/**
 * Keep Tab focus cycling inside `container`. Call from a document-level
 * keydown handler; keys other than Tab are ignored.
 */
export function trapTabKey(event: KeyboardEvent, container: HTMLElement) {
  if (event.key !== "Tab") {
    return;
  }

  const focusableElements = getFocusableElements(container);

  if (focusableElements.length === 0) {
    event.preventDefault();
    container.focus({ preventScroll: true });
    return;
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];
  const activeElement = captureFocusedElement();

  if (event.shiftKey && activeElement === firstFocusable) {
    event.preventDefault();
    lastFocusable.focus({ preventScroll: true });
    return;
  }

  if (!event.shiftKey && activeElement === lastFocusable) {
    event.preventDefault();
    firstFocusable.focus({ preventScroll: true });
  }
}

export function captureFocusedElement() {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

/** Focus `previous`, falling back to `fallback` when it is no longer attached. */
export function restoreFocusedElement(
  previous: HTMLElement | null,
  fallback?: HTMLElement | null,
) {
  (previous?.isConnected ? previous : fallback)?.focus({
    preventScroll: true,
  });
}
