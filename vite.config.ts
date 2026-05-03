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
        '/api/ors': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ors/, 'ors.php?path=')
        },
        '/api/geocoder': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/geocoder/, 'geocoder.php')
        },
        '/api/stations': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/stations/, 'stations.php')
        },
        '/api/nah': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/nah/, 'nah.php')
        },
        '/api/ping': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ping/, 'ping.php')
        },
        '/api/db': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/db/, 'db_status.php')
        },
        '/api/stats': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/stats/, 'stats.php')
        }
      }
    },
    build: {
      target: 'esnext'
    }
  };
});
