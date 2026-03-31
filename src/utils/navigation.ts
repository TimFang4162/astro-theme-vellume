import { withoutBasePath } from "./paths";

export function isPathActive(currentPath: string, href: string) {
  const normalizedCurrentPath = withoutBasePath(currentPath);
  const normalizedHref = withoutBasePath(href);

  return normalizedHref === "/"
    ? normalizedCurrentPath === normalizedHref
    : normalizedCurrentPath === normalizedHref ||
        normalizedCurrentPath.startsWith(`${normalizedHref}/`);
}
