import { captureFocusedElement, restoreFocusedElement } from "./focus";
import { runOnPageLoad } from "./page-load";
import { enterPrintPreview } from "./print-preview";

const FEEDBACK_MS = 1400;

/** Swap a menu item's label for short feedback, then restore it. */
function flashLabel(button: HTMLButtonElement, text: string) {
  const label = button.querySelector<HTMLElement>("[data-label]");
  if (!label) return;
  const original = label.textContent;
  label.textContent = text;
  window.setTimeout(() => {
    label.textContent = original;
  }, FEEDBACK_MS);
}

async function copyText(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

async function copyLink(button: HTMLButtonElement) {
  const url = button.dataset.url ?? location.href;
  const copied = await copyText(url);
  flashLabel(button, copied ? "已复制" : "复制失败");
}

async function share(button: HTMLButtonElement) {
  const url = button.dataset.url ?? location.href;
  const shareTitle = button.dataset.title ?? document.title;
  // System share sheet where available; the link is the fallback everywhere
  // else (desktop browsers without navigator.share).
  if (navigator.share) {
    try {
      await navigator.share({ title: shareTitle, url });
      return;
    } catch (error) {
      if ((error as DOMException)?.name === "AbortError") return;
    }
  }
  const copied = await copyText(url);
  flashLabel(button, copied ? "已复制链接" : "复制失败");
}

function setupMenu(root: HTMLElement) {
  const toggle = root.querySelector<HTMLButtonElement>(
    "[data-article-actions-toggle]",
  );
  const menu = root.querySelector<HTMLElement>("[data-article-actions-menu]");
  if (!toggle || !menu) return;

  let open = false;
  let lastFocused: HTMLElement | null = null;

  const setOpen = (next: boolean) => {
    if (open === next) return;
    open = next;
    menu.classList.toggle("hidden", !next);
    toggle.setAttribute("aria-expanded", String(next));
    if (next) {
      lastFocused = captureFocusedElement();
      menu.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
      document.addEventListener("click", onDocumentClick);
      document.addEventListener("keydown", onKeydown);
    } else {
      document.removeEventListener("click", onDocumentClick);
      document.removeEventListener("keydown", onKeydown);
      restoreFocusedElement(lastFocused, toggle);
    }
  };

  function onDocumentClick(event: MouseEvent) {
    if (open && event.target instanceof Node && !root.contains(event.target)) {
      setOpen(false);
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));

  for (const button of menu.querySelectorAll<HTMLButtonElement>(
    "[data-action]",
  )) {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "print") {
        setOpen(false);
        // Open the print preview session instead of printing straight away:
        // the page switches to print styling and the config panel appears.
        enterPrintPreview();
        return;
      }
      const pending = action === "share" ? share(button) : copyLink(button);
      // Keep the menu open until the promise settles so feedback is
      // visible, then dismiss it like a completed menu action.
      pending.finally(() =>
        window.setTimeout(() => setOpen(false), FEEDBACK_MS),
      );
    });
  }
}

function initArticleActions() {
  for (const root of document.querySelectorAll<HTMLElement>(
    "[data-article-actions]",
  )) {
    setupMenu(root);
  }
}

runOnPageLoad("ui:article-actions", initArticleActions);
