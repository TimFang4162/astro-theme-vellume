let bound = false;
const resetTimers = new WeakMap<HTMLElement, number>();

type CopyResult = "copied" | "manual";

const promptManualCopy = (text: string): CopyResult => {
  window.prompt("请手动复制以下代码", text);
  return "manual";
};

const copyText = async (text: string): Promise<CopyResult> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return "copied";
    } catch (error) {
      console.warn("Clipboard API failed, falling back to manual copy.", error);
      return promptManualCopy(text);
    }
  }

  return promptManualCopy(text);
};

export function initCodeCopy() {
  if (bound) {
    return;
  }

  bound = true;

  document.addEventListener("click", async (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLElement>("[data-code-copy]");

    if (!button) {
      return;
    }

    const codeBlock = button.closest("code-block");
    const template = codeBlock?.querySelector("template[data-code-source]");
    const code =
      (template instanceof HTMLTemplateElement
        ? template.content.textContent
        : template?.textContent) ??
      codeBlock?.querySelector("pre code")?.textContent;

    if (!code) {
      return;
    }

    const label = button.querySelector(".code-block__copy-label");
    const originalLabel =
      button.dataset.copyDefaultLabel ?? label?.textContent ?? "复制";
    button.dataset.copyDefaultLabel = originalLabel;

    try {
      const result = await copyText(code.replace(/\n$/, ""));
      if (label) {
        label.textContent = result === "copied" ? "已复制" : "请手动复制";
      }
      button.setAttribute(
        "data-copied",
        result === "copied" ? "true" : "manual",
      );
    } catch (error) {
      console.error("Failed to copy code block.", error);
      if (label) {
        label.textContent = "复制失败";
      }
    }

    const existingTimer = resetTimers.get(button);

    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const resetTimer = window.setTimeout(() => {
      if (label) {
        label.textContent = originalLabel;
      }
      button.removeAttribute("data-copied");
      resetTimers.delete(button);
    }, 1500);

    resetTimers.set(button, resetTimer);
  });
}
