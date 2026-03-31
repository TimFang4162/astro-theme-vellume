const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/")
    ? basePath
    : `/${basePath}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;

  return withoutTrailingSlash;
}

export function isAbsoluteHref(href: string) {
  return ABSOLUTE_URL_PATTERN.test(href) || href.startsWith("//");
}

export function withBasePath(path: string) {
  if (!path || isAbsoluteHref(path) || path.startsWith("#") || path.startsWith("?")) {
    return path;
  }

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (basePath === "/") {
    return normalizedPath;
  }

  if (
    normalizedPath === basePath ||
    normalizedPath.startsWith(`${basePath}/`)
  ) {
    return normalizedPath;
  }

  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
}

export function withoutBasePath(path: string) {
  if (!path || isAbsoluteHref(path) || path.startsWith("#") || path.startsWith("?")) {
    return path;
  }

  const basePath = normalizeBasePath(import.meta.env.BASE_URL);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (basePath === "/") {
    return normalizedPath;
  }

  if (normalizedPath === basePath || normalizedPath === `${basePath}/`) {
    return "/";
  }

  if (normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath.slice(basePath.length);
  }

  return normalizedPath;
}

export function toAbsoluteSiteUrl(path: string, site: string | URL) {
  if (isAbsoluteHref(path)) {
    return new URL(path);
  }

  return new URL(withBasePath(path), site);
}
