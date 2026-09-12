#!/usr/bin/env node
// 每句旁白都要有音檔，而且音檔是用「現在這句文字」產的。
// 為什麼：台詞改了但音檔沒重產，小孩聽到的是舊句子，而畫面上沒有任何東西會告訴你。
// --release：任何一句不是 azure 產的就紅（擋 macOS say 的佔位聲音上線）。
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, readJson, report } from './_lib.mjs';

const release = process.argv.includes('--release');
const booksDir = join(ROOT, 'content', 'books');
const audioDir = join(ROOT, 'public', 'audio');
const manifestPath = join(audioDir, 'manifest.json');
const failures = [];

const lines = new Map(); // key: `${bookId}.${lineId}` → { text, file }
for (const p of walk(booksDir).filter((f) => f.endsWith('.json'))) {
  const book = JSON.parse(readFileSync(p, 'utf8'));
  if (!book.id) failures.push(`${rel(p)}：沒有 id`);
  for (const [lineId, text] of Object.entries(book.lines ?? {})) {
    if (typeof text !== 'string' || !text.trim()) failures.push(`${book.id}.${lineId}：台詞是空的`);
    lines.set(`${book.id}.${lineId}`, { text, file: join(audioDir, book.id, `${lineId}.mp3`) });
  }
}

const manifest = readJson(manifestPath, null);
if (lines.size > 0 && !manifest) failures.push(`有 ${lines.size} 句台詞但沒有 ${rel(manifestPath)}——先跑 tools/tts.py`);

const entries = manifest?.lines ?? {};
for (const [key, { text, file }] of lines) {
  const entry = entries[key];
  if (!entry) {
    failures.push(`${key}：manifest 沒有這句`);
    continue;
  }
  const sha = createHash('sha256').update(text).digest('hex');
  if (entry.textSha256 !== sha) failures.push(`${key}：台詞改了但音檔沒重產（manifest ${String(entry.textSha256).slice(0, 8)} ≠ 現在 ${sha.slice(0, 8)}）`);
  if (!existsSync(file)) failures.push(`${key}：缺音檔 ${rel(file)}`);
  if (release && entry.backend !== 'azure') failures.push(`${key}：--release 不接受 ${entry.backend} 產的音檔`);
}
for (const key of Object.keys(entries)) if (!lines.has(key)) failures.push(`${key}：manifest 裡有、書裡沒有（孤兒條目）`);
for (const f of walk(audioDir).filter((f) => f.endsWith('.mp3'))) {
  const key = rel(f).replace(/^public\/audio\//, '').replace(/\.mp3$/, '').replace('/', '.');
  if (!lines.has(key)) failures.push(`${rel(f)}：沒有任何台詞引用（孤兒音檔）`);
}

report('check:audio', failures, `${lines.size} 句台詞${release ? '（release 模式）' : ''}`);
