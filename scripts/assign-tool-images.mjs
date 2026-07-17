// Assigns captured tool screenshots to each product in every article.
// Robust + idempotent: strips any existing product-level image/imageCaption
// (4-space indent) first, then inserts the screenshot after each product name.
// Run: node scripts/assign-tool-images.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = resolve(__dirname, "../src/content/articles");
const TOOLS_DIR = resolve(__dirname, "../public/images/tools");

const slugifyTool = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const files = (await readdir(ART)).filter((f) => f.endsWith(".md"));
let productsSeen = 0,
  withImage = 0;
const missing = new Set();

for (const f of files) {
  const raw = await readFile(ART + "/" + f, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    // Drop any pre-existing product-level image / imageCaption field
    // (exactly 4-space indent — never matches 0-indent cardImage/ogImage).
    if (/^    image:\s/.test(line) || /^    imageCaption:\s/.test(line)) continue;

    out.push(line);

    const m = line.match(/^  - name:\s*"(.+)"\s*$/);
    if (m) {
      productsSeen++;
      const name = m[1];
      const slug = slugifyTool(name);
      if (existsSync(resolve(TOOLS_DIR, `${slug}.jpg`))) {
        out.push(`    image: "/images/tools/${slug}.jpg"`);
        out.push(`    imageCaption: "${name} homepage (screenshot captured July 2026)."`);
        withImage++;
      } else {
        missing.add(name);
      }
    }
  }

  await writeFile(ART + "/" + f, out.join(eol));
}

console.log(`Products: ${productsSeen} | with screenshot: ${withImage}`);
console.log(`Missing: ${[...missing].join(", ") || "none"}`);
