const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const nextAppDir = path.join(rootDir, '.next', 'server', 'app');
const nextStaticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');

function exists(p) {
  return fs.existsSync(p);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyRecursive(src, dest) {
  if (!exists(src)) return;

  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

function cleanDir(dir) {
  if (exists(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  ensureDir(dir);
}

function main() {
  if (!exists(nextAppDir)) {
    console.error('[prepare-capacitor-webdir] Missing .next/server/app. Run `next build` first.');
    process.exit(1);
  }

  cleanDir(outDir);

  // 1) Copy prerendered app HTML/data output.
  copyRecursive(nextAppDir, outDir);

  // 2) Copy Next static chunks so /_next/static/* resolves in WebView.
  copyRecursive(nextStaticDir, path.join(outDir, '_next', 'static'));

  // 3) Copy public assets (icons, SW, etc).
  copyRecursive(publicDir, outDir);

  const indexFile = path.join(outDir, 'index.html');
  if (!exists(indexFile)) {
    console.error('[prepare-capacitor-webdir] Failed: out/index.html was not generated.');
    process.exit(1);
  }

  console.log('[prepare-capacitor-webdir] Generated web assets in out/.');
}

main();
