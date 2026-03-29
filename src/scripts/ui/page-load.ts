export function runOnPageLoad(callback: () => void) {
  document.addEventListener("astro:page-load", () => callback());
}
