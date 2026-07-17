// Generates all brand + hero imagery for AI Creator Stack as original SVG -> PNG.
// Run with: node scripts/generate-brand.mjs
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMG = resolve(__dirname, "../public/images");
const HERO = resolve(IMG, "hero");
const CAT = resolve(IMG, "categories");

const BRAND = "#1e3a8a";
const BRAND_DARK = "#0f172a";
const BRAND_MID = "#1e40af";
const ACCENT = "#06b6d4";
const ACCENT_LIGHT = "#67e8f9";

async function svgToPng(svg, out, width, height) {
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 90 })
    .toFile(out);
  console.log("wrote", out);
}

async function svgToJpg(svg, out, width, height) {
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  console.log("wrote", out);
}

// ---- Stack icon (three offset layers = a "stack") ----
function iconSvg(size = 512, bg = true) {
  const s = size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND}"/>
        <stop offset="1" stop-color="${BRAND_DARK}"/>
      </linearGradient>
    </defs>
    ${bg ? `<rect width="512" height="512" rx="112" fill="url(#g)"/>` : ""}
    <g transform="translate(256 256)">
      <polygon points="0,-150 150,-70 0,10 -150,-70" fill="${ACCENT}"/>
      <polygon points="0,-70 150,10 0,90 -150,10" fill="${ACCENT_LIGHT}" opacity="0.75"/>
      <polygon points="0,10 150,90 0,170 -150,90" fill="#ffffff" opacity="0.9"/>
    </g>
  </svg>`;
}

// ---- Favicon SVG (scalable) ----
const faviconSvg = iconSvg(512, true);

// ---- Wordmark / OG default ----
function ogSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND}"/>
        <stop offset="1" stop-color="${BRAND_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <g transform="translate(120 190) scale(0.62)">
      <polygon points="0,-150 150,-70 0,10 -150,-70" fill="${ACCENT}"/>
      <polygon points="0,-70 150,10 0,90 -150,10" fill="${ACCENT_LIGHT}" opacity="0.75"/>
      <polygon points="0,10 150,90 0,170 -150,90" fill="#ffffff" opacity="0.9"/>
    </g>
    <text x="250" y="300" font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="800" fill="#ffffff">AI Creator <tspan fill="${ACCENT_LIGHT}">Stack</tspan></text>
    <text x="250" y="365" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="400" fill="#cbd5e1">Honest reviews of AI tools for content creators</text>
    <rect x="0" y="610" width="1200" height="20" fill="${ACCENT}"/>
  </svg>`;
}

// ---- Hero backgrounds (abstract tech mood) ----
function heroSvg(variant) {
  const palettes = [
    [BRAND, BRAND_DARK],
    [BRAND_MID, "#083344"],
    ["#111a3a", BRAND_DARK],
  ];
  const [c1, c2] = palettes[variant % palettes.length];
  // scattered nodes + connecting lines for an "AI network" feel
  let nodes = "";
  const seed = (variant + 1) * 97;
  for (let i = 0; i < 46; i++) {
    const x = (seed * (i + 3) * 13) % 1920;
    const y = (seed * (i + 7) * 31) % 1080;
    const r = 2 + ((i * seed) % 5);
    const op = 0.15 + ((i % 5) * 0.08);
    nodes += `<circle cx="${x}" cy="${y}" r="${r}" fill="${ACCENT_LIGHT}" opacity="${op.toFixed(2)}"/>`;
  }
  let lines = "";
  for (let i = 0; i < 18; i++) {
    const x1 = (seed * (i + 2) * 17) % 1920;
    const y1 = (seed * (i + 5) * 23) % 1080;
    const x2 = (seed * (i + 9) * 29) % 1920;
    const y2 = (seed * (i + 4) * 19) % 1080;
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ACCENT}" stroke-width="1" opacity="0.08"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.75" cy="0.3" r="0.6">
        <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#hg)"/>
    <rect width="1920" height="1080" fill="url(#glow)"/>
    ${lines}
    ${nodes}
  </svg>`;
}

// ---- Category cards ----
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function categorySvg(rawLabel, accent = ACCENT) {
  const label = esc(rawLabel);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
    <defs>
      <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${BRAND}"/>
        <stop offset="1" stop-color="${BRAND_DARK}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="675" fill="url(#cg)"/>
    <rect x="0" y="0" width="14" height="675" fill="${accent}"/>
    <g transform="translate(90 250) scale(0.5)">
      <polygon points="0,-150 150,-70 0,10 -150,-70" fill="${accent}"/>
      <polygon points="0,-70 150,10 0,90 -150,10" fill="#ffffff" opacity="0.7"/>
    </g>
    <text x="70" y="440" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="3" fill="${ACCENT_LIGHT}">AI CREATOR STACK</text>
    <text x="70" y="510" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800" fill="#ffffff">${label}</text>
  </svg>`;
}

async function main() {
  await mkdir(IMG, { recursive: true });
  await mkdir(HERO, { recursive: true });
  await mkdir(CAT, { recursive: true });

  // favicon (svg + png)
  await writeFile(resolve(__dirname, "../public/favicon.svg"), faviconSvg);
  console.log("wrote public/favicon.svg");
  await svgToPng(faviconSvg, resolve(__dirname, "../public/favicon.png"), 96, 96);
  await svgToPng(iconSvg(512, false), resolve(IMG, "logo.png"), 512, 512);
  await svgToPng(iconSvg(512, true), resolve(IMG, "logo-badge.png"), 512, 512);

  // OG default
  await svgToPng(ogSvg(), resolve(IMG, "og-default.png"), 1200, 630);

  // hero slides (jpg, optimized)
  const heroNames = ["creator-workspace", "ai-network", "content-flow"];
  for (let i = 0; i < heroNames.length; i++) {
    await svgToJpg(heroSvg(i), resolve(HERO, `${heroNames[i]}.jpg`), 1920, 1080);
  }

  // category cards
  const cats = [
    ["ai-writing", "AI Writing Tools"],
    ["ai-video", "AI Video Tools"],
    ["ai-voice", "AI Voice & Audio Tools"],
    ["ai-design", "AI Design & Thumbnails"],
    ["ai-seo", "AI SEO & Analytics"],
  ];
  for (const [slug, label] of cats) {
    await svgToJpg(categorySvg(label), resolve(CAT, `${slug}.jpg`), 1200, 675);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
