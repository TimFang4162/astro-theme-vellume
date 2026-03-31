---
title: About Vellume
description: Design notes, content structure, and customization guidance for the Vellume theme.
---

Vellume is an editorial-style Astro theme built for personal blogs, technical notes, and long-form writing.

It combines warm paper-toned colors, serif-led typography, and restrained motion so the interface feels alive without pulling attention away from the text.

## Start Here

- Update `src/site/config.ts` with your site title, description, author details, external links, and browser theme colors.
- Replace this page with your own introduction, profile, and contact information.
- Add posts under `src/content/blog`.
- Adjust navigation and footer links in `src/site/navigation.ts`.
- Override design tokens in `src/site/theme.css` if you want to change the visual tone.

## Included Features

- Light and dark themes
- Search and discovery pages
- Tags, series, and archive navigation
- Generated Open Graph images
- Markdown enhancements for diagrams and math

## Optional Integrations

The theme includes an Artalk comment component, but it is disabled by default.

If you want to enable it, set `comments.enabled` to `true` and provide your own `server` and `site` values in `src/site/config.ts`.
