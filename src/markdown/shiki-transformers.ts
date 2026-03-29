import {
  transformerNotationDiff,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerRemoveNotationEscape,
} from "@shikijs/transformers";
import type { ShikiTransformer } from "shiki";
import { formatLanguageLabel } from "./language";
import { createElement, createTextNode } from "./utils";

function createCodeBlockChrome(): ShikiTransformer {
  return {
    name: "code-block-chrome",
    pre(hast) {
      this.addClassToHast(hast, "code-block__pre");
      hast.properties["data-language"] = this.options.lang;
      return hast;
    },
    code(hast) {
      this.addClassToHast(hast, "code-block__code");
      return hast;
    },
    line(hast, lineNumber) {
      this.addClassToHast(hast, "code-block__line");
      hast.properties["data-line"] = String(lineNumber);
      hast.children = [
        createElement(
          "span",
          { className: ["code-block__line-inner"] },
          hast.children.length ? hast.children : [createTextNode(" ")],
        ),
      ];
      return hast;
    },
    root(hast) {
      const language =
        typeof this.options.lang === "string" ? this.options.lang : "text";
      const languageLabel = formatLanguageLabel(language);

      hast.children = [
        createElement(
          "code-block",
          {
            className: ["code-block"],
            "data-language": language,
          },
          [
            createElement("div", { className: ["code-block__header"] }, [
              createElement("span", { className: ["code-block__language"] }, [
                createTextNode(languageLabel),
              ]),
              createElement(
                "button",
                {
                  className: ["code-block__copy"],
                  type: "button",
                  "data-code-copy": "",
                  "aria-label": `复制 ${languageLabel} 代码`,
                },
                [
                  createElement(
                    "span",
                    { className: ["code-block__copy-label"] },
                    [createTextNode("复制")],
                  ),
                ],
              ),
            ]),
            createElement("div", { className: ["code-block__scroller"] }, [
              this.pre,
            ]),
            createElement("template", { "data-code-source": "" }, [
              createTextNode(this.source),
            ]),
          ],
        ),
      ];
      return hast;
    },
  };
}

export function createShikiTransformers(): ShikiTransformer[] {
  return [
    transformerRemoveNotationEscape(),
    transformerNotationDiff(),
    transformerNotationHighlight(),
    transformerNotationFocus(),
    createCodeBlockChrome(),
  ];
}
