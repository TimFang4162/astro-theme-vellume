import { createHash } from "node:crypto";
import type { Element, ElementContent, Properties, Text } from "hast";

export function shortHash(input: string, length = 6) {
  return createHash("sha256").update(input).digest("hex").slice(0, length);
}

export function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escapeXml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function stripXmlPreamble(input: string) {
  return input
    .replace(/<\?xml[\s\S]*?\?>\s*/i, "")
    .replace(/<!DOCTYPE[\s\S]*?>\s*/i, "")
    .trim();
}

export function createElement(
  tagName: string,
  properties: Properties = {},
  children: ElementContent[] = [],
): Element {
  return {
    type: "element",
    tagName,
    properties,
    children,
  };
}

export function createTextNode(value: string): Text {
  return {
    type: "text",
    value,
  };
}

/**
 * Maps items through an async worker with at most `limit` workers in flight.
 * Results keep the input order.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workerCount = Math.max(1, Math.min(limit, items.length));
  const runners = Array.from({ length: workerCount }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}
