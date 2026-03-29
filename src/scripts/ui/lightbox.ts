import mediumZoom from "medium-zoom/dist/pure";
import "medium-zoom/dist/style.css";

let instance: ReturnType<typeof mediumZoom> | null = null;

function cleanup() {
  instance?.detach();
  instance = null;
}

export function initLightbox() {
  cleanup();
  instance = mediumZoom(".rich-prose img", {
    background: "rgba(0, 0, 0, 0.75)",
    margin: 24,
  });
}

document.addEventListener("astro:before-swap", cleanup);
