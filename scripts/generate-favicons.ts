import { promises as fs } from "node:fs";
import path from "node:path";
import { type FaviconOptions, favicons } from "favicons";
import { resolveThemeBranding } from "../src/config/theme-profiles";
import { faviconMetadata, siteMetadata } from "../src/site/metadata";

const source = path.join(process.cwd(), "public/assets/favicon.png");
const outputDir = path.join(process.cwd(), "public/favicons");

// Favicon chrome follows the active theme profile's canvas color.
const { browserColor } = resolveThemeBranding();

const configuration: FaviconOptions = {
  path: "./",
  appName: siteMetadata.title,
  appShortName: siteMetadata.title,
  appDescription: siteMetadata.description,
  background: browserColor.light,
  theme_color: browserColor.light,
  appleStatusBarStyle: faviconMetadata.appleStatusBarStyle,
  display: faviconMetadata.display,
  orientation: faviconMetadata.orientation,
  start_url: faviconMetadata.startUrl,
  manifestRelativePaths: true,
  icons: {
    android: true,
    appleIcon: true,
    appleStartup: false,
    favicons: true,
    windows: false,
    yandex: true,
  },
  output: {
    images: true,
    files: true,
    html: false,
  },
};

async function resetOutputDirectory(): Promise<void> {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
}

async function writeResponse(): Promise<void> {
  const response = await favicons(source, configuration);

  await Promise.all([
    ...response.images.map((image) =>
      fs.writeFile(path.join(outputDir, image.name), image.contents),
    ),
    // Trailing newline keeps the generated text files formatter-stable.
    ...response.files.map((file) =>
      fs.writeFile(
        path.join(outputDir, file.name),
        `${file.contents}\n`,
        "utf8",
      ),
    ),
  ]);
}

await resetOutputDirectory();
await writeResponse();
