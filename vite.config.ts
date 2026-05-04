import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  
  return {
    server: {
      host: '100.64.0.1',
      port: 8000,
      strictPort: true,
      watch: {
        ignored: ['**/oe5ith-ci/**']
      },
      proxy: {
        '/api/': {
          target: 'http://localhost',
          changeOrigin: true
        }
      }
    },
    build: {
      target: 'esnext'
    }
  };
});
