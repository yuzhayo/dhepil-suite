import { createServer } from 'node:net';

import { describe, expect, it } from 'vitest';

import { isTcpPortOccupied } from './project-process';

describe('project process probes', () => {
  it('membedakan TCP port yang terpakai dan yang sudah bebas', async () => {
    const server = createServer();
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.once('error', rejectPromise);
      server.listen(0, '127.0.0.1', resolvePromise);
    });

    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Test TCP server tidak mempunyai port.');
    }

    expect(await isTcpPortOccupied(address.port)).toBe(true);

    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
          return;
        }
        resolvePromise();
      });
    });

    expect(await isTcpPortOccupied(address.port)).toBe(false);
  });
});
