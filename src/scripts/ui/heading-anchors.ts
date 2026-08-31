/* Injects hover-revealed permalink anchors into prose headings, on top of
 * the build-time ids from src/markdown/rehype-heading-ids.ts. Presentation
 * lives in utilities.css (.heading-anchor); clicking relies on native
 * hash navigation, which also triggers the :target flash. */

const LINK_ICON_PATH =
  "M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z";

export function initHeadingAnchors() {
  const headings = document.querySelectorAll<HTMLElement>(
    ".rich-prose :is(h2, h3, h4, h5, h6)[id]",
  );

  for (const heading of headings) {
    if (heading.querySelector(":scope > .heading-anchor")) {
      continue;
    }

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${heading.id}`;
    anchor.setAttribute("aria-label", "链接到该标题");
    anchor.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor"><path d="${LINK_ICON_PATH}"/></svg>`;
    heading.prepend(anchor);
  }
}
