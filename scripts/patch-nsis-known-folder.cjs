const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const EXPECTED = '401ed51f541f6bfdbf8f855b026ff6708f20ed2c67569f7b89e5f6942e1e8558';

function patchTemplate(version, bytes) {
  if (version !== '26.8.1') throw new Error(`Unsupported app-builder-lib version: ${version}`);
  const hash = crypto.createHash('sha256').update(bytes).digest('hex');
  if (hash !== EXPECTED) throw new Error(`Unexpected original multiUser.nsh bytes: ${hash}`);
  const original = bytes.toString('utf8');
  const start = original.indexOf('      System::Store S\n');
  const end = original.indexOf('      System::Store L\n', start) + '      System::Store L\n'.length;
  if (start < 0 || end <= start || original.indexOf('      System::Store S\n', start + 1) !== -1) throw new Error('Expected unique known-folder block missing');
  const patched = original.slice(0, start) + '      # Diagnostic #8536: retain the LocalAppData\\Programs fallback above.\n' + original.slice(end);
  if (!patched.includes('ReadRegStr $perUserInstallationFolder HKCU') || !patched.includes('!insertmacro GetDParameter $R0')) throw new Error('Install-path compatibility guards missing');
  return patched;
}

if (require.main === module) {
  const root = path.resolve('node_modules/app-builder-lib');
  const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  const file = path.join(root, 'templates/nsis/multiUser.nsh');
  const before = fs.readFileSync(file);
  if (version !== '26.8.1') throw new Error(`Unsupported app-builder-lib version: ${version}`);
  if (crypto.createHash('sha256').update(before).digest('hex') === 'cd2d6272db86a7ec1359ae0f9549440c6cab77544fb51169e1676904e2133d9b') {
    console.log('Verified known NSIS per-user fallback patch already applied');
    process.exit(0);
  }
  const after = patchTemplate(version, before);
  fs.mkdirSync('evidence', { recursive: true });
  fs.writeFileSync('evidence/multiUser-original.nsh', before);
  fs.writeFileSync(file, after);
  fs.writeFileSync('evidence/nsis-patch.json', JSON.stringify({ version, originalSha256: EXPECTED, patchedSha256: crypto.createHash('sha256').update(after).digest('hex'), limitation: 'Fresh installs use LocalAppData/Programs rather than relocated FOLDERID_UserProgramFiles. Existing registry paths and /D overrides are preserved.' }, null, 2));
}
module.exports = { patchTemplate };
