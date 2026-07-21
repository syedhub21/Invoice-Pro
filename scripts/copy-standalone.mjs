#!/usr/bin/env node
/**
 * Copy standalone build artifacts for Capacitor APK packaging.
 *
 * This script runs AFTER `next build` and only when building for the Android APK.
 * It's a no-op when `output: "export"` is used (Vercel deployment), because
 * standalone mode requires `output: "standalone"` which is NOT our current config.
 *
 * For Capacitor, we use `output: "export"` → produces `out/` folder directly.
 * The `cap sync` command then copies `out/` into the Android project.
 *
 * This script exists for backwards compatibility with any build pipelines
 * that still reference the standalone build flow.
 */

import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const nextDir = join(root, '.next');
const standaloneDir = join(nextDir, 'standalone');
const staticDir = join(nextDir, 'static');
const publicDir = join(root, 'public');
const outDir = join(root, 'out');

// If using output: "export", the out/ folder is already complete.
// No standalone copy needed - just verify out/ exists.
if (existsSync(outDir)) {
  console.log('✓ Static export detected (out/ folder exists)');
  console.log('✓ No standalone copy needed - out/ is ready for `cap sync`');
  process.exit(0);
}

// Standalone mode (output: "standalone") - copy static + public into standalone
if (!existsSync(standaloneDir)) {
  console.log('⚠ Neither out/ nor .next/standalone/ found - was `next build` run?');
  process.exit(0);
}

console.log('→ Copying .next/static → .next/standalone/.next/static');
mkdirSync(join(standaloneDir, '.next'), { recursive: true });
if (existsSync(staticDir)) {
  cpSync(staticDir, join(standaloneDir, '.next', 'static'), { recursive: true });
}

console.log('→ Copying public → .next/standalone/public');
if (existsSync(publicDir)) {
  cpSync(publicDir, join(standaloneDir, 'public'), { recursive: true });
}

console.log('✓ Standalone build artifacts ready');
