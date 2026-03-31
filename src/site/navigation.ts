export interface SiteNavItem {
  href: string;
  label: string;
  icon?: string;
}

export const navItems = [
  {
    href: "/",
    label: "首页",
    icon: "material-symbols:home-outline-rounded",
  },
  {
    href: "/discovery",
    label: "发现",
    icon: "material-symbols:explore-outline-rounded",
  },
] satisfies SiteNavItem[];

export const footerNavItems = [
  { href: "/", label: "首页" },
  { href: "/discovery", label: "发现" },
  { href: "/posts", label: "文章" },
  { href: "/series", label: "系列" },
  { href: "/tags", label: "标签" },
] satisfies SiteNavItem[];
