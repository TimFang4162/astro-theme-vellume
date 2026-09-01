import { runOnPageLoad } from "./page-load";

const STYLE_ATTR = "data-print-style";
const PREVIEW_ATTR = "data-print-preview";
const PANEL_ID = "print-preview-panel";
/** Attributes the panel manages; snapshotted on enter, restored on exit. */
const MANAGED_ATTRS = [
  "data-print",
  "data-print-links",
  "data-print-images",
  "data-print-break",
];

let snapshot: Array<[string, string | null]> | null = null;

function panel(): HTMLElement | null {
  return document.getElementById(PANEL_ID);
}

/**
 * Enter the print preview session: hold the page in print styling
 * ([data-print-style]), show the config panel, and snapshot the managed
 * attributes so exiting restores exactly what the owner configured.
 */
export function enterPrintPreview() {
  const root = document.documentElement;
  if (root.hasAttribute(PREVIEW_ATTR)) return;

  snapshot = MANAGED_ATTRS.map((attr) => [attr, root.getAttribute(attr)]);
  root.setAttribute(STYLE_ATTR, "");
  root.setAttribute(PREVIEW_ATTR, "");

  const panelEl = panel();
  if (panelEl) {
    syncControls(panelEl);
    panelEl.hidden = false;
  }
  document.addEventListener("keydown", onKeydown);
}

function exitPreview() {
  const root = document.documentElement;
  if (snapshot) {
    for (const [attr, value] of snapshot) {
      if (value === null) root.removeAttribute(attr);
      else root.setAttribute(attr, value);
    }
    snapshot = null;
  }
  root.removeAttribute(PREVIEW_ATTR);
  root.removeAttribute(STYLE_ATTR);
  const p = panel();
  if (p) p.hidden = true;
  document.removeEventListener("keydown", onKeydown);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    exitPreview();
  }
}

function syncControls(current: HTMLElement) {
  const root = document.documentElement;
  const style = root.getAttribute("data-print") ?? "default";
  for (const radio of current.querySelectorAll<HTMLInputElement>(
    'input[name="pp-style"]',
  )) {
    radio.checked = radio.value === style;
  }
  const links = root.getAttribute("data-print-links") ?? "footnote";
  for (const radio of current.querySelectorAll<HTMLInputElement>(
    'input[name="pp-links"]',
  )) {
    radio.checked = radio.value === links;
  }
  const images = current.querySelector<HTMLInputElement>(
    'input[name="pp-images"]',
  );
  if (images)
    images.checked = root.getAttribute("data-print-images") !== "none";
  const chapterBreak = current.querySelector<HTMLInputElement>(
    'input[name="pp-break"]',
  );
  if (chapterBreak) {
    chapterBreak.checked = root.getAttribute("data-print-break") === "chapter";
  }
}

function bindPanel(panel: HTMLElement) {
  panel.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement;
    const root = document.documentElement;
    switch (input.name) {
      case "pp-style":
        if (input.value === "default") root.removeAttribute("data-print");
        else root.setAttribute("data-print", input.value);
        break;
      case "pp-links":
        if (input.value === "footnote")
          root.removeAttribute("data-print-links");
        else root.setAttribute("data-print-links", input.value);
        break;
      case "pp-images":
        if (input.checked) root.removeAttribute("data-print-images");
        else root.setAttribute("data-print-images", "none");
        break;
      case "pp-break":
        if (input.checked) root.setAttribute("data-print-break", "chapter");
        else root.removeAttribute("data-print-break");
        break;
    }
  });

  panel.querySelector("[data-pp-print]")?.addEventListener("click", () => {
    // The preview session stays open: afterprint keeps the print styling so
    // the panel can be adjusted and printed again.
    window.print();
  });

  panel.querySelector("[data-pp-exit]")?.addEventListener("click", () => {
    exitPreview();
  });
}

function initPrintPreview() {
  const p = panel();
  if (p) bindPanel(p);
}

runOnPageLoad("ui:print-preview", initPrintPreview);
