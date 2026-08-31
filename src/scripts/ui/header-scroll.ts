/* Reveals the header hairline once the page scrolls past a few pixels, so
 * the resting top-of-page view stays seamless and the divider only appears
 * when content actually passes under it (Notion/Outline behavior). */

const SCROLL_THRESHOLD_PX = 8;

let cleanupController: AbortController | undefined;

export function initHeaderScroll() {
  cleanupController?.abort();
  cleanupController = new AbortController();
  const { signal } = cleanupController;

  const header = document.querySelector<HTMLElement>("[data-site-header]");

  if (!header) {
    return;
  }

  const update = () => {
    if (window.scrollY > SCROLL_THRESHOLD_PX) {
      header.setAttribute("data-scrolled", "true");
    } else {
      header.removeAttribute("data-scrolled");
    }
  };

  // Run once so restored scroll positions (back/forward navigation) get the
  // correct state before any scroll event fires.
  update();
  window.addEventListener("scroll", update, { passive: true, signal });
}
