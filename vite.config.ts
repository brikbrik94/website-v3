import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: process.env.ANALYZE
      ? [
          visualizer({
            filename: 'perf-reports/bundle-treemap.html',
            template: 'treemap',
            gzipSize: true,
            brotliSize: true
          }),
          visualizer({
            filename: 'perf-reports/bundle-stats.json',
            json: true,
            gzipSize: true,
            brotliSize: true
          })
        ]
      : [],
    server: {
      host: '100.64.0.1',
      port: 8000,
      strictPort: true,
      watch: {
        ignored: ['**/oe5ith-ci/**']
      },
      proxy: {
        '/api/': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    build: {
      target: 'esnext'
    }
  };
});
