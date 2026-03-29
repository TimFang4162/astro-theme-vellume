let runtimePromise:
  | Promise<typeof import("./hero-particles-runtime")>
  | undefined;

function canHydrateHomeHeroParticles() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  const probeCanvas = document.createElement("canvas");
  return !!(
    probeCanvas.getContext("webgl") ??
    probeCanvas.getContext("experimental-webgl")
  );
}

async function hydrateHomeHero(hero: HTMLElement) {
  const mount = hero.querySelector<HTMLElement>("[data-hero-canvas]");

  if (!mount || !canHydrateHomeHeroParticles()) {
    hero.removeAttribute("data-particles-ready");
    return;
  }

  runtimePromise ??= import("./hero-particles-runtime");

  try {
    const { mountHomeHeroParticles } = await runtimePromise;
    mountHomeHeroParticles(hero, mount);
  } catch (error) {
    hero.removeAttribute("data-particles-ready");
    console.error("Failed to initialize home hero particles.", error);
  }
}

export function initHomeHero(root: ParentNode = document) {
  const hero = root.querySelector<HTMLElement>("[data-home-hero]");

  if (!hero || hero.hasAttribute("data-particles-ready")) {
    return;
  }

  hero.setAttribute("data-particles-ready", "true");
  void hydrateHomeHero(hero);
}
