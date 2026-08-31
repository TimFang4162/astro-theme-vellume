/* Injects hover-revealed permalink anchors into prose headings, on top of
 * the build-time ids from src/markdown/rehype-heading-ids.ts. Presentation
 * lives in utilities.css (.heading-anchor); clicking relies on native
 * hash navigation, which also triggers the :target flash. */

export function initHeadingAnchors() {
  const headings = document.querySelectorAll<HTMLElement>(
    ".rich-prose :is(h1, h2, h3, h4, h5, h6)[id]",
  );

  for (const heading of headings) {
    if (heading.querySelector(":scope > .heading-anchor")) {
      continue;
    }

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${heading.id}`;
    anchor.setAttribute("aria-label", "链接到该标题");
    anchor.textContent = "#";
    heading.prepend(anchor);
  }
}
