# astro-theme-vellume

`astro-theme-vellume` 是一个偏阅读体验的 Astro 博客主题，重点放在暖色纸感配色、衬线标题、明暗主题切换，以及首页的轻量动态背景。

这个仓库已经移除了原博客文章和个人信息，默认以“主题骨架”形式提供，你可以直接替换站点配置并添加自己的内容。

## 特性

- 温暖的编辑部风格界面，适合长文和笔记
- 浅色 / 深色主题切换
- 基于 Astro Content Collections 的内容组织
- 系列、标签、归档、RSS、OG 图与搜索页
- Tailwind CSS 4 + TypeScript
- 可选接入 Artalk 评论系统，默认关闭

## 开始使用

```bash
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:4321`。

## 发布前建议修改

- 编辑 `src/config/site.ts` 中的站点标题、描述、作者信息与链接
- 在 `src/content/about/index.md` 中替换 About 页面内容
- 在 `src/content/blog/` 下添加你的文章
- 如果需要评论，填入 `siteConfig.comments` 并启用 `enabled`

## 内容结构

```text
src/content/
├── about/
├── blog/
└── series/
```

文章 frontmatter 示例：

```md
---
title: "My First Post"
slug: "my-first-post"
description: "A short introduction to the theme."
publishedAt: 2026-03-29
tags: ["astro", "theme"]
visibility: "public"
---
```

## 检查命令

```bash
pnpm check:astro
pnpm check:biome
pnpm build
```
