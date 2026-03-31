const ABSOLUTE_URL_PATTERN = /^[a-z][a-z\d+.-]*:/i;

export function normalizeBasePath(basePath) {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;

  return withLeadingSlash.length > 1 && withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, -1)
    : withLeadingSlash;
}

export function isAbsoluteHref(href) {
  return ABSOLUTE_URL_PATTERN.test(href) || href.startsWith("//");
}

export function withBasePathUsing(path, basePath) {
  if (
    !path ||
    isAbsoluteHref(path) ||
    path.startsWith("#") ||
    path.startsWith("?")
  ) {
    return path;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBasePath === "/") {
    return normalizedPath;
  }

  if (
    normalizedPath === normalizedBasePath ||
    normalizedPath.startsWith(`${normalizedBasePath}/`)
  ) {
    return normalizedPath;
  }

  return normalizedPath === "/"
    ? `${normalizedBasePath}/`
    : `${normalizedBasePath}${normalizedPath}`;
}

export function withoutBasePathUsing(path, basePath) {
  if (
    !path ||
    isAbsoluteHref(path) ||
    path.startsWith("#") ||
    path.startsWith("?")
  ) {
    return path;
  }

  const normalizedBasePath = normalizeBasePath(basePath);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBasePath === "/") {
    return normalizedPath;
  }

  if (
    normalizedPath === normalizedBasePath ||
    normalizedPath === `${normalizedBasePath}/`
  ) {
    return "/";
  }

  if (normalizedPath.startsWith(`${normalizedBasePath}/`)) {
    return normalizedPath.slice(normalizedBasePath.length);
  }

  return normalizedPath;
}
