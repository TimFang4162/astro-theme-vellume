import { withBasePath } from "../../utils/paths";
import {
  captureFocusedElement,
  restoreFocusedElement,
  trapTabKey,
} from "./focus";

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

const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_RESULT_LIMIT = 8;
const FOCUS_AFTER_OPEN_MS = 50;

let currentController: AbortController | null = null;

export function initSearch() {
  currentController?.abort();

  const modal = document.getElementById("search-modal");
  if (!(modal instanceof HTMLElement)) {
    currentController = null;
    return;
  }

  const input = modal.querySelector<HTMLInputElement>("input");
  const resultsEl = modal.querySelector<HTMLElement>("[data-search-results]");
  const dialogEl = modal.querySelector<HTMLElement>(".search-dialog");
  const closeTriggers = modal.querySelectorAll<HTMLElement>(
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

  // Arrow consts (not hoisted function declarations) so the HTMLElement
  // narrowing on `modal` above flows into these closures.
  const open = () => {
    previousFocusedElement = captureFocusedElement();
    previousBodyOverflow = document.body.style.overflow;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => input?.focus(), FOCUS_AFTER_OPEN_MS);
  };

  const close = ({ restoreFocus = true } = {}) => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    if (input) input.value = "";
    resetResults();
    if (restoreFocus) {
      restoreFocusedElement(
        previousFocusedElement,
        document.querySelector<HTMLElement>("[data-search-open]"),
      );
    }
  };

  const isOpen = () => modal.classList.contains("is-open");

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
      // Static markup; the build-time index never injects into it.
      const empty = document.createElement("div");
      empty.className = "search-empty";
      empty.innerHTML = [
        '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="currentColor">',
        '<path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>',
        "</svg>",
        '<p class="search-empty-title">未找到相关内容</p>',
        '<p class="search-empty-hint">试试更短的关键词，或换个说法</p>',
      ].join("");
      resultsEl.appendChild(empty);
      return;
    }

    // Show a plain status line (not placeholder links) while result data loads.
    // The results container is already aria-live="polite"; no nested live region.
    const loading = document.createElement("p");
    loading.className = "search-hint";
    loading.textContent = "正在加载结果…";
    resultsEl.appendChild(loading);

    const items = search.results.slice(0, SEARCH_RESULT_LIMIT);
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
    }, SEARCH_DEBOUNCE_MS);
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

      if (dialogEl) {
        trapTabKey(event, dialogEl);
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
