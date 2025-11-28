import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: env.VITE_DKG_USE_PROXY === 'true' ? {
          '/api': env.DKG_PROXY_TARGET ? {
            target: env.DKG_PROXY_TARGET,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api/, '')
          } : undefined,
          '/v7': {
            target: env.VITE_DKG_V7_PRIMARY || 'https://ping-framework-motorcycles-incl.trycloudflare.com',
            changeOrigin: true,
            secure: false,
            rewrite: (p) => p.replace(/^\/v7/, '')
          },
          '/v7pub': {
            target: env.VITE_DKG_V7_PUBLIC || 'https://testnetv7.origintrail.io',
            changeOrigin: true,
            secure: false,
            rewrite: (p) => p.replace(/^\/v7pub/, '')
          }
        } : undefined
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
