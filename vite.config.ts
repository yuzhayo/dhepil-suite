import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import { projectManagerPlugin } from './scripts/project-manager';

export default defineConfig({
  plugins: [react(), projectManagerPlugin()],
  server: {
    host: '127.0.0.1',
    port: 1999,
    strictPort: true,
    open: process.env.DHEPIL_GATE_NO_OPEN !== '1',
  },
});
