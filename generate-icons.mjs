import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE = '/home/z/my-project/public/icon-source.png';
const RES_BASE = '/home/z/my-project/android/app/src/main/res';

// Android mipmap sizes for ic_launcher and ic_launcher_round
const MIPMAP_SIZES = {
  'mdpi': 48,
  'hdpi': 72,
  'xhdpi': 96,
  'xxhdpi': 144,
  'xxxhdpi': 192,
};

// Android mipmap sizes for ic_launcher_foreground
const FOREGROUND_SIZES = {
  'mdpi': 108,
  'hdpi': 162,
  'xhdpi': 216,
  'xxhdpi': 324,
  'xxxhdpi': 432,
};

// Splash screen sizes for various density/orientation combos
const SPLASH_SIZES = {
  'drawable-port-mdpi': { w: 480, h: 800 },
  'drawable-port-hdpi': { w: 720, h: 1280 },
  'drawable-port-xhdpi': { w: 960, h: 1704 },
  'drawable-port-xxhdpi': { w: 1440, h: 2560 },
  'drawable-port-xxxhdpi': { w: 1920, h: 3200 },
  'drawable-land-mdpi': { w: 800, h: 480 },
  'drawable-land-hdpi': { w: 1280, h: 720 },
  'drawable-land-xhdpi': { w: 1704, h: 960 },
  'drawable-land-xxhdpi': { w: 2560, h: 1440 },
  'drawable-land-xxxhdpi': { w: 3200, h: 1920 },
};

async function generateMipmapIcons() {
  console.log('📱 Generating mipmap ic_launcher and ic_launcher_round icons...');

  for (const [density, size] of Object.entries(MIPMAP_SIZES)) {
    const dir = path.join(RES_BASE, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png (the full icon with background)
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`  ✓ mipmap-${density}/ic_launcher.png (${size}x${size})`);

    // ic_launcher_round.png (same icon, Android will clip to circle)
    await sharp(SOURCE)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`  ✓ mipmap-${density}/ic_launcher_round.png (${size}x${size})`);
  }
}

async function generateForegroundIcons() {
  console.log('🖼️  Generating mipmap ic_launcher_foreground icons...');

  for (const [density, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = path.join(RES_BASE, `mipmap-${density}`);
    fs.mkdirSync(dir, { recursive: true });

    // For foreground: resize the full icon into the center of a transparent canvas
    // The foreground icon should have the icon centered with some padding
    // Android expects the foreground to be 108x108dp canvas with the actual icon in the center 72x72dp area
    // So we resize the source to ~66% of the foreground size and center it
    const iconSize = Math.round(size * 0.66);
    const offset = Math.round((size - iconSize) / 2);

    // Resize the icon to the inner size
    const resizedIcon = await sharp(SOURCE)
      .resize(iconSize, iconSize, { fit: 'cover' })
      .png()
      .toBuffer();

    // Create a transparent canvas and composite the icon in the center
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{
        input: resizedIcon,
        left: offset,
        top: offset,
      }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ mipmap-${density}/ic_launcher_foreground.png (${size}x${size})`);
  }
}

async function generateSplashScreens() {
  console.log('🎨 Generating splash screen images with emerald green background...');

  const BG_COLOR = { r: 5, g: 150, b: 105 }; // #059669

  // Also create the generic drawable/splash.png (default size)
  await generateSplashImage(1080, 1920, BG_COLOR, path.join(RES_BASE, 'drawable', 'splash.png'));
  console.log('  ✓ drawable/splash.png (1080x1920)');

  // Density-specific splash screens
  for (const [folder, dims] of Object.entries(SPLASH_SIZES)) {
    const dir = path.join(RES_BASE, folder);
    fs.mkdirSync(dir, { recursive: true });

    await generateSplashImage(dims.w, dims.h, BG_COLOR, path.join(dir, 'splash.png'));
    console.log(`  ✓ ${folder}/splash.png (${dims.w}x${dims.h})`);
  }
}

async function generateSplashImage(width, height, bgColor, outputPath) {
  // Create a solid emerald green background
  // Add a subtle centered icon in the middle (scaled to about 30% of the shorter dimension)
  const iconSize = Math.round(Math.min(width, height) * 0.25);
  const offsetX = Math.round((width - iconSize) / 2);
  const offsetY = Math.round((height - iconSize) / 2);

  const resizedIcon = await sharp(SOURCE)
    .resize(iconSize, iconSize, { fit: 'cover' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { ...bgColor, alpha: 1 },
    },
  })
    .composite([{
      input: resizedIcon,
      left: offsetX,
      top: offsetY,
    }])
    .png()
    .toFile(outputPath);
}

async function updateLauncherBackgroundXml() {
  console.log('📝 Updating ic_launcher_background.xml...');

  const xmlPath = path.join(RES_BASE, 'drawable', 'ic_launcher_background.xml');
  const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#059669</color>
</resources>
`;
  fs.mkdirSync(path.dirname(xmlPath), { recursive: true });
  fs.writeFileSync(xmlPath, xmlContent);
  console.log('  ✓ drawable/ic_launcher_background.xml updated with #059669');

  // Also update the values version
  const valuesXmlPath = path.join(RES_BASE, 'values', 'ic_launcher_background.xml');
  fs.mkdirSync(path.dirname(valuesXmlPath), { recursive: true });
  fs.writeFileSync(valuesXmlPath, xmlContent);
  console.log('  ✓ values/ic_launcher_background.xml updated with #059669');
}

async function main() {
  console.log('🚀 InvoicePro Icon Generator\n');

  if (!fs.existsSync(SOURCE)) {
    console.error(`❌ Source icon not found: ${SOURCE}`);
    process.exit(1);
  }

  // Get source info
  const metadata = await sharp(SOURCE).metadata();
  console.log(`📐 Source: ${metadata.width}x${metadata.height} ${metadata.format}\n`);

  await generateMipmapIcons();
  console.log('');
  await generateForegroundIcons();
  console.log('');
  await generateSplashScreens();
  console.log('');
  await updateLauncherBackgroundXml();

  console.log('\n✅ All icons and splash screens generated successfully!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
