import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { copyFile, mkdir, access } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Provider yang punya gate file. Tambah entry di sini saat provider baru
 * dibuat - ini satu-satunya tempat daftar provider disebut di sisi build.
 */
const PROVIDERS = ['agentrouter', 'openrouter'] as const;

const gateSourcePath = (provider: string) =>
  resolve(APP_ROOT, 'src', provider, 'data.json');

/**
 * Gate file sengaja disimpan di `src/<provider>/data.json` supaya jelas milik
 * provider mana. Tapi file di dalam `src/` tidak otomatis tersedia sebagai
 * asset runtime: kalau di-import statis, isinya ikut ter-bundle dan angkanya
 * beku saat build - persis kegagalan diam yang ingin kita hindari.
 *
 * Plugin ini memberi satu URL stabil `/gate/<provider>.json` yang:
 * - saat dev, dibaca ulang dari disk tiap request (selalu segar);
 * - saat build, disalin ke `dist/gate/` sebagai file terpisah dari bundle.
 *
 * Header no-store wajib: tanpa itu browser meng-cache gate file dan dashboard
 * bisa menampilkan angka lama tanpa tanda apa pun.
 */
function gateFilePlugin(): Plugin {
  return {
    name: 'dhepil-gate-file',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const match = req.url?.match(/^\/gate\/([a-z0-9-]+)\.json(?:\?.*)?$/);
        if (!match) return next();

        const provider = match[1];
        if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');

        const stream = createReadStream(gateSourcePath(provider));
        stream.on('error', () => {
          // Gate file belum pernah ditulis logic. Ini bukan error - UI punya
          // state khusus "belum ada data", jadi 404 adalah jawaban yang benar.
          res.statusCode = 404;
          res.end('{"error":"gate file belum ada"}');
        });
        stream.pipe(res);
      });
    },

    async closeBundle() {
      const outDir = resolve(APP_ROOT, 'dist', 'gate');
      await mkdir(outDir, { recursive: true });

      for (const provider of PROVIDERS) {
        const source = gateSourcePath(provider);
        try {
          await access(source);
        } catch {
          // Belum ada gate file saat build - biarkan, UI menanganinya.
          continue;
        }
        await copyFile(source, resolve(outDir, `${provider}.json`));
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), gateFilePlugin()],
});
