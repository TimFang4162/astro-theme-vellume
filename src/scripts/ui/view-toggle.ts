const DEFAULT_VIEW = "card";

function updateView(root: HTMLElement, view: string) {
  root.dataset.view = view;

  const target = root.querySelector<HTMLElement>("[data-view-target]");

  if (target) {
    target.dataset.viewTarget = view;
  }

  root.querySelectorAll<HTMLElement>("[data-view-item]").forEach((item) => {
    item.dataset.viewItem = view;
  });

  root.querySelectorAll<HTMLElement>("[data-view-btn]").forEach((button) => {
    const isActive = button.dataset.viewBtn === view;

    button.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

export function initViewToggles() {
  document.querySelectorAll<HTMLElement>("[data-view-root]").forEach((root) => {
    const initialView = root.dataset.view || DEFAULT_VIEW;

    if (root.dataset.viewReady === "true") {
      updateView(root, initialView);
      return;
    }

    root.dataset.viewReady = "true";
    updateView(root, initialView);

    root
      .querySelectorAll<HTMLButtonElement>("[data-view-btn]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          updateView(root, button.dataset.viewBtn || DEFAULT_VIEW);
        });
      });
  });
}
