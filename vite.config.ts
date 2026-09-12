/// <reference types="node" />
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * 開發期截圖收件匣（只在 dev server 存在，build 不含）：
 * 頁面在 ?debug=1 下呼叫 __kb.dbg.snapshot('name') → POST /__shot?name=name 一個 PNG data URL → 寫到 .shots/name.png（gitignore）。
 * 用途：把房間／書頁的實際畫面存成檔案給使用者看、之後產 README 截圖；Browser pane 的截圖只回到 Claude 手上、不落地。
 */
function devShot(): Plugin {
  return {
    name: 'kb-dev-shot',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end();
          return;
        }
        const name = (new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? '').replace(/[^a-z0-9_-]/gi, '');
        let body = '';
        req.on('data', (chunk: Buffer | string) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(body);
          const b64 = m?.[1];
          if (!b64 || !name) {
            res.statusCode = 400;
            res.end();
            return;
          }
          const dir = join(process.cwd(), '.shots');
          mkdirSync(dir, { recursive: true });
          const file = join(dir, `${name}.png`);
          writeFileSync(file, Buffer.from(b64, 'base64'));
          res.setHeader('content-type', 'text/plain');
          res.end(file);
        });
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [devShot()],
  server: { host: true, port: Number(process.env.PORT) || 5173 },
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1200 },
  test: { include: ['tests/**/*.test.ts'] },
});
