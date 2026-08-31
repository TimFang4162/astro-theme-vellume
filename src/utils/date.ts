import { siteConfig } from "../config/site";

export function formatDate(date: Date): string {
  return date.toLocaleDateString(siteConfig.site.lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
