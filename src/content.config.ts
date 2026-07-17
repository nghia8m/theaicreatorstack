import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const DEFAULT_PRICE_NOTE =
  "SaaS pricing changes frequently. The figures below were accurate on the date we last verified them — always confirm the current price and plan limits on the tool's official website before subscribing.";

const pricingTier = z.object({
  tierName: z.string(),
  price: z.string(),
  features: z.array(z.string()).default([]),
});

const product = z.object({
  name: z.string(),
  award: z.string().default(""),
  affiliateUrl: z.string().default(""),
  pricingTiers: z.array(pricingTier).default([]),
  freeTrialAvailable: z.boolean().default(false),
  platform: z.array(z.enum(["web", "desktop", "mobile", "extension"])).default([]),
  rating: z.string().default(""),
  bestFor: z.string().default(""),
  image: z.string().optional(),
  imageCaption: z.string().optional(),
  description: z.string(),
  keyFeatures: z.array(z.string()).default([]),
  pros: z.array(z.string()).default([]),
  cons: z.array(z.string()).default([]),
  ratingValue: z.number().min(0).max(5).optional(),
  ratingCount: z.number().int().min(0).optional(),
  reviewBody: z.string().default(""),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    metaTitle: z.string().max(70),
    metaDescription: z.string().max(165),
    category: z.string(),
    categoryLink: z.string(),
    ogImage: z.string().optional(),
    cardImage: z.string().optional(),
    cardTitle: z.string().optional(),
    cardSummary: z.string(),
    publishedLabel: z.string().default("Updated 2026"),
    readTime: z.string().default("8 min read"),
    intro: z.string(),
    priceNote: z.string().default(DEFAULT_PRICE_NOTE),
    lastVerified: z.string(),
    quickPick: z.object({
      name: z.string(),
      reason: z.string(),
    }),
    products: z.array(product).min(1),
    faqs: z
      .array(
        z.object({
          q: z.string(),
          a: z.string(),
        })
      )
      .default([]),
    conclusion: z.string(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
