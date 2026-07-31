import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rendererUrl = process.env.ELECTRON_RENDERER_URL;
const productName = process.env.DHEPIL_DESKTOP_PRODUCT_NAME;

interface DesktopPackageMetadata {
  dhepilDesktopAppId?: unknown;
}

function resolveDesktopAppId(): string | undefined {
  if (process.env.DHEPIL_DESKTOP_APP_ID) {
    return process.env.DHEPIL_DESKTOP_APP_ID;
  }

  try {
    const packagePath = path.join(app.getAppPath(), 'package.json');
    const metadata = JSON.parse(readFileSync(packagePath, 'utf8')) as DesktopPackageMetadata;
    return typeof metadata.dhepilDesktopAppId === 'string'
      ? metadata.dhepilDesktopAppId
      : undefined;
  } catch {
    return undefined;
  }
}

const desktopAppId = resolveDesktopAppId();
if (productName) {
  app.setName(productName);
}
if (desktopAppId) {
  app.setPath('userData', path.join(app.getPath('appData'), 'Dhepil Suite Apps', desktopAppId));
}

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#071426',
    title: productName,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    console.error(`[electron] Preload failed: ${preloadPath}`, error);
  });

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
    if (process.env.ELECTRON_OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('open-folder', async (_event, directory: unknown) => {
  if (typeof directory !== 'string' || !path.isAbsolute(directory)) {
    throw new Error('Folder path must be absolute.');
  }
  await shell.openPath(directory);
});
