/**
 * Remove Bộ Công Thương (online.gov.vn) badge from static HTML files.
 * Usage: node scripts/remove-bct-badge.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SCAN_DIRS = ['public', 'legacy-html', 'betongphuongbac.com'];

/** Anchor linking to online.gov.vn (with optional nested img). */
const BCT_ANCHOR_RE =
  /<a\b[^>]*online\.gov\.vn[^>]*>[\s\S]*?<\/a>/gi;

function walkHtmlFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git') continue;
      walkHtmlFiles(full, out);
    } else if (/\.html?$/i.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

let updated = 0;
let scanned = 0;

for (const rel of SCAN_DIRS) {
  const base = path.join(ROOT, rel);
  for (const file of walkHtmlFiles(base)) {
    scanned++;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.includes('online.gov.vn') && !raw.includes('2171da-thong-bao-bct')) {
      continue;
    }
    const next = raw.replace(BCT_ANCHOR_RE, '');
    if (next !== raw) {
      fs.writeFileSync(file, next, 'utf8');
      updated++;
      console.log('updated:', path.relative(ROOT, file));
    }
  }
}

console.log(`Done. Scanned ${scanned} HTML files, updated ${updated}.`);
