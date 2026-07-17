// 🅒 Sets each article's cardImage to a REAL screenshot of a tool reviewed in
// that article. To avoid the same tool repeating across cards, it greedily
// picks, from each article's own tools, the screenshot used least so far
// (tie-break: the article's editor's quick pick, then first listed).
// ogImage is left as the abstract card art (fine for social previews).
// Run: node scripts/assign-card-screenshots.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = resolve(__dirname, "../src/content/articles");
const TOOLS = resolve(__dirname, "../public/images/tools");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
// Tools whose real homepage is too minimal/blank to make a good card thumbnail.
// They stay in the article; they're just skipped when choosing the cover image.
const CARD_EXCLUDE = new Set(["ChatGPT", "Cleanup.pictures"]);
const hasShot = (name) => !CARD_EXCLUDE.has(name) && existsSync(resolve(TOOLS, `${slug(name)}.jpg`));

const files = (await readdir(ART)).filter((f) => f.endsWith(".md")).sort();

// Parse each article's product list + quick pick.
const articles = [];
for (const f of files) {
  const raw = await readFile(resolve(ART, f), "utf8");
  const products = [...raw.matchAll(/^  - name:\s*"([^"]+)"/gm)].map((m) => m[1]);
  const qp = (raw.match(/quickPick:\s*\r?\n\s*name:\s*"([^"]+)"/) || [])[1];
  articles.push({ f, raw, products, qp });
}

// Order articles so more-constrained ones (fewer tool options) pick first.
const withShots = articles.map((a) => ({
  ...a,
  options: a.products.filter(hasShot),
}));
withShots.sort((a, b) => a.options.length - b.options.length);

const usage = new Map();
const use = (name) => usage.set(name, (usage.get(name) || 0) + 1);
const count = (name) => usage.get(name) || 0;

const result = new Map();
for (const a of withShots) {
  if (!a.options.length) continue;
  // rank: least-used first; tie-break quick pick, then original order
  const ranked = a.options
    .map((name, i) => ({ name, i, isQp: name === a.qp }))
    .sort((x, y) => count(x.name) - count(y.name) || (y.isQp - x.isQp) || x.i - y.i);
  const chosen = ranked[0].name;
  use(chosen);
  result.set(a.f, slug(chosen));
}

// Write cardImage back (preserving line endings).
let n = 0;
for (const a of articles) {
  const chosenSlug = result.get(a.f);
  if (!chosenSlug) continue;
  const eol = a.raw.includes("\r\n") ? "\r\n" : "\n";
  const out = a.raw.replace(/^cardImage:\s*".*"\s*$/m, `cardImage: "/images/tools/${chosenSlug}.jpg"`);
  if (out !== a.raw) {
    await writeFile(resolve(ART, a.f), out.split(/\r?\n/).join(eol));
    n++;
  }
}

// Report distribution
const dist = [...usage.entries()].sort((a, b) => b[1] - a[1]);
console.log(`Updated cardImage on ${n} articles.`);
console.log(`Distinct tools used as cards: ${usage.size}`);
console.log(`Max reuse of any single tool: ${dist[0]?.[1]} (${dist[0]?.[0]})`);
