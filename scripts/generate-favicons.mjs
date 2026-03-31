import { promises as fs } from "node:fs";
import path from "node:path";
import { favicons } from "favicons";
import { faviconMetadata, siteMetadata } from "../src/site/metadata.mjs";

const source = path.join(process.cwd(), "public/assets/favicon.png");
const outputDir = path.join(process.cwd(), "public/favicons");

const configuration = {
  path: "./",
  appName: siteMetadata.title,
  appShortName: siteMetadata.title,
  appDescription: siteMetadata.description,
  background: faviconMetadata.background,
  theme_color: faviconMetadata.themeColor,
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

async function resetOutputDirectory() {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
}

async function writeResponse() {
  const response = await favicons(source, configuration);

  await Promise.all([
    ...response.images.map((image) =>
      fs.writeFile(path.join(outputDir, image.name), image.contents),
    ),
    ...response.files.map((file) =>
      fs.writeFile(path.join(outputDir, file.name), file.contents, "utf8"),
    ),
  ]);
}

await resetOutputDirectory();
await writeResponse();
