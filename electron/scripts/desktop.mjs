#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { access, cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const electronDirectory = path.resolve(scriptDirectory, '..');
const repositoryDirectory = path.resolve(electronDirectory, '..');
const appsDirectory = path.join(repositoryDirectory, 'apps');
const releaseRoot = path.join(electronDirectory, 'release');
const runtimeOutput = path.join(electronDirectory, 'dist');
const appIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const desktopAppIdPattern = /^[a-zA-Z0-9]+(?:[._-][a-zA-Z0-9]+)+$/;
const unsafeWindowsNameCharacters = new Set('<>:"/\\|?*');

function usage() {
  console.log(`Dhepil Suite desktop toolchain

Usage:
  npm run desktop:dev -- <app-id>
  npm run desktop:build -- <app-id> [--dir]
  npm run desktop:build:all -- [--dir]

App-local aliases:
  npm run desktop:dev --workspace @dhepil-suite/<app-id>
  npm run desktop:build --workspace @dhepil-suite/<app-id>`);
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function requiredString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function containsUnsafeWindowsNameCharacter(value) {
  return [...value].some(
    (character) => unsafeWindowsNameCharacters.has(character) || character.codePointAt(0) < 32,
  );
}

async function readJson(filePath, label) {
  let raw;
  try {
    raw = await readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${filePath}`, { cause: error });
  }

  try {
    const parsed = JSON.parse(raw);
    const parsedRecord = record(parsed);
    if (!parsedRecord) {
      throw new Error('root value is not an object');
    }
    return parsedRecord;
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}`, { cause: error });
  }
}

function assertManagedPath(baseDirectory, targetPath) {
  const relativePath = path.relative(baseDirectory, targetPath);
  if (
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath === '..' ||
    relativePath.startsWith(`..${path.sep}`)
  ) {
    throw new Error(`Refusing to modify unmanaged path: ${targetPath}`);
  }
}

async function resetManagedDirectory(baseDirectory, targetPath) {
  assertManagedPath(baseDirectory, targetPath);
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });
}

function electronEnvironment(overrides = {}) {
  const environment = { ...process.env, ...overrides };
  delete environment.ELECTRON_RUN_AS_NODE;
  return environment;
}

function run(command, argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: repositoryDirectory,
      env: electronEnvironment(),
      stdio: 'inherit',
      ...options,
    });

    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${path.basename(command)} failed (${signal ? `signal ${signal}` : `exit ${code}`}).`,
        ),
      );
    });
  });
}

async function loadDesktopApp(appId) {
  if (!appIdPattern.test(appId)) {
    throw new Error('App id may only contain lowercase letters, numbers, and hyphens.');
  }

  const appDirectory = path.resolve(appsDirectory, appId);
  assertManagedPath(appsDirectory, appDirectory);
  await access(appDirectory);

  const manifestPath = path.join(appDirectory, 'app.manifest.json');
  const packagePath = path.join(appDirectory, 'package.json');
  const [manifest, packageManifest] = await Promise.all([
    readJson(manifestPath, 'app.manifest.json'),
    readJson(packagePath, 'package.json'),
  ]);

  if (manifest.id !== appId) {
    throw new Error(`Manifest id must equal its folder name: ${appId}.`);
  }
  if (manifest.runtime !== 'vite') {
    throw new Error(`Desktop build only supports the Vite runtime: ${appId}.`);
  }

  const desktop = record(manifest.desktop);
  if (!desktop || desktop.enabled !== true) {
    throw new Error(`Desktop is not enabled in apps/${appId}/app.manifest.json.`);
  }

  const desktopScript = requiredString(desktop.script, 'desktop.script');
  const scripts = record(packageManifest.scripts);
  if (!scripts || typeof scripts[desktopScript] !== 'string') {
    throw new Error(`package.json must define the "${desktopScript}" script.`);
  }

  requiredString(packageManifest.name, 'package.name');
  const version = requiredString(packageManifest.version, 'package.version');
  const productName =
    typeof desktop.productName === 'string' && desktop.productName.trim()
      ? desktop.productName.trim()
      : requiredString(manifest.name, 'manifest.name');
  const desktopAppId =
    typeof desktop.appId === 'string' && desktop.appId.trim()
      ? desktop.appId.trim()
      : `com.dhepil.${appId.replaceAll('-', '.')}`;
  if (!desktopAppIdPattern.test(desktopAppId)) {
    throw new Error(`desktop.appId is not a valid reverse-domain id: ${desktopAppId}.`);
  }
  if (containsUnsafeWindowsNameCharacter(productName)) {
    throw new Error('desktop.productName contains a character forbidden by Windows.');
  }

  let iconPath = path.join(electronDirectory, 'icon.png');
  if (desktop.icon !== undefined) {
    const relativeIcon = requiredString(desktop.icon, 'desktop.icon');
    const appIcon = path.resolve(appDirectory, relativeIcon);
    assertManagedPath(appDirectory, appIcon);
    await access(appIcon);
    iconPath = appIcon;
  } else {
    await access(iconPath);
  }

  return {
    id: appId,
    directory: appDirectory,
    version,
    productName,
    desktopAppId,
    iconPath,
  };
}

async function enabledDesktopAppIds() {
  const entries = await readdir(appsDirectory, { withFileTypes: true });
  const ids = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !appIdPattern.test(entry.name)) {
      continue;
    }

    const manifestPath = path.join(appsDirectory, entry.name, 'app.manifest.json');
    try {
      const manifest = await readJson(manifestPath, 'app.manifest.json');
      const desktop = record(manifest.desktop);
      if (desktop?.enabled === true) {
        ids.push(entry.name);
      }
    } catch (error) {
      console.warn(
        `[desktop] Skipping ${entry.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return ids.sort((first, second) => first.localeCompare(second, 'en'));
}

async function compileRuntime() {
  console.log('[desktop] Compiling shared main and preload runtime...');
  await resetManagedDirectory(electronDirectory, runtimeOutput);
  const typescriptCli = require.resolve('typescript/bin/tsc');
  await run(process.execPath, [typescriptCli, '-p', path.join(electronDirectory, 'tsconfig.json')]);
}

async function typecheckApp(app) {
  console.log(`[desktop:${app.id}] Typechecking renderer...`);
  const typescriptCli = require.resolve('typescript/bin/tsc');
  await run(process.execPath, [
    typescriptCli,
    '--noEmit',
    '-p',
    path.join(app.directory, 'tsconfig.json'),
  ]);
}

async function createStage(app) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `dhepil-suite-${app.id}-`));
  const stageDirectory = path.join(temporaryRoot, 'app');
  const rendererDirectory = path.join(stageDirectory, 'out', 'renderer');
  assertManagedPath(temporaryRoot, stageDirectory);
  await mkdir(stageDirectory, { recursive: true });

  await typecheckApp(app);
  console.log(`[desktop:${app.id}] Building renderer with relative assets...`);
  const { build: viteBuild } = await import('vite');
  await viteBuild({
    root: app.directory,
    configFile: path.join(app.directory, 'vite.config.ts'),
    base: './',
    build: {
      emptyOutDir: true,
      outDir: rendererDirectory,
    },
  });

  await Promise.all([
    cp(path.join(runtimeOutput, 'main'), path.join(stageDirectory, 'out', 'main'), {
      recursive: true,
    }),
    cp(path.join(runtimeOutput, 'preload'), path.join(stageDirectory, 'out', 'preload'), {
      recursive: true,
    }),
    mkdir(path.join(stageDirectory, 'build'), { recursive: true }),
  ]);
  await cp(app.iconPath, path.join(stageDirectory, 'build', 'icon.png'));

  const stagedPackage = {
    name: `${app.id}-desktop`,
    version: app.version,
    private: true,
    type: 'module',
    description: `${app.productName} desktop application`,
    author: 'Dhepil Suite',
    main: 'out/main/index.js',
    dhepilDesktopAppId: app.id,
  };
  await writeFile(
    path.join(stageDirectory, 'package.json'),
    `${JSON.stringify(stagedPackage, null, 2)}\n`,
  );

  return { stageDirectory, temporaryRoot };
}

async function packageApp(app, directoryOnly) {
  const { stageDirectory, temporaryRoot } = await createStage(app);
  const releaseDirectory = path.join(releaseRoot, app.id);
  await resetManagedDirectory(releaseRoot, releaseDirectory);

  const electronPackagePath = require.resolve('electron/package.json');
  const electronPackage = require(electronPackagePath);
  const electronDist = path.join(path.dirname(electronPackagePath), 'dist');
  const { Arch, Platform, build: electronBuild } = require('electron-builder');
  const targets = Platform.WINDOWS.createTarget(directoryOnly ? ['dir'] : ['nsis'], Arch.x64);

  try {
    console.log(
      `[desktop:${app.id}] Packaging ${directoryOnly ? 'unpacked app' : 'Windows installer'}...`,
    );
    await electronBuild({
      projectDir: stageDirectory,
      targets,
      config: {
        appId: app.desktopAppId,
        productName: app.productName,
        electronVersion: electronPackage.version,
        electronDist,
        asar: true,
        npmRebuild: false,
        buildDependenciesFromSource: false,
        directories: {
          output: releaseDirectory,
        },
        files: ['out/**/*', 'package.json'],
        win: {
          icon: path.join(stageDirectory, 'build', 'icon.png'),
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          artifactName: `${app.productName}-Setup-\${version}.\${ext}`,
        },
      },
    });
  } finally {
    assertManagedPath(os.tmpdir(), temporaryRoot);
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  console.log(`[desktop:${app.id}] Output: ${releaseDirectory}`);
}

async function buildOne(appId, directoryOnly, runtimeAlreadyCompiled = false) {
  const app = await loadDesktopApp(appId);
  if (!runtimeAlreadyCompiled) {
    await compileRuntime();
  }
  await packageApp(app, directoryOnly);
}

async function buildAll(directoryOnly) {
  const appIds = await enabledDesktopAppIds();
  if (appIds.length === 0) {
    throw new Error('No desktop-enabled apps were found.');
  }

  await compileRuntime();
  for (const appId of appIds) {
    const app = await loadDesktopApp(appId);
    await packageApp(app, directoryOnly);
  }
}

async function readLockedPort(appId) {
  const registry = await readJson(
    path.join(repositoryDirectory, 'config', 'app-ports.lock.json'),
    'app-ports.lock.json',
  );
  const assignments = record(registry.assignments);
  const port = assignments?.[appId];
  if (!Number.isInteger(port) || port < 2000 || port > 2999) {
    throw new Error(`No stable port is assigned to "${appId}".`);
  }
  return port;
}

function waitForChild(child) {
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
}

async function develop(appId) {
  const app = await loadDesktopApp(appId);
  const port = await readLockedPort(app.id);
  await compileRuntime();

  const { createServer } = await import('vite');
  const server = await createServer({
    root: app.directory,
    configFile: path.join(app.directory, 'vite.config.ts'),
    server: {
      host: '127.0.0.1',
      port,
      strictPort: true,
    },
  });

  await server.listen();
  const rendererUrl = `http://127.0.0.1:${port}`;
  console.log(`[desktop:${app.id}] Renderer ready at ${rendererUrl}`);

  const electronExecutable = require('electron');
  const electronProcess = spawn(electronExecutable, [electronDirectory], {
    cwd: repositoryDirectory,
    env: electronEnvironment({
      DHEPIL_DESKTOP_APP_ID: app.id,
      DHEPIL_DESKTOP_PRODUCT_NAME: app.productName,
      ELECTRON_OPEN_DEVTOOLS: process.env.ELECTRON_OPEN_DEVTOOLS ?? '0',
      ELECTRON_RENDERER_URL: rendererUrl,
    }),
    stdio: 'inherit',
  });

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    if (!electronProcess.killed) {
      electronProcess.kill();
    }
    await server.close();
  };

  const stopFromSignal = () => {
    void close();
  };
  process.once('SIGINT', stopFromSignal);
  process.once('SIGTERM', stopFromSignal);

  try {
    const result = await waitForChild(electronProcess);
    if (result.code !== 0 && result.signal === null) {
      throw new Error(`Electron exited with code ${result.code}.`);
    }
  } finally {
    process.removeListener('SIGINT', stopFromSignal);
    process.removeListener('SIGTERM', stopFromSignal);
    await close();
  }
}

async function main() {
  const [command, appId, ...options] = process.argv.slice(2);
  const directoryOnly = options.includes('--dir') || appId === '--dir';

  switch (command) {
    case 'dev':
      if (!appId || appId === '--dir' || options.length > 0) {
        usage();
        throw new Error('dev requires exactly one app id.');
      }
      await develop(appId);
      return;
    case 'build':
      if (!appId || appId === '--dir' || options.some((option) => option !== '--dir')) {
        usage();
        throw new Error('build requires one app id and optionally --dir.');
      }
      await buildOne(appId, directoryOnly);
      return;
    case 'build-all':
      if (
        (appId !== undefined && appId !== '--dir') ||
        options.some((option) => option !== '--dir')
      ) {
        usage();
        throw new Error('build-all accepts only the optional --dir flag.');
      }
      await buildAll(directoryOnly);
      return;
    default:
      usage();
      throw new Error('Unknown or missing desktop command.');
  }
}

main().catch((error) => {
  console.error(`[desktop] ${error instanceof Error ? error.message : String(error)}`);
  if (error instanceof Error && error.cause) {
    console.error(error.cause);
  }
  process.exitCode = 1;
});
