const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'out');
const nextAppDir = path.join(rootDir, '.next', 'server', 'app');
const nextStaticDir = path.join(rootDir, '.next', 'static');
const publicDir = path.join(rootDir, 'public');
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));

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

function writeBuildInfo() {
  ensureDir(publicDir);
  const fallbackHostedUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://package-report.vercel.app';

  const buildInfo = {
    version: packageJson.version || '0.1.0',
    buildCommit:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.RENDER_GIT_COMMIT ||
      process.env.COMMIT_SHA ||
      '',
    buildDate: new Date().toISOString(),
    minimumVersion: process.env.NEXT_PUBLIC_MINIMUM_APP_VERSION || packageJson.version || '0.1.0',
    forceUpdate: /^true$/i.test(process.env.NEXT_PUBLIC_FORCE_APP_UPDATE || ''),
    message:
      process.env.NEXT_PUBLIC_UPDATE_MESSAGE ||
      'A new SMART MANAGE update is available. Tap update to install the latest build.',
    releaseNotesUrl: process.env.NEXT_PUBLIC_RELEASE_NOTES_URL || fallbackHostedUrl,
    downloads: {
      desktop: process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || process.env.NEXT_PUBLIC_APP_UPDATE_URL || fallbackHostedUrl,
      android: process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || process.env.NEXT_PUBLIC_APP_UPDATE_URL || fallbackHostedUrl,
      ios: process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL || process.env.NEXT_PUBLIC_APP_UPDATE_URL || fallbackHostedUrl,
      web: process.env.NEXT_PUBLIC_WEB_UPDATE_URL || fallbackHostedUrl,
    },
  };

  fs.writeFileSync(path.join(publicDir, 'build-info.json'), `${JSON.stringify(buildInfo, null, 2)}\n`);
}

function main() {
  if (!exists(nextAppDir)) {
    console.error('[prepare-capacitor-webdir] Missing .next/server/app. Run `next build` first.');
    process.exit(1);
  }

  writeBuildInfo();
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
