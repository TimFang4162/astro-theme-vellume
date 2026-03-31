type PageLoadCallback = () => void;

interface PageLoadRegistry {
  callbacks: Map<string, PageLoadCallback>;
  listening: boolean;
  loaded: boolean;
}

const PAGE_LOAD_REGISTRY_KEY = "__vellumePageLoadRegistry";

type GlobalWithPageLoadRegistry = typeof globalThis & {
  [PAGE_LOAD_REGISTRY_KEY]?: PageLoadRegistry;
};

function getPageLoadRegistry() {
  const globalState = globalThis as GlobalWithPageLoadRegistry;

  globalState[PAGE_LOAD_REGISTRY_KEY] ??= {
    callbacks: new Map(),
    listening: false,
    loaded: false,
  };

  return globalState[PAGE_LOAD_REGISTRY_KEY];
}

function dispatchPageLoad() {
  const registry = getPageLoadRegistry();
  registry.loaded = true;

  for (const callback of registry.callbacks.values()) {
    callback();
  }
}

export function runOnPageLoad(id: string, callback: PageLoadCallback) {
  const registry = getPageLoadRegistry();

  registry.callbacks.set(id, callback);

  if (registry.listening) {
    if (registry.loaded) {
      queueMicrotask(callback);
    }
    return;
  }

  document.addEventListener("astro:before-swap", () => {
    getPageLoadRegistry().loaded = false;
  });
  document.addEventListener("astro:page-load", dispatchPageLoad);
  registry.listening = true;
}
