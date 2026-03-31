const LATIN_WORD_PATTERN = /[A-Za-z0-9_]+(?:['\u2019-][A-Za-z0-9_]+)*/g;
const CJK_CHAR_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

const CJK_CHARS_PER_MINUTE = 500;
const LATIN_WORDS_PER_MINUTE = 200;

export function estimateWordCount(text: string): number {
  const normalized = text.trim();

  if (!normalized) {
    return 0;
  }

  const latinWords = normalized.match(LATIN_WORD_PATTERN) ?? [];
  const cjkChars = normalized.match(CJK_CHAR_PATTERN) ?? [];

  return latinWords.length + cjkChars.length;
}

export function estimateReadMinutes(text: string): number {
  const normalized = text.trim();

  if (!normalized) {
    return 1;
  }

  const latinWords = normalized.match(LATIN_WORD_PATTERN) ?? [];
  const cjkChars = normalized.match(CJK_CHAR_PATTERN) ?? [];

  const minutes =
    latinWords.length / LATIN_WORDS_PER_MINUTE +
    cjkChars.length / CJK_CHARS_PER_MINUTE;

  return Math.max(1, Math.ceil(minutes));
}

export function getFrontmatterReadMinutes(frontmatter: unknown) {
  if (!frontmatter || typeof frontmatter !== "object") {
    return undefined;
  }

  const { minutesRead } = frontmatter as { minutesRead?: unknown };

  if (typeof minutesRead !== "number" || !Number.isFinite(minutesRead)) {
    return undefined;
  }

  return minutesRead;
}

export function getEntryReadMinutes(entry: {
  body?: string;
  rendered?: {
    metadata?: {
      frontmatter?: unknown;
      [key: string]: unknown;
    };
  };
}) {
  const minutesRead = getFrontmatterReadMinutes(
    entry.rendered?.metadata?.frontmatter,
  );

  return minutesRead ?? estimateReadMinutes(entry.body || "");
}

export function formatWordCountK(wordCount: number): string {
  return `${(wordCount / 1000).toFixed(1)}千字`;
}

export function estimateReadTime(minutes: number): string {
  if (minutes < 1) {
    return "少于 1 分钟";
  } else if (minutes < 60) {
    return `${Math.round(minutes)} 分钟`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} 小时 ${remainingMinutes} 分钟`
      : `${hours} 小时`;
  }
}
