import {
  isAbsoluteHref,
  normalizeBasePath,
  withBasePathUsing,
  withoutBasePathUsing,
} from "./base-path-core.mjs";

export { isAbsoluteHref, normalizeBasePath, withBasePathUsing };

export function withBasePath(path: string) {
  return withBasePathUsing(path, import.meta.env.BASE_URL);
}

export function withoutBasePath(path: string) {
  return withoutBasePathUsing(path, import.meta.env.BASE_URL);
}

export function toAbsoluteSiteUrl(path: string, site: string | URL) {
  if (isAbsoluteHref(path)) {
    return new URL(path);
  }

  return new URL(withBasePath(path), site);
}
