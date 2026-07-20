// Screenshots the PUBLIC homepage of each reviewed tool (Tier 2 of our image policy).
// No login, no private data — public marketing pages only, for editorial review use.
//
// Usage:
//   node scripts/shoot-tools.mjs --test     # only the first 5 tools
//   node scripts/shoot-tools.mjs            # all tools
//
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/images/tools");
const REPORT = resolve(__dirname, "../screenshot-report.json");

// tool name (must match products[].name in the articles) -> public homepage
export const TOOLS = {
  // --- Writing ---
  "Jasper": "https://www.jasper.ai",
  "Copy.ai": "https://www.copy.ai",
  "Writesonic": "https://writesonic.com",
  "Rytr": "https://rytr.me",
  "Anyword": "https://anyword.com",
  "ChatGPT": "https://chatgpt.com",
  "Notion AI": "https://www.notion.com/product/ai",
  "beehiiv": "https://www.beehiiv.com",
  // --- Video ---
  "Descript": "https://www.descript.com",
  "VEED": "https://www.veed.io",
  "Filmora": "https://filmora.wondershare.com",
  "Runway": "https://runwayml.com",
  "OpusClip": "https://www.opus.pro",
  "Synthesia": "https://www.synthesia.io",
  "HeyGen": "https://www.heygen.com",
  "InVideo AI": "https://invideo.io",
  "Pictory": "https://pictory.ai",
  "Submagic": "https://www.submagic.co",
  "Captions": "https://www.captions.ai",
  // --- Voice ---
  "ElevenLabs": "https://elevenlabs.io",
  "Murf AI": "https://murf.ai",
  "Play.ht": "https://play.ht",
  "LOVO (Genny)": "https://lovo.ai",
  "Speechify": "https://speechify.com",
  "Podcastle": "https://podcastle.ai",
  "Adobe Podcast": "https://podcast.adobe.com",
  "Castmagic": "https://www.castmagic.io",
  "Suno": "https://suno.com",
  "Udio": "https://www.udio.com",
  "Soundraw": "https://soundraw.io",
  "Mubert": "https://mubert.com",
  // --- Design ---
  "Canva": "https://www.canva.com",
  "Adobe Express": "https://www.adobe.com/express/",
  "Adobe Firefly": "https://www.adobe.com/products/firefly.html",
  "Midjourney": "https://www.midjourney.com",
  "Leonardo.ai": "https://leonardo.ai",
  "Ideogram": "https://ideogram.ai",
  "Recraft": "https://www.recraft.ai",
  "Looka": "https://looka.com",
  "Brandmark": "https://brandmark.io",
  "Photoroom": "https://www.photoroom.com",
  "Cleanup.pictures": "https://cleanup.pictures",
  // --- SEO ---
  "Surfer SEO": "https://surferseo.com",
  "Frase": "https://www.frase.io",
  "Semrush": "https://www.semrush.com",
  "Ahrefs": "https://ahrefs.com",
  "VidIQ": "https://vidiq.com",
  "TubeBuddy": "https://www.tubebuddy.com",
  "Keywords Everywhere": "https://keywordseverywhere.com",
  "Repurpose.io": "https://repurpose.io",
  "Social Blade": "https://socialblade.com",
  // --- Added batch 2 (60-article expansion) ---
  "Grammarly": "https://www.grammarly.com",
  "QuillBot": "https://quillbot.com",
  "Wordtune": "https://www.wordtune.com",
  "CapCut": "https://www.capcut.com",
  "Otter.ai": "https://otter.ai",
  "Sonix": "https://sonix.ai",
  "Riverside.fm": "https://riverside.com",
  "Gamma": "https://gamma.app",
  "Beautiful.ai": "https://www.beautiful.ai",
  "AnswerThePublic": "https://answerthepublic.com",
};

export const slugifyTool = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Common cookie/consent buttons — best effort, never fatal.
const CONSENT_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button:has-text("Accept all")',
  'button:has-text("Accept All Cookies")',
  'button:has-text("Allow all")',
  'button:has-text("Accept cookies")',
  'button:has-text("I agree")',
  'button:has-text("Agree")',
  'button:has-text("Got it")',
  'button:has-text("Accept")',
  '[aria-label*="accept" i]',
  '[data-testid*="accept" i]',
];

async function dismissConsent(page) {
  // banners often appear a beat after load — try twice
  for (let round = 0; round < 2; round++) {
    for (const sel of CONSENT_SELECTORS) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 500 })) {
          await el.click({ timeout: 1500, force: true });
          await page.waitForTimeout(500);
          break;
        }
      } catch {}
    }
    await page.waitForTimeout(900);
  }
}

// Catch-all: hide cookie banners, chat widgets and floating overlays that
// survived the click. Purely visual — we never alter the page's real content.
const HIDE_CSS = `
  [id*="onetrust" i], [class*="onetrust" i], #ot-sdk-btn-floating,
  [id*="cookie" i], [class*="cookie" i],
  [id*="consent" i], [class*="consent" i],
  [id*="gdpr" i], [class*="gdpr" i],
  [aria-label*="cookie" i], [aria-label*="consent" i],
  #intercom-container, .intercom-lightweight-app, [class*="intercom" i],
  #drift-widget, [class*="drift-" i], [id*="hubspot-messages" i],
  [class*="chat-widget" i], [id*="chat-widget" i], [class*="livechat" i],
  [id*="crisp-client" i], [class*="crisp-client" i],
  [class*="cky-" i], [id*="cky-" i], [class*="termly" i],
  [class*="banner-bottom" i], [class*="sticky-bottom" i] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
  }
  html { scroll-behavior: auto !important; }
`;

async function shoot(browser, name, url) {
  const slug = slugifyTool(name);
  const out = resolve(OUT, `${slug}.jpg`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2200);
    await dismissConsent(page);
    // let lazy content settle
    try {
      await page.waitForLoadState("networkidle", { timeout: 8000 });
    } catch {}
    // nuke any surviving overlays, then let the layout settle
    await page.addStyleTag({ content: HIDE_CSS }).catch(() => {});
    await page.waitForTimeout(1200);

    const buf = await page.screenshot({ type: "png" });
    await sharp(buf)
      .resize(1200, 750, { fit: "cover", position: "top" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(out);

    await ctx.close();
    return { name, slug, url, ok: true, file: `/images/tools/${slug}.jpg` };
  } catch (e) {
    await ctx.close().catch(() => {});
    return { name, slug, url, ok: false, error: String(e).split("\n")[0].slice(0, 140) };
  }
}

async function main() {
  const testMode = process.argv.includes("--test");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  await mkdir(OUT, { recursive: true });

  let entries = Object.entries(TOOLS);
  if (onlyArg) {
    const names = new Set(onlyArg.slice("--only=".length).split(",").map((s) => s.trim()));
    entries = entries.filter(([n]) => names.has(n));
  }
  if (testMode) entries = entries.slice(0, 5);

  console.log(`Shooting ${entries.length} tool homepage(s)...\n`);
  const browser = await chromium.launch();
  const results = [];

  // small concurrency to stay polite
  const CONCURRENCY = 3;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const out = await Promise.all(batch.map(([n, u]) => shoot(browser, n, u)));
    for (const r of out) {
      console.log(r.ok ? `  ✓ ${r.name}` : `  ✗ ${r.name} — ${r.error}`);
      results.push(r);
    }
  }

  await browser.close();

  const ok = results.filter((r) => r.ok);
  console.log(`\nDone: ${ok.length}/${results.length} captured.`);
  if (!testMode) await writeFile(REPORT, JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) console.log("Failed:", failed.map((f) => f.name).join(", "));
}

if (process.argv[1] && process.argv[1].endsWith("shoot-tools.mjs")) main();
