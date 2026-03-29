# 内容编写指南

## Frontmatter

每篇文章建议使用 `index.md` 或 `index.mdx`，并在 frontmatter 中填写以下字段：

```yaml
---
slug: "my-post"
title: "文章标题"
description: "文章摘要"
publishedAt: 2026-03-21
updatedAt: 2026-03-22
tags: ["标签1", "标签2"]
series: "my-series"
visibility: "public"
---
```

字段说明：

- `title`: 页面标题，列表页和 SEO 信息都会使用
- `description`: 页面摘要，用于列表展示和部分元信息
- `tags`: 标签列表，可为空数组
- `slug`: 稳定 URL 标识，最终路由是 `/posts/<slug>/`
- `publishedAt`: 发布时间，必填
- `updatedAt`: 更新时间，可选
- `series`: 系列 slug，可选，对应 `src/content/series/*.md`
- `visibility`: `public | unlisted | draft`

## 目录结构

每篇文章建议使用以下目录结构：

```text
src/content/blog/2026-03/my-post/
  index.md
  imgs/
  attachments/
```

如果当前文章没有配图或附件，可以暂时不创建对应目录。

系列元数据使用单独的 Markdown 文件：

```text
src/content/series/my-series.md
```

系列文件示例：

```yaml
---
title: "系列标题"
slug: "my-series"
description: "系列摘要"
---
```

系列正文会显示在对应系列页面的文章列表前。

## 图片与附件

图片建议统一放在当前文章目录的 `imgs/` 下，并在 Markdown 中使用相对路径：

```md
![示意图](./imgs/diagram.png)
```

附件建议放在 `attachments/` 下，同样使用相对路径引用：

```md
[下载 PDF](./attachments/demo.pdf)
```

构建时会生成对应的附件静态路由，因此不需要手动复制到 `public/`。

## 可见性规则

- `public`: 正常出现在首页、归档、标签、RSS 和系列页
- `unlisted`: 不出现在公开列表中，但仍可通过直链访问
- `draft`: 不生成公开页面，适合本地草稿或仓库占位内容
