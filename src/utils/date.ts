import { siteConfig } from "../config/site";

export function formatDate(date: Date): string {
  return date.toLocaleDateString(siteConfig.site.lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Compact month-day form ("3-30") for date columns that sit beside a
 *  month-group heading, where repeating the year and month is noise. */
export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

/** Year-less month-day in words ("3 月 30 日") for inline dates in compact
 *  layouts, where the surrounding page makes the year obvious. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(siteConfig.site.lang, {
    month: "long",
    day: "numeric",
  });
}
