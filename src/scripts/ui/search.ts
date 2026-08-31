import { withBasePath } from "../../utils/paths";
import { getFocusableElements } from "./focus";

interface PagefindResultData {
  url: string;
  meta?: Record<string, string>;
  excerpt?: string;
}

interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

interface PagefindSearch {
  results: PagefindResult[];
}

interface PagefindAPI {
  init: () => Promise<void>;
  search: (query: string) => Promise<PagefindSearch>;
}

let currentController: AbortController | null = null;

export function initSearch() {
  currentController?.abort();

  const modal = document.getElementById("search-modal");
  if (!(modal instanceof HTMLElement)) {
    currentController = null;
    return;
  }
  const modalEl = modal;

  const input = modalEl.querySelector<HTMLInputElement>("input");
  const resultsEl = modalEl.querySelector<HTMLElement>("[data-search-results]");
  const dialogEl = modalEl.querySelector<HTMLElement>(".search-dialog");
  const closeTriggers = modalEl.querySelectorAll<HTMLElement>(
    "[data-search-close]",
  );
  const controller = new AbortController();
  currentController = controller;
  let previousFocusedElement: HTMLElement | null = null;
  let previousBodyOverflow = "";
  let searchRequestId = 0;

  let pf: PagefindAPI | null = null;

  async function loadPagefind(): Promise<PagefindAPI | null> {
    if (pf) return pf;
    try {
      // Pagefind is generated into `dist/pagefind` at build time, so Vite
      // should not try to pre-bundle or statically analyze this runtime import.
      const pagefindPath = withBasePath("/pagefind/pagefind.js");
      const mod = await import(/* @vite-ignore */ pagefindPath);
      pf = mod as unknown as PagefindAPI;
      await pf.init();
      return pf;
    } catch {
      return null;
    }
  }

  function open() {
    previousFocusedElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    previousBodyOverflow = document.body.style.overflow;
    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => input?.focus(), 50);
  }

  function close({ restoreFocus = true } = {}) {
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    if (input) input.value = "";
    resetResults();
    if (restoreFocus) {
      (previousFocusedElement?.isConnected
        ? previousFocusedElement
        : document.querySelector<HTMLElement>("[data-search-open]")
      )?.focus({ preventScroll: true });
    }
  }

  function isOpen() {
    return modalEl.classList.contains("is-open");
  }

  function resetResults() {
    if (!resultsEl) return;
    resultsEl.textContent = "";
    const hint = document.createElement("p");
    hint.className = "search-hint";
    hint.textContent = "输入标题、标签或正文关键词";
    resultsEl.appendChild(hint);
  }

  async function renderResults(
    search: PagefindSearch,
    requestId: number,
    expectedQuery: string,
  ) {
    if (!resultsEl || !search) return;
    resultsEl.textContent = "";

    if (search.results.length === 0) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "未找到相关内容";
      resultsEl.appendChild(empty);
      return;
    }

    // Show a plain status line (not placeholder links) while result data loads.
    // The results container is already aria-live="polite"; no nested live region.
    const loading = document.createElement("p");
    loading.className = "search-hint";
    loading.textContent = "正在加载结果…";
    resultsEl.appendChild(loading);

    const items = search.results.slice(0, 8);
    const dataArr = await Promise.all(items.map((r) => r.data()));

    if (
      requestId !== searchRequestId ||
      input?.value.trim() !== expectedQuery
    ) {
      return;
    }

    const fragment = document.createDocumentFragment();

    for (const data of dataArr) {
      const a = document.createElement("a");
      a.href = data.url;
      a.className = "search-result-item";
      const titleDiv = document.createElement("div");
      titleDiv.className = "search-result-title";
      titleDiv.textContent = data.meta?.title ?? data.url;
      a.appendChild(titleDiv);
      if (data.excerpt) {
        const excerptDiv = document.createElement("div");
        excerptDiv.className = "search-result-excerpt";
        // Pagefind builds excerpts from our own build-time index; treat that
        // as trusted HTML (it contains <mark> highlights).
        excerptDiv.innerHTML = data.excerpt;
        a.appendChild(excerptDiv);
      }
      fragment.appendChild(a);
    }

    resultsEl.textContent = "";
    resultsEl.appendChild(fragment);
  }

  let debounceTimer: ReturnType<typeof setTimeout>;
  async function onInput() {
    const query = input?.value.trim();
    if (!query) {
      searchRequestId += 1;
      resetResults();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const requestId = ++searchRequestId;
      const expectedQuery = query;
      const instance = await loadPagefind();
      if (
        requestId !== searchRequestId ||
        input?.value.trim() !== expectedQuery
      ) {
        return;
      }
      if (!instance) {
        if (resultsEl) {
          resultsEl.textContent = "";
          const msg = document.createElement("p");
          msg.className = "search-empty";
          msg.textContent = "搜索不可用";
          resultsEl.appendChild(msg);
        }
        return;
      }
      const results = await instance.search(expectedQuery);
      if (
        requestId !== searchRequestId ||
        input?.value.trim() !== expectedQuery
      ) {
        return;
      }
      renderResults(results, requestId, expectedQuery);
    }, 200);
  }

  input?.addEventListener("input", onInput, { signal: controller.signal });

  closeTriggers.forEach((el) => {
    el.addEventListener("click", () => close(), { signal: controller.signal });
  });

  resultsEl?.addEventListener(
    "click",
    (event) => {
      if (event.target instanceof Element && event.target.closest("a[href]")) {
        close({ restoreFocus: false });
      }
    },
    { signal: controller.signal },
  );

  document
    .querySelectorAll<HTMLElement>("[data-search-open]")
    .forEach((btn) => {
      btn.addEventListener("click", open, { signal: controller.signal });
    });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!isOpen()) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      if (event.key !== "Tab" || !dialogEl) {
        return;
      }

      const focusableElements = getFocusableElements(dialogEl);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogEl.focus({ preventScroll: true });
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];
      const activeElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (event.shiftKey && activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus({ preventScroll: true });
        return;
      }

      if (!event.shiftKey && activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus({ preventScroll: true });
      }
    },
    { signal: controller.signal },
  );

  document.addEventListener(
    "astro:before-swap",
    () => {
      clearTimeout(debounceTimer);
      close({ restoreFocus: false });
      controller.abort();
      if (currentController === controller) {
        currentController = null;
      }
    },
    { once: true, signal: controller.signal },
  );
}
