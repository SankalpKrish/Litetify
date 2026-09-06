import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Tauri expects a fixed dev server port and host.
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Prevent Vite from obscuring Rust errors.
  clearScreen: false,
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    css: true,
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // Don't watch the Rust crate; Cargo handles that.
      ignored: ['**/src-tauri/**'],
    },
  },
  // Produce ES2021-compatible output for the Tauri webview targets.
  build: {
    target: 'es2021',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
          player: [
            './src/features/player/NowPlayingBar.tsx',
            './src/features/player/TransportControls.tsx',
            './src/features/player/ProgressBar.tsx',
            './src/features/player/VolumeControl.tsx',
            './src/features/player/NowPlayingInfo.tsx',
          ],
          auth: ['./src/features/auth/LoginScreen.tsx'],
          settings: [
            './src/features/settings/SettingsView.tsx',
            './src/features/settings/Mods.tsx',
          ],
          mods: [
            './src/mods/loader.ts',
            './src/mods/sandbox.ts',
            './src/mods/api.ts',
          ],
        },
      },
    },
  },
});
