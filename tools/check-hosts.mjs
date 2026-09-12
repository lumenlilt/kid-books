#!/usr/bin/env node
// 建置產物裡不准有第三方網址：這是兒童產品，零外連是硬規則（CSP 也只允許 'self'）。
// JS 裡的字串網址只當「候選」報出來——three.js 的警告訊息會附文件連結、zod 內含 json-schema.org 的 $schema 識別字，那些不是連線；
// 所以用主機名白名單：白名單以外的任何主機一律紅，由人判斷後再加進白名單。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, report } from './_lib.mjs';

const distDir = join(ROOT, 'dist');
if (!existsSync(distDir)) {
  console.error('✘ check:hosts：沒有 dist/，先 npm run build');
  process.exit(1);
}
const DOC_HOSTS = new Set(['threejs.org', 'github.com', 'developer.mozilla.org', 'www.w3.org', 'www.khronos.org', 'registry.khronos.org', 'creativecommons.org', 'kenney.nl', 'opensource.org', 'jcgt.org', 'json-schema.org', 'polyhaven.com']);
const URL_RE = /https?:\/\/([a-z0-9.-]+)[^\s"'`)<>]*/gi;
const failures = [];
const seen = new Map();

// 三種嚴格度：
//  - html/css：只有真的會被載入的位置算數（src=、href=、url()），任何外部主機都紅——白名單不適用。
//  - js/json/webmanifest/svg：字串裡的網址當候選，主機不在文件白名單就紅。
//  - txt（授權全文）：不掃，裡面的網址是文字不是連線。
const LOAD_RE = /(?:\b(?:src|href)\s*=\s*["']?|url\(\s*["']?)(https?:\/\/([a-z0-9.-]+)[^\s"')<>]*)/gi;
for (const p of walk(distDir)) {
  const text = readFileSync(p, 'utf8');
  if (/\.(html|css)$/.test(p)) {
    for (const m of text.matchAll(LOAD_RE)) {
      const host = (m[2] ?? '').toLowerCase();
      seen.set(host, (seen.get(host) ?? 0) + 1);
      if (host !== 'www.w3.org') failures.push(`${rel(p)}：會載入外部資源 ${m[1].slice(0, 80)}`);
    }
  } else if (/\.(js|json|webmanifest|svg)$/.test(p)) {
    for (const m of text.matchAll(URL_RE)) {
      const host = m[1].toLowerCase();
      seen.set(host, (seen.get(host) ?? 0) + 1);
      if (!DOC_HOSTS.has(host)) failures.push(`${rel(p)}：${m[0].slice(0, 80)}`);
    }
  }
}

report('check:hosts', failures, `外部主機 ${seen.size} 個，全部在文件白名單內（${[...seen.keys()].join(', ') || '無'}）`);
