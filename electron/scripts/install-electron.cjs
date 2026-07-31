/**
 * Ensures the shared Electron binary is available. A manually downloaded zip
 * in ELECTRON_LOCAL_SEED_DIR wins; otherwise curl provides resume and retries.
 */
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const electronPackagePath = require.resolve('electron/package.json', {
  paths: [__dirname],
});
const electronDir = path.dirname(electronPackagePath);
const electronPackage = require(electronPackagePath);
const version = electronPackage.version;

const mirror = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
const customDirectory = process.env.ELECTRON_CUSTOM_DIR || version;
const localSeedDirectory = process.env.ELECTRON_LOCAL_SEED_DIR || 'D:\\ARTIFACT\\electron-cache';

function platformInfo() {
  const platform = process.env.ELECTRON_INSTALL_PLATFORM || process.platform;
  const arch = process.env.ELECTRON_INSTALL_ARCH || process.arch;
  const executable =
    platform === 'win32'
      ? 'electron.exe'
      : platform === 'darwin'
        ? 'Electron.app/Contents/MacOS/Electron'
        : 'electron';

  return { platform, arch, executable };
}

function isInstalled(executable) {
  try {
    const installedVersion = fs
      .readFileSync(path.join(electronDir, 'dist', 'version'), 'utf8')
      .trim()
      .replace(/^v/, '');

    return (
      installedVersion === version && fs.existsSync(path.join(electronDir, 'dist', executable))
    );
  } catch {
    return false;
  }
}

function downloadWithCurl(url, destination) {
  console.log(`[install-electron] Downloading with resume support: ${url}`);
  execFileSync(
    'curl',
    [
      '-L',
      '-C',
      '-',
      '--retry',
      '15',
      '--retry-delay',
      '3',
      '--retry-all-errors',
      '--connect-timeout',
      '20',
      '-o',
      destination,
      url,
    ],
    { stdio: 'inherit' },
  );
}

function install() {
  const { platform, arch, executable } = platformInfo();
  if (isInstalled(executable)) {
    console.log('[install-electron] Shared Electron binary is already installed.');
    return;
  }

  const archiveName = `electron-v${version}-${platform}-${arch}.zip`;
  const archivePath = path.join(os.tmpdir(), archiveName);
  const localSeedPath = path.join(localSeedDirectory, archiveName);

  if (fs.existsSync(localSeedPath)) {
    console.log(`[install-electron] Using local seed: ${localSeedPath}`);
    fs.copyFileSync(localSeedPath, archivePath);
  } else {
    const downloadUrl = `${mirror}${customDirectory}/${archiveName}`;
    try {
      downloadWithCurl(downloadUrl, archivePath);
    } catch (error) {
      console.error('[install-electron] curl failed; falling back to Electron installer.');
      console.error(error instanceof Error ? error.message : String(error));
      execFileSync(process.execPath, [path.join(electronDir, 'install.js')], {
        stdio: 'inherit',
      });
      return;
    }
  }

  const distDirectory = path.join(electronDir, 'dist');
  fs.mkdirSync(distDirectory, { recursive: true });

  console.log('[install-electron] Extracting shared Electron binary...');
  execFileSync('tar', ['-xf', archivePath, '-C', distDirectory], {
    stdio: 'inherit',
  });

  fs.writeFileSync(path.join(distDirectory, 'version'), `v${version}`);
  fs.writeFileSync(path.join(electronDir, 'path.txt'), executable);
  console.log('[install-electron] Done.');
}

install();
