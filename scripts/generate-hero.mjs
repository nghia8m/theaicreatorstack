// Builds the hybrid hero images (A3): abstract tech photo + brand gradient
// overlay + neural-network layer, baked into one optimized JPG each.
// Source photos live in public/images/hero/raw/ (commercial-free, Unsplash).
// Run: node scripts/generate-hero.mjs
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HERO = resolve(__dirname, "../public/images/hero");
const RAW = resolve(__dirname, "../asset-sources/hero");

const BRAND = "#1e3a8a";
const INK = "#0f172a";
const ACCENT = "#06b6d4";
const ACCENT_LIGHT = "#67e8f9";
const W = 1920,
  H = 1080;

// Brand gradient overlay — dark enough on the left (where hero text sits)
// to guarantee white-text contrast.
function gradientSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs>
      <linearGradient id="d" x1="0" y1="0" x2="1" y2="0.9">
        <stop offset="0" stop-color="${INK}" stop-opacity="0.92"/>
        <stop offset="0.42" stop-color="${BRAND}" stop-opacity="0.72"/>
        <stop offset="1" stop-color="${INK}" stop-opacity="0.88"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.72" cy="0.35" r="0.55">
        <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.28"/>
        <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#d)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
  </svg>`);
}

// Neural-network layer: deterministic nodes + connecting lines (no randomness).
function neuralSvg(seedBase) {
  const seed = (seedBase + 1) * 131;
  let dots = "";
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const x = (seed * (i + 3) * 17) % W;
    const y = (seed * (i + 7) * 29) % H;
    pts.push([x, y]);
    const r = 2 + ((i * seed) % 4);
    const op = (0.18 + ((i % 5) * 0.06)).toFixed(2);
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${ACCENT_LIGHT}" opacity="${op}"/>`;
  }
  let lines = "";
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 3) % pts.length];
    const d = Math.hypot(x2 - x1, y2 - y1);
    if (d < 480) lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="1" opacity="0.12"/>`;
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${lines}${dots}</svg>`);
}

async function build(rawFile, outName, seed) {
  const base = await sharp(resolve(RAW, rawFile))
    .resize(W, H, { fit: "cover", position: "center" })
    .modulate({ brightness: 0.62, saturation: 0.9 })
    .toBuffer();

  const out = resolve(HERO, outName);
  await sharp(base)
    .composite([
      { input: gradientSvg(), blend: "over" },
      { input: neuralSvg(seed), blend: "over" },
    ])
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(out);

  const meta = await sharp(out).metadata();
  console.log(`  ✓ ${outName}  (${meta.width}x${meta.height})`);
}

const jobs = [
  ["raw1.jpg", "creator-workspace.jpg", 0],
  ["raw2.jpg", "content-flow.jpg", 1],
  ["cand2.jpg", "ai-network.jpg", 2],
];

for (const [src, out, seed] of jobs) await build(src, out, seed);
console.log("Hero images rebuilt.");
