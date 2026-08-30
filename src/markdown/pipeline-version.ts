import { getToolchainVersions } from "./toolchain";

export const MARKDOWN_PIPELINE_VERSION = "2026-03-23-asset-cache-v1";

let assetVersionPromise: Promise<string> | undefined;

/**
 * Asset names are content-addressed with this version and served with
 * `Cache-Control: immutable`, so it must change whenever a renderer binary
 * changes — otherwise browsers keep serving SVGs compiled by the old toolchain.
 */
export function resolveAssetVersion(): Promise<string> {
  assetVersionPromise ??= getToolchainVersions().then(
    ({ typst, mmdr }) =>
      `${MARKDOWN_PIPELINE_VERSION}+typst/${typst}+mmdr/${mmdr}`,
  );

  return assetVersionPromise;
}
