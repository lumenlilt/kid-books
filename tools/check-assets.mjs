#!/usr/bin/env node
// public/assets 底下每個第三方檔案都要對得上 LEDGER.json 的一筆；每筆也要對得上至少一個檔案。
// 為什麼：開源 repo 裡一個來路不明的 glb 就是一個授權炸彈；帳要跟檔案雙向對，才不會漂移。
// 檔名不寫死——從檔案系統列舉，改名搬家都還查得到。
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, readJson, globToRegExp, report } from './_lib.mjs';

const assetsDir = join(ROOT, 'public', 'assets');
const ledgerPath = join(assetsDir, 'LEDGER.json');
const creditsPath = join(ROOT, 'CREDITS.md');
const failures = [];

const ledger = readJson(ledgerPath, { entries: [] });
const entries = Array.isArray(ledger.entries) ? ledger.entries : [];
const files = walk(assetsDir).filter((f) => f !== ledgerPath).map((f) => rel(f).replace(/^public\/assets\//, ''));

const matchers = entries.map((e, i) => {
  for (const field of ['path', 'pack', 'license', 'url', 'retrieved']) {
    if (!e[field]) failures.push(`entry #${i + 1}（${e.path ?? '?'}）：缺 ${field}`);
  }
  return { entry: e, re: globToRegExp(String(e.path ?? '')), hits: 0 };
});

for (const f of files) {
  const hit = matchers.filter((m) => m.re.test(f));
  if (hit.length === 0) failures.push(`${f}：LEDGER.json 沒有這個檔案的來源`);
  for (const m of hit) m.hits += 1;
}
for (const m of matchers) if (m.hits === 0) failures.push(`entry ${m.entry.path}：對不到任何檔案（幽靈條目）`);

if (entries.length > 0) {
  const credits = existsSync(creditsPath) ? readFileSync(creditsPath, 'utf8') : '';
  for (const e of entries) if (e.pack && !credits.includes(e.pack)) failures.push(`CREDITS.md 沒有「${e.pack}」——跑 node tools/build-credits.mjs`);
}

report('check:assets', failures, `${files.length} 個檔案、${entries.length} 筆來源`);
