// B1: generates a UNIQUE abstract card image per article (seeded from its slug,
// tinted by category) so cards in the same category no longer look identical.
// Then points each article's cardImage (+ ogImage) at its own image.
// Run: node scripts/generate-card-images.mjs
import sharp from "sharp";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ART = resolve(__dirname, "../src/content/articles");
const OUT = resolve(__dirname, "../public/images/cards");
await mkdir(OUT, { recursive: true });

const BRAND = "#1e3a8a";
const INK = "#0f172a";
const W = 1200, H = 675;

// per-category accent hue
const ACCENT = {
  "/ai-writing": ["#06b6d4", "#67e8f9"],
  "/ai-video": ["#7c3aed", "#c4b5fd"],
  "/ai-voice": ["#14b8a6", "#5eead4"],
  "/ai-design": ["#f59e0b", "#fcd34d"],
  "/ai-seo": ["#22c55e", "#86efac"],
};

// tiny deterministic string hash
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function cardSvg(slug, link) {
  const [acc, accLight] = ACCENT[link] ?? ["#06b6d4", "#67e8f9"];
  const seed = hash(slug);
  const rng = (n) => (seed * (n + 3) * 2654435761) >>> 0;

  // scattered nodes + links, unique per slug
  const pts = [];
  let dots = "";
  for (let i = 0; i < 26; i++) {
    const x = rng(i * 2) % W;
    const y = rng(i * 2 + 1) % H;
    pts.push([x, y]);
    const r = 2 + (rng(i) % 5);
    const op = (0.22 + (rng(i + 9) % 40) / 100).toFixed(2);
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${accLight}" opacity="${op}"/>`;
  }
  let lines = "";
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1 + (rng(i) % 3)) % pts.length];
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 360) lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${acc}" stroke-width="1.5" opacity="0.18"/>`;
  }
  // a couple of large translucent geometric accents for depth
  const gx = rng(99) % W;
  const gy = rng(98) % H;
  const rot = rng(97) % 360;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND}"/>
        <stop offset="1" stop-color="${INK}"/>
      </linearGradient>
      <radialGradient id="glow" cx="${(gx / W).toFixed(2)}" cy="${(gy / H).toFixed(2)}" r="0.6">
        <stop offset="0" stop-color="${acc}" stop-opacity="0.35"/>
        <stop offset="1" stop-color="${acc}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <g transform="rotate(${rot} ${gx} ${gy})" opacity="0.10">
      <rect x="${gx - 140}" y="${gy - 140}" width="280" height="280" rx="40" fill="none" stroke="${accLight}" stroke-width="2"/>
      <rect x="${gx - 90}" y="${gy - 90}" width="180" height="180" rx="26" fill="none" stroke="${accLight}" stroke-width="2"/>
    </g>
    ${lines}
    ${dots}
    <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${acc}"/>
  </svg>`);
}

const files = (await readdir(ART)).filter((f) => f.endsWith(".md"));
let n = 0;
for (const f of files) {
  const slug = f.replace(/\.md$/, "");
  const raw = await readFile(resolve(ART, f), "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const link = (raw.match(/^categoryLink:\s*"([^"]+)"/m) || [])[1] || "/ai-writing";

  await sharp(cardSvg(slug, link)).jpeg({ quality: 80, mozjpeg: true }).toFile(resolve(OUT, `${slug}.jpg`));

  // repoint cardImage + ogImage to the per-article image
  let out = raw
    .replace(/^cardImage:\s*".*"\s*$/m, `cardImage: "/images/cards/${slug}.jpg"`)
    .replace(/^ogImage:\s*".*"\s*$/m, `ogImage: "/images/cards/${slug}.jpg"`);
  if (out !== raw) await writeFile(resolve(ART, f), out.split(/\r?\n/).join(eol));
  n++;
}
console.log(`Generated ${n} unique card images and repointed cardImage/ogImage.`);
