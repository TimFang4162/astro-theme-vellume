---
title: About This Theme
description: Notes on the design goals and customization points for Vellume.
---

Vellume is an editorial-style Astro theme designed for personal blogs, technical notes, and long-form writing.

It combines warm paper-like colors, serif-forward typography, and restrained motion to keep the focus on reading without making the interface feel flat.

## What To Customize First

- Update `src/config/site.ts` with your site title, description, and author details.
- Replace this page with your own introduction, links, and profile information.
- Add posts under `src/content/blog`.
- Add or remove sections in navigation and footer to match your site structure.

## Included Features

- Light and dark themes
- Search and discovery pages
- Tags, series, and archive navigation
- Generated Open Graph images
- Markdown enhancements for diagrams and math

## Optional Integrations

The theme includes an Artalk comment component, but it is disabled by default.

If you want to use it, set `siteConfig.comments.enabled` to `true` and provide your own `server` and `site` values in `src/config/site.ts`.
