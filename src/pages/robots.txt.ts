import type { APIRoute } from "astro";
import { siteUrl } from "../config/site";

export const GET: APIRoute = ({ site }) => {
  const baseUrl = site ?? siteUrl;
  const body = `User-agent: *
Allow: /

Sitemap: ${new URL("sitemap-index.xml", baseUrl).href}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
