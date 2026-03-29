const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  css: "CSS",
  diff: "Diff",
  html: "HTML",
  javascript: "JavaScript",
  js: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  markdown: "Markdown",
  md: "Markdown",
  mermaid: "Mermaid",
  plaintext: "Text",
  py: "Python",
  python: "Python",
  shell: "Shell",
  sh: "Shell",
  text: "Text",
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  typst: "Typst",
  xml: "XML",
  yaml: "YAML",
  yml: "YAML",
};

export function formatLanguageLabel(language: string | undefined) {
  if (!language) {
    return "Text";
  }

  const normalized = language.toLowerCase();
  return (
    LANGUAGE_LABELS[normalized] ??
    normalized
      .split(/[-_]/g)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ")
  );
}
