# astro-theme-vellume

`astro-theme-vellume` 是一个面向个人写作的 Astro 主题，适合搭建技术博客、学习笔记、项目记录和长文内容站点。

它强调稳定的阅读节奏、暖色纸感界面、衬线标题，以及克制而不过度喧宾夺主的动态效果。仓库本身已经整理成适合公开分发的主题形态，可以直接作为模板开始修改。

[![Astro](https://img.shields.io/badge/Astro-6.1-ff5d01?logo=astro&logoColor=white)](https://astro.build/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-43853d?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Template Repository](https://img.shields.io/badge/GitHub-Template-black?logo=github)](https://github.com/TimFang4162/astro-theme-vellume/generate)

## 快速入口

- 使用模板：<https://github.com/TimFang4162/astro-theme-vellume/generate>
- 仓库地址：<https://github.com/TimFang4162/astro-theme-vellume>
- 内容文档：[docs/content-authoring.md](./docs/content-authoring.md)

![Vellume social preview](./.github/social-preview.png)

## 项目状态

- 这个仓库已经整理成可直接分发的主题模板
- 当前没有公开演示站，建议本地运行或自行部署预览
- 当前仓库还没有 `LICENSE` 文件，准备公开分发前建议补上

## 为什么用它

- 不是“功能堆叠型”博客主题，而是优先服务阅读体验
- 内容结构已经完整连通，开箱就能作为真实站点使用
- 适合长期维护，文章、图片和附件都能和正文放在一起
- 默认示例内容足够展示能力，但不会把仓库变成个人博客备份

## 核心特性

- 偏编辑式的阅读界面，适合长文、笔记和系列化内容
- 浅色 / 深色主题切换与首页轻量动态背景
- 基于 Astro Content Collections 的内容组织方式
- 系列、标签、归档、RSS、OG 图和搜索页
- Tailwind CSS 4 与 TypeScript
- 可选接入 Artalk 评论系统，默认关闭

## 技术栈

- Astro 6
- TypeScript 5
- Tailwind CSS 4
- Astro Content Collections
- astro-og-canvas
- astro-pagefind
- Biome

## 快速开始

环境要求：

- Node.js `>= 22.12.0`
- `pnpm`

如果你想把它作为新站点起点，最直接的方式是使用这个仓库模板，或者克隆后自行修改。

```bash
git clone git@github.com:TimFang4162/astro-theme-vellume.git
cd astro-theme-vellume
pnpm install
pnpm dev
```

默认开发地址为 `http://localhost:4321`。

## 推荐的起步顺序

1. 修改 `src/config/site.ts` 中的站点标题、描述、作者信息与外部链接。
2. 重写 `src/content/about/index.md`，替换默认 About 页面内容。
3. 删除或替换 `src/content/blog/` 下的示例文章。
4. 根据需要调整导航、页脚和评论配置。

如果你需要评论功能，填入 `siteConfig.comments` 并启用 `enabled` 即可。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm preview
pnpm check:astro
pnpm check:biome
```

## 内容结构

```text
src/content/
├── about/
├── blog/
└── series/
```

文章通常按 `src/content/blog/<yyyy-mm>/<slug>/index.md` 的形式组织，图片与附件可以直接放在同级目录中：

```text
src/content/blog/2026-03/my-post/
  index.md
  imgs/
  attachments/
```

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

更完整的内容编写说明见 [docs/content-authoring.md](./docs/content-authoring.md)。

## 自定义入口

- 站点配置：[src/config/site.ts](./src/config/site.ts)
- About 页面内容：[src/content/about/index.md](./src/content/about/index.md)
- 示例文章：[src/content/blog](./src/content/blog)
- 系列元数据：[src/content/series](./src/content/series)
- 全局样式：[src/styles/global.css](./src/styles/global.css)

## 仓库展示资源

- GitHub 社交预览图源文件保存在 `./.github/social-preview.svg`
- 上传到 GitHub 时建议使用导出的 `./.github/social-preview.png`
- 如果需要替换，可直接更新 SVG 后重新导出 PNG

## License

当前仓库还没有附带许可证文件。如果你准备面向外部长期分发，建议尽快补一个明确的开源许可证。
