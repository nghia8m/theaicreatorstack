// Assigns a category card image + og image to each article that lacks one.
// Non-destructive: only fills empty/missing cardImage & ogImage fields.
// Run: node scripts/assign-card-images.mjs
import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(__dirname, "../src/content/articles");

const MAP = {
  "/ai-writing": "/images/categories/ai-writing.jpg",
  "/ai-video": "/images/categories/ai-video.jpg",
  "/ai-voice": "/images/categories/ai-voice.jpg",
  "/ai-design": "/images/categories/ai-design.jpg",
  "/ai-seo": "/images/categories/ai-seo.jpg",
};

const files = (await readdir(DIR)).filter((f) => f.endsWith(".md"));
let changed = 0;

for (const f of files) {
  const path = resolve(DIR, f);
  let text = await readFile(path, "utf8");

  const linkMatch = text.match(/^categoryLink:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (!linkMatch) {
    console.warn("no categoryLink in", f);
    continue;
  }
  const img = MAP[linkMatch[1].trim()];
  if (!img) {
    console.warn("no image mapped for", linkMatch[1], "in", f);
    continue;
  }

  let touched = false;

  // Insert cardImage after categoryLink line if not present
  if (!/^cardImage:/m.test(text)) {
    text = text.replace(
      /^(categoryLink:\s*["']?[^"'\n]+["']?\s*)$/m,
      `$1\ncardImage: "${img}"`
    );
    touched = true;
  }
  // Insert ogImage too (uses the same category image as social preview)
  if (!/^ogImage:/m.test(text)) {
    text = text.replace(
      /^(categoryLink:\s*["']?[^"'\n]+["']?\s*)$/m,
      `$1\nogImage: "${img}"`
    );
    touched = true;
  }

  if (touched) {
    await writeFile(path, text);
    changed++;
    console.log("updated", f);
  }
}

console.log(`\nDone. Updated ${changed}/${files.length} articles.`);
