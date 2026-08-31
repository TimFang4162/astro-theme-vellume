import { appendFile } from "node:fs/promises";

/**
 * CI helper: writes the JSON blob consumed by `loadEnvOverrides()` in
 * `src/config/site.ts` to `$GITHUB_ENV`. Run via Bun in the deploy workflow.
 */
const sha = process.env.GITHUB_SHA ?? "";
const shortSha = sha.slice(0, 7);
const repository = process.env.GITHUB_REPOSITORY ?? "";
const siteUrl = process.env.SITE_URL ?? "";

const link = (href: string, label: string) =>
  `<a href="${href}" target="_blank" class="text-muted-foreground transition-colors hover:text-primary">${label}</a>`;

const overrides = {
  comments: {
    enabled: true,
    server: process.env.ARTALK_SERVER ?? "",
    site: process.env.ARTALK_SITE ?? "",
  },
  site: {
    url: siteUrl,
    attribution: `Powered by ${link("https://astro.build", "Astro")} &amp; Theme ${link(`https://github.com/${repository}`, "Vellume")}<br>Commit ${link(`https://github.com/${repository}/commit/${sha}`, shortSha)}`,
  },
};

const line = `SITE_CONFIG_OVERRIDES=${JSON.stringify(overrides)}\n`;
const target = process.env.GITHUB_ENV;

if (target) {
  await appendFile(target, line);
} else {
  process.stdout.write(line);
}
