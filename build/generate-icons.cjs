#!/usr/bin/env node
/**
 * build/generate-icons.cjs  —  Milestone 17
 *
 * Generates all application icons required by electron-builder from the
 * CivicResolve AI source SVG (client/public/favicon.svg).
 *
 * Prerequisites (install ONE of these before running):
 *   npm install --save-dev sharp        (fastest, no native deps via WASM)
 *   OR: brew install inkscape           (inkscape CLI, macOS/Linux)
 *   OR: brew install librsvg            (rsvg-convert, macOS/Linux)
 *
 * Usage:
 *   node build/generate-icons.cjs
 *
 * Outputs:
 *   build/icons/16x16.png
 *   build/icons/32x32.png
 *   build/icons/48x48.png
 *   build/icons/64x64.png
 *   build/icons/128x128.png
 *   build/icons/256x256.png
 *   build/icons/512x512.png
 *   build/icons/1024x1024.png
 *   build/icon.icns              (macOS, generated from 1024x1024.png via iconutil)
 *   build/icon.ico               (Windows, multi-size ICO via sharp or ImageMagick)
 *
 * electron-builder automatically picks up:
 *   mac  → build/icon.icns (or build/icons/*.png as fallback)
 *   win  → build/icon.ico
 *   linux→ build/icons/512x512.png
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { execSync, spawnSync } = require('child_process');

const ROOT    = path.resolve(__dirname, '..');
const SVG_SRC = path.join(ROOT, 'client/public/favicon.svg');
const ICONS   = path.join(__dirname, 'icons');
const BUILD   = __dirname;

const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function which(bin) {
  const r = spawnSync('which', [bin], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function log(msg) { console.log(`[icons] ${msg}`); }
function warn(msg) { console.warn(`[icons] ⚠  ${msg}`); }
function die(msg)  { console.error(`[icons] ✗  ${msg}`); process.exit(1); }

// ─── Renderer selection ───────────────────────────────────────────────────────

async function trySharp() {
  try {
    const sharp = require('sharp');
    log('Using sharp to rasterise SVG');
    const svgBuf = fs.readFileSync(SVG_SRC);

    ensureDir(ICONS);
    for (const size of SIZES) {
      const out = path.join(ICONS, `${size}x${size}.png`);
      await sharp(svgBuf).resize(size, size).png().toFile(out);
      log(`  → ${out}`);
    }

    // Windows ICO (multi-size)
    const icoSizes = [16, 32, 48, 64, 256];
    const icoInputs = await Promise.all(
      icoSizes.map(s => sharp(svgBuf).resize(s, s).png().toBuffer())
    );
    // sharp doesn't write ICO natively; use ImageMagick if available
    if (which('convert')) {
      const tmpFiles = icoSizes.map((s, i) => {
        const tmp = path.join(ICONS, `_tmp_${s}.png`);
        fs.writeFileSync(tmp, icoInputs[i]);
        return tmp;
      });
      execSync(`convert ${tmpFiles.join(' ')} ${path.join(BUILD, 'icon.ico')}`);
      tmpFiles.forEach(f => fs.unlinkSync(f));
      log(`  → ${path.join(BUILD, 'icon.ico')} (via ImageMagick)`);
    } else {
      // Fallback: copy 256x256 as .ico (single-size, good enough for dev)
      fs.copyFileSync(path.join(ICONS, '256x256.png'), path.join(BUILD, 'icon.ico'));
      warn('ImageMagick not found — single-size icon.ico written (install ImageMagick for proper multi-size ICO)');
    }

    return true;
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') return false;
    throw e;
  }
}

function tryInkscape() {
  const inkscape = which('inkscape') || which('inkscape-bin');
  if (!inkscape) return false;
  log(`Using Inkscape: ${inkscape}`);

  ensureDir(ICONS);
  for (const size of SIZES) {
    const out = path.join(ICONS, `${size}x${size}.png`);
    execSync(`"${inkscape}" --export-type=png --export-width=${size} --export-height=${size} --export-filename="${out}" "${SVG_SRC}"`, { stdio: 'pipe' });
    log(`  → ${out}`);
  }
  return true;
}

function tryRsvg() {
  const rsvg = which('rsvg-convert');
  if (!rsvg) return false;
  log(`Using rsvg-convert: ${rsvg}`);

  ensureDir(ICONS);
  for (const size of SIZES) {
    const out = path.join(ICONS, `${size}x${size}.png`);
    execSync(`rsvg-convert -w ${size} -h ${size} -o "${out}" "${SVG_SRC}"`, { stdio: 'pipe' });
    log(`  → ${out}`);
  }
  return true;
}

function buildIcns() {
  // macOS only: iconutil from a correctly structured iconset
  if (process.platform !== 'darwin') {
    warn('iconutil is macOS-only — build/icon.icns not generated on this platform');
    return;
  }

  const iconsetDir = path.join(BUILD, 'icon.iconset');
  ensureDir(iconsetDir);

  // Required names for iconutil
  const mapping = [
    ['icon_16x16.png',      16],
    ['icon_16x16@2x.png',   32],
    ['icon_32x32.png',      32],
    ['icon_32x32@2x.png',   64],
    ['icon_128x128.png',   128],
    ['icon_128x128@2x.png',256],
    ['icon_256x256.png',   256],
    ['icon_256x256@2x.png',512],
    ['icon_512x512.png',   512],
    ['icon_512x512@2x.png',1024],
  ];

  for (const [name, size] of mapping) {
    const src = path.join(ICONS, `${size}x${size}.png`);
    if (!fs.existsSync(src)) { warn(`Missing ${src} — skipping icns`); return; }
    fs.copyFileSync(src, path.join(iconsetDir, name));
  }

  execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(BUILD, 'icon.icns')}"`, { stdio: 'inherit' });
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  log(`  → ${path.join(BUILD, 'icon.icns')}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(SVG_SRC)) {
    die(`Source SVG not found: ${SVG_SRC}`);
  }

  log(`Source: ${SVG_SRC}`);

  const rendered = (await trySharp()) || tryInkscape() || tryRsvg();

  if (!rendered) {
    die(
      'No SVG renderer found.\n' +
      '  Install one of:\n' +
      '    npm install --save-dev sharp\n' +
      '    brew install inkscape\n' +
      '    brew install librsvg\n' +
      '  Then re-run: node build/generate-icons.cjs'
    );
  }

  buildIcns();

  // Confirm expected files exist
  const required = [
    path.join(ICONS, '512x512.png'),
    path.join(ICONS, '256x256.png'),
  ];
  const missing = required.filter(f => !fs.existsSync(f));
  if (missing.length) {
    warn(`Some expected icon files are missing: ${missing.join(', ')}`);
  } else {
    log('✓ All required PNG icons generated successfully');
    log('Next steps:');
    log('  • On macOS: build/icon.icns is ready for packaging');
    log('  • On any platform: build/icon.ico is ready for Windows builds');
    log('  • Run: npm run desktop:build  to package the app');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
