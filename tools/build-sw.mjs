#!/usr/bin/env node
// 建置後掃 dist/ 產 service worker：預快取整個 App（含 glb／mp3／woff2），離線也能整本玩。
// 為什麼不用 vite-plugin-pwa：它拉進 workbox 一整套，而我們要的只是「清單＋cache-first＋換版清舊快取」；
// 清單從檔案系統列舉，檔名帶 hash 換版自然失效。版本＝所有檔案內容的 sha256 前 12 碼。
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel } from './_lib.mjs';

const dist = join(ROOT, 'dist');
const files = walk(dist).filter((f) => !/\/(sw\.js|_headers|assets\/LEDGER\.json)$/.test(f) && !/\.(txt|map)$/.test(f));
const hash = createHash('sha256');
const urls = files.map((f) => {
  hash.update(readFileSync(f));
  const u = '/' + rel(f).replace(/^dist\//, '');
  return u.endsWith('/index.html') ? u.replace(/index\.html$/, '') : u;
});
const version = hash.digest('hex').slice(0, 12);
const total = files.reduce((s, f) => s + statSync(f).size, 0);

const sw = `/* 魔法書房 service worker · 版本 ${version} · ${files.length} 檔 ${(total / 1048576).toFixed(1)} MB · 由 tools/build-sw.mjs 產生 */
const CACHE = 'kidbooks-${version}';
const URLS = ${JSON.stringify(urls)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('/').then((r) => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req).then((res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  })));
});
`;
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js：版本 ${version}，預快取 ${files.length} 檔（${(total / 1048576).toFixed(1)} MB）`);
