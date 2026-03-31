let bound = false;

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
      console.warn("Clipboard API failed, falling back.", error);
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

    const button = target.closest("[data-code-copy]");

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
    const originalLabel = label?.textContent ?? "复制";

    try {
      const result = await copyText(code.replace(/\n$/, ""));
      if (label) {
        label.textContent = result === "copied" ? "已复制" : "请手动复制";
      }
      button.setAttribute("data-copied", result);
    } catch (error) {
      console.error("Failed to copy code block.", error);
      if (label) {
        label.textContent = "复制失败";
      }
    }

    window.setTimeout(() => {
      if (label) {
        label.textContent = originalLabel;
      }
      button.removeAttribute("data-copied");
    }, 1500);
  });
}
