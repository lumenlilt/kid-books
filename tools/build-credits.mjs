#!/usr/bin/env node
// LEDGER.json → CREDITS.md。CREDITS 不手寫：手寫的那份會在下一次加素材時漂移。
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson } from './_lib.mjs';

const ledger = readJson(join(ROOT, 'public', 'assets', 'LEDGER.json'), { entries: [] });
const byPack = new Map();
for (const e of ledger.entries) {
  const k = `${e.pack}|${e.author ?? ''}|${e.license}|${e.url}`;
  byPack.set(k, [...(byPack.get(k) ?? []), e]);
}
const lines = [
  '# CREDITS — 第三方素材',
  '',
  '> 由 `node tools/build-credits.mjs` 從 `public/assets/LEDGER.json` 產生，不要手改。',
  '> 程式碼授權見 LICENSE（MIT）；課程內容與原創美術見 LICENSE-CONTENT（CC BY 4.0）。',
  '',
  '| 素材包 | 作者 | 授權 | 來源 | 用在 |',
  '|---|---|---|---|---|',
];
for (const [k, es] of byPack) {
  const [pack, author, license, url] = k.split('|');
  lines.push(`| ${pack} | ${author || '—'} | ${license} | <${url}> | ${es.map((e) => `\`${e.path}\``).join('、')} |`);
}
if (byPack.size === 0) lines.push('| （還沒有第三方素材） | | | | |');
writeFileSync(join(ROOT, 'CREDITS.md'), lines.join('\n') + '\n');
console.log(`CREDITS.md：${byPack.size} 個素材包`);
