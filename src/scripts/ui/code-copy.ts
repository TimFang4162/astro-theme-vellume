let bound = false;

const fallbackCopyText = async (text: string) => {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "0";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.append(textarea);
  textarea.focus({ preventScroll: true });
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const success = document.execCommand("copy");

    if (!success) {
      throw new Error("document.execCommand('copy') returned false.");
    }
  } finally {
    textarea.remove();
  }
};

const copyText = async (text: string) => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn("Clipboard API failed, falling back.", error);
    }
  }

  await fallbackCopyText(text);
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
      await copyText(code.replace(/\n$/, ""));
      if (label) {
        label.textContent = "已复制";
      }
      button.setAttribute("data-copied", "true");
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
