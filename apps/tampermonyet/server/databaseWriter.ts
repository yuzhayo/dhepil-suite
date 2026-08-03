import { mkdir, writeFile } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Plugin } from 'vite';

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const allowedOrigins = new Set(['https://agentrouter.org']);

export interface UserDatabasePayload {
  owner: string;
  value: {
    accountName: string;
    [key: string]: unknown;
  };
}

export interface SavedUserDatabase {
  absolutePath: string;
  relativePath: string;
}

function normalizeOwner(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function safeFileName(owner: string) {
  const normalized = normalizeOwner(owner);
  const safe = normalized.replace(/[^a-z0-9._-]+/g, '_').replace(/^\.+|\.+$/g, '');
  if (!safe || safe === '.' || safe === '..') {
    throw new Error('Nama akun tidak valid untuk database.');
  }
  return safe.slice(0, 100);
}

export async function writeAgentRouterUserDatabase(
  databaseRoot: string,
  payload: UserDatabasePayload,
): Promise<SavedUserDatabase> {
  if (!payload || typeof payload !== 'object') throw new Error('Payload database tidak valid.');
  if (!payload.value || typeof payload.value !== 'object') {
    throw new Error('Value database tidak valid.');
  }

  const owner = normalizeOwner(String(payload.owner || ''));
  const valueOwner = normalizeOwner(String(payload.value.accountName || ''));
  if (!owner || owner !== valueOwner) throw new Error('Owner JSON tidak cocok dengan akun.');

  const directory = resolve(databaseRoot, 'agentrouter');
  const absolutePath = join(directory, `${safeFileName(owner)}.json`);
  await mkdir(directory, { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(payload.value, null, 2)}\n`, 'utf8');

  return {
    absolutePath,
    relativePath: `database/agentrouter/${safeFileName(owner)}.json`,
  };
}

async function readJsonBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > MAX_BODY_BYTES) throw new Error('Payload database terlalu besar.');
    chunks.push(buffer);
  }

  if (chunks.length === 0) throw new Error('Payload database kosong.');
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as UserDatabasePayload;
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(value));
}

function allowOrigin(request: IncomingMessage, response: ServerResponse) {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (!allowedOrigins.has(origin)) return false;

  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.setHeader('Vary', 'Origin');
  return true;
}

export function databaseWriterPlugin(options: { databaseRoot?: string } = {}): Plugin {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const databaseRoot = resolve(options.databaseRoot || join(appRoot, 'database'));

  return {
    name: 'tampermonyet-database-writer',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
        if (pathname !== '/api/database/agentrouter') {
          next();
          return;
        }

        if (!allowOrigin(request, response)) {
          sendJson(response, 403, { error: 'Origin request tidak diizinkan.' });
          return;
        }

        if (request.method === 'OPTIONS') {
          response.statusCode = 204;
          response.end();
          return;
        }

        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Gunakan POST untuk menyimpan JSON.' });
          return;
        }

        try {
          const saved = await writeAgentRouterUserDatabase(
            databaseRoot,
            await readJsonBody(request),
          );
          sendJson(response, 200, { ok: true, file: saved.relativePath });
        } catch (error) {
          sendJson(response, 400, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });
    },
  };
}
