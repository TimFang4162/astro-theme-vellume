# astro-theme-vellume

`astro-theme-vellume` 是一个面向个人写作的 Astro 主题，强调稳定的阅读节奏、暖色纸感界面、衬线标题，以及克制而不过度喧宾夺主的动态效果。

仓库默认提供一套可直接改造成个人站点的主题基线：示例内容已经整理为适合公开发布的版本，站点配置、内容结构和常用页面也都已经就位。

![Vellume social preview](./.github/social-preview.png)

## 特性

- 偏编辑式的阅读界面，适合长文、笔记和系列化内容
- 浅色 / 深色主题切换与首页轻量动态背景
- 基于 Astro Content Collections 的内容组织方式
- 系列、标签、归档、RSS、OG 图和搜索页
- Tailwind CSS 4 与 TypeScript
- 可选接入 Artalk 评论系统，默认关闭

## 开始使用

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:4321`。

## 建议优先调整

- 修改 `src/config/site.ts` 中的站点标题、描述、作者信息与外部链接
- 重写 `src/content/about/index.md`，替换默认 About 页面内容
- 删除或替换 `src/content/blog/` 下的示例文章
- 如果需要评论，填入 `siteConfig.comments` 并启用 `enabled`

## 内容结构

```text
src/content/
├── about/
├── blog/
└── series/
```

文章通常按 `src/content/blog/<yyyy-mm>/<slug>/index.md` 的形式组织，图片与附件可以直接放在同级目录中。

文章 frontmatter 示例：

```md
---
title: "我的第一篇文章"
slug: "my-first-post"
description: "用来介绍主题的第一篇示例文章。"
publishedAt: 2026-03-29
tags: ["astro", "theme"]
visibility: "public"
---
```

## 常用检查命令

```bash
pnpm check:astro
pnpm check:biome
pnpm build
```

## 仓库展示资源

- GitHub 社交预览图源文件保存在 `./.github/social-preview.svg`
- 上传到 GitHub 时建议使用导出的 `./.github/social-preview.png`
- 如果需要替换，可直接更新 SVG 后重新导出 PNG
