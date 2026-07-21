/**
 * PWA Icon Generator for InvoicePro
 * Uses sharp to convert SVG icons to PNG at various sizes.
 *
 * Design: Emerald (#059669) rounded square background with a white
 *         document/invoice icon in the center.
 *         - Maskable variants keep all content within the inner 80% safe zone.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const ICONS_DIR = path.join(__dirname, "..", "public", "icons");

// Ensure output directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// ── Design constants ──────────────────────────────────────────────────────
const EMERALD = "#059669";
const WHITE = "#ffffff";

/**
 * Build an SVG string for the InvoicePro icon.
 *
 * @param {number} size   - Canvas size in px (the PNG output size)
 * @param {boolean} maskable - If true, central content is drawn within 80% safe zone
 * @returns {string} SVG markup
 */
function buildSvg(size, maskable = false) {
  // Padding: for maskable icons we keep content within inner 80% (10% padding each side)
  const pad = maskable ? size * 0.1 : 0;
  const contentSize = size - pad * 2;

  // Rounded-rect background covers full canvas
  const cornerRadius = size * 0.16;

  // Scale factors relative to the content area
  const cx = pad + contentSize / 2; // center X of content area
  const cy = pad + contentSize / 2; // center Y of content area

  // Document icon dimensions (within content area)
  const docW = contentSize * 0.38;
  const docH = contentSize * 0.52;
  const docX = cx - docW / 2;
  const docY = cy - docH / 2;
  const foldSize = docW * 0.3;
  const docRadius = docW * 0.06;

  // Line positions on the document
  const lineStartX = docX + docW * 0.18;
  const lineEndX = docX + docW * 0.82;
  const line1Y = docY + docH * 0.35;
  const line2Y = docY + docH * 0.47;
  const line3Y = docY + docH * 0.59;
  const line4Y = docY + docH * 0.71;

  // Dollar sign / currency symbol position
  const symbolX = cx;
  const symbolY = docY + docH * 0.22;
  const symbolSize = contentSize * 0.12;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="bg-clip">
      <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}"/>
    </clipPath>
  </defs>

  <!-- Emerald background rounded square -->
  <rect x="0" y="0" width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${EMERALD}"/>

  <!-- Document body -->
  <g>
    <!-- Main document rectangle -->
    <rect x="${docX}" y="${docY}" width="${docW}" height="${docH}" rx="${docRadius}" ry="${docRadius}" fill="${WHITE}"/>

    <!-- Folded corner (top-right) -->
    <path d="M${docX + docW - foldSize} ${docY}
             L${docX + docW} ${docY + foldSize}
             L${docX + docW - foldSize} ${docY + foldSize}
             Z" fill="${EMERALD}" opacity="0.25"/>
    <line x1="${docX + docW - foldSize}" y1="${docY}" x2="${docX + docW - foldSize}" y2="${docY + foldSize}" stroke="${EMERALD}" stroke-width="${size * 0.004}" opacity="0.15"/>
    <line x1="${docX + docW - foldSize}" y1="${docY + foldSize}" x2="${docX + docW}" y2="${docY + foldSize}" stroke="${EMERALD}" stroke-width="${size * 0.004}" opacity="0.15"/>

    <!-- Currency symbol ($) on the document -->
    <text x="${symbolX}" y="${symbolY}" text-anchor="middle" dominant-baseline="central"
          font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${symbolSize}" fill="${EMERALD}">$</text>

    <!-- Text lines on document -->
    <line x1="${lineStartX}" y1="${line1Y}" x2="${lineEndX}" y2="${line1Y}" stroke="${EMERALD}" stroke-width="${size * 0.012}" stroke-linecap="round" opacity="0.35"/>
    <line x1="${lineStartX}" y1="${line2Y}" x2="${lineEndX * 0.9}" y2="${line2Y}" stroke="${EMERALD}" stroke-width="${size * 0.010}" stroke-linecap="round" opacity="0.25"/>
    <line x1="${lineStartX}" y1="${line3Y}" x2="${lineEndX * 0.85}" y2="${line3Y}" stroke="${EMERALD}" stroke-width="${size * 0.010}" stroke-linecap="round" opacity="0.25"/>
    <line x1="${lineStartX}" y1="${line4Y}" x2="${lineEndX * 0.7}" y2="${line4Y}" stroke="${EMERALD}" stroke-width="${size * 0.010}" stroke-linecap="round" opacity="0.25"/>
  </g>
</svg>`;
}

// ── Icon definitions ─────────────────────────────────────────────────────
const icons = [
  { name: "icon-192x192.png",         size: 192, maskable: false },
  { name: "icon-512x512.png",         size: 512, maskable: false },
  { name: "icon-maskable-192x192.png", size: 192, maskable: true  },
  { name: "icon-maskable-512x512.png", size: 512, maskable: true  },
  { name: "apple-touch-icon.png",      size: 180, maskable: false },
];

async function main() {
  console.log("Generating InvoicePro PWA icons...\n");

  for (const icon of icons) {
    const svg = buildSvg(icon.size, icon.maskable);
    const outPath = path.join(ICONS_DIR, icon.name);

    await sharp(Buffer.from(svg))
      .resize(icon.size, icon.size)
      .png()
      .toFile(outPath);

    const stats = fs.statSync(outPath);
    console.log(`  ✓ ${icon.name}  (${icon.size}x${icon.size}${icon.maskable ? " maskable" : ""})  ${Math.round(stats.size / 1024)} KB`);
  }

  console.log("\nAll icons generated successfully!");
}

main().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
