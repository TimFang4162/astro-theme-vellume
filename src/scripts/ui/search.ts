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
  const closeTriggers = modalEl.querySelectorAll<HTMLElement>(
    "[data-search-close]",
  );
  const controller = new AbortController();
  currentController = controller;

  let pf: PagefindAPI | null = null;

  async function loadPagefind(): Promise<PagefindAPI | null> {
    if (pf) return pf;
    try {
      // Pagefind is generated into `dist/pagefind` at build time, so Vite
      // should not try to pre-bundle or statically analyze this runtime import.
      const pagefindPath = "/pagefind/pagefind.js";
      const mod = await import(/* @vite-ignore */ pagefindPath);
      pf = mod as unknown as PagefindAPI;
      await pf.init();
      return pf;
    } catch {
      return null;
    }
  }

  function open() {
    modalEl.classList.add("is-open");
    document.body.style.overflow = "hidden";
    setTimeout(() => input?.focus(), 50);
  }

  function close() {
    modalEl.classList.remove("is-open");
    document.body.style.overflow = "";
    if (input) input.value = "";
    resetResults();
  }

  function resetResults() {
    if (!resultsEl) return;
    resultsEl.textContent = "";
    const hint = document.createElement("p");
    hint.className = "search-hint";
    hint.textContent = "输入标题、标签或正文关键词";
    resultsEl.appendChild(hint);
  }

  async function renderResults(search: PagefindSearch) {
    if (!resultsEl || !search) return;
    resultsEl.textContent = "";

    if (search.results.length === 0) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "未找到相关内容";
      resultsEl.appendChild(empty);
      return;
    }

    const items = search.results.slice(0, 8);

    const anchors: HTMLAnchorElement[] = [];
    for (const _r of items) {
      const a = document.createElement("a");
      a.href = "#";
      a.className = "search-result-item";
      const titleDiv = document.createElement("div");
      titleDiv.className = "search-result-title";
      titleDiv.textContent = "加载中...";
      a.appendChild(titleDiv);
      resultsEl.appendChild(a);
      anchors.push(a);
    }

    const dataArr = await Promise.all(items.map((r) => r.data()));

    for (let idx = 0; idx < dataArr.length; idx++) {
      const data = dataArr[idx];
      const a = anchors[idx];
      a.href = data.url;
      const titleDiv = a.querySelector<HTMLElement>(".search-result-title");
      if (!titleDiv) continue;
      titleDiv.innerHTML = data.meta?.title ?? data.url;
      if (data.excerpt) {
        const excerptDiv = document.createElement("div");
        excerptDiv.className = "search-result-excerpt";
        excerptDiv.innerHTML = data.excerpt;
        a.appendChild(excerptDiv);
      }
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout>;
  async function onInput() {
    const query = input?.value.trim();
    if (!query) {
      resetResults();
      return;
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const instance = await loadPagefind();
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
      const results = await instance.search(query);
      renderResults(results);
    }, 200);
  }

  input?.addEventListener("input", onInput, { signal: controller.signal });

  closeTriggers.forEach((el) => {
    el.addEventListener("click", close, { signal: controller.signal });
  });

  document
    .querySelectorAll<HTMLElement>("[data-search-open]")
    .forEach((btn) => {
      btn.addEventListener("click", open, { signal: controller.signal });
    });

  document.addEventListener(
    "astro:before-swap",
    () => {
      close();
      controller.abort();
      if (currentController === controller) {
        currentController = null;
      }
    },
    { once: true, signal: controller.signal },
  );
}
