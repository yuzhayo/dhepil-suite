import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { databaseWriterPlugin } from './server/databaseWriter';

export default defineConfig({
  plugins: [react(), databaseWriterPlugin()],
  server: {
    host: '127.0.0.1',
    strictPort: true,
    cors: true,
  },
});
