import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const STATIC_PATHS = [
  "/",
  "/ai-writing",
  "/ai-video",
  "/ai-voice",
  "/ai-design",
  "/ai-seo",
  "/about",
  "/contact",
  "/privacy-policy",
  "/affiliate-disclosure",
];

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL("https://theaicreatorstack.com")).href.replace(/\/$/, "");
  const articles = await getCollection("articles", ({ data }) => !data.draft);

  const urls = [
    ...STATIC_PATHS.map((p) => ({ loc: p === "/" ? base + "/" : base + p })),
    ...articles.map((a) => ({ loc: `${base}/${a.id}` })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc></url>`).join("\n")}
</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
