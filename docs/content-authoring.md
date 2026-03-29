# Content Authoring

## Frontmatter

每篇文章的 `index.md` 或 `index.mdx` 使用以下字段：

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

说明：

- `slug`: 稳定 URL 标识，最终路由是 `/posts/<slug>/`
- `publishedAt`: 发布时间，必填
- `updatedAt`: 更新时间，可选
- `series`: 系列 slug，可选，对应 `src/content/series/*.md`
- `visibility`: `public | unlisted | draft`

## 目录结构

每篇文章使用以下目录：

```text
src/content/blog/2026-03/my-post/
  index.md
  imgs/
  attachments/
```

系列使用单独的 Markdown 文件：

```text
src/content/series/my-series.md
```

示例：

```yaml
---
title: "系列标题"
slug: "my-series"
description: "系列摘要"
---
```

系列正文会显示在对应系列页面的文章列表前。

## 图片引用

图片统一放在当前文章目录的 `imgs/` 下，在 Markdown 中直接使用相对路径：

```md
![示意图](./imgs/diagram.png)
```

## 附件引用

附件统一放在当前文章目录的 `attachments/` 下，在 Markdown 中也使用相对路径：

```md
[下载 PDF](./attachments/demo.pdf)
```

构建时会生成对应的附件静态路由，因此不需要手动复制到 `public/`。

## 可见性规则

- `public`: 正常出现在首页、归档、标签、RSS、系列页
- `unlisted`: 不出现在公开列表中，但可通过直链访问
- `draft`: 不生成公开页面
