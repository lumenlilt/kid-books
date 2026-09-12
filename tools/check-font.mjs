#!/usr/bin/env node
// 兩件事：(1) content/ 裡用到的每個 CJK 字都在字型子集裡；(2) src/ 不得含 CJK 字面值。
// 為什麼：缺字時瀏覽器會靜默退回系統字型，畫面不會報錯，只會突然有一個字長得不一樣；
// 而字集是從 content/ 算出來的，中文散在 src/ 裡就算不到。註解會先剝掉，中文註解沒關係。
// 字集規則與 tools/build-font.py 的 GLYPH_RE 一致：中日韓統一表意、擴充 A、注音、CJK 標點、全形、相容表意。
// emoji 不算——那由系統的 emoji 字型畫，不在我們的子集裡。
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, walk, rel, readJson, report } from './_lib.mjs';

const failures = [];
const CJK_SRC = '[\\u2E80-\\u2FDF\\u3000-\\u303F\\u3100-\\u312F\\u31A0-\\u31BF\\u3400-\\u4DBF\\u4E00-\\u9FFF\\uF900-\\uFAFF\\uFF00-\\uFFEF]';
const CJK = new RegExp(CJK_SRC);
const CJK_G = new RegExp(CJK_SRC, 'g');

// (1) 字集
const needed = new Set();
function collect(v) {
  if (typeof v === 'string') {
    for (const ch of v.match(CJK_G) ?? []) needed.add(ch);
  } else if (Array.isArray(v)) {
    v.forEach(collect);
  } else if (v && typeof v === 'object') {
    Object.values(v).forEach(collect);
  }
}
for (const p of walk(join(ROOT, 'content')).filter((f) => f.endsWith('.json'))) collect(JSON.parse(readFileSync(p, 'utf8')));

const manifest = readJson(join(ROOT, 'public', 'assets', 'fonts', 'manifest.json'), null);
if (needed.size > 0) {
  if (!manifest) {
    failures.push(`content/ 用到 ${needed.size} 個 CJK 字，但沒有 public/assets/fonts/manifest.json——先跑 tools/build-font.py`);
  } else {
    const have = new Set(manifest.glyphs ?? '');
    const missing = [...needed].filter((ch) => !have.has(ch));
    if (missing.length) failures.push(`字型子集缺 ${missing.length} 個字：${missing.slice(0, 20).join('')}${missing.length > 20 ? '…' : ''}——重跑 tools/build-font.py`);
  }
}

// (2) src/ 的 CJK 字面值（剝掉註解後）
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
}
for (const p of walk(join(ROOT, 'src')).filter((f) => /\.(ts|css|html)$/.test(f))) {
  const text = stripComments(readFileSync(p, 'utf8'));
  text.split('\n').forEach((line, i) => {
    if (CJK.test(line)) failures.push(`${rel(p)}:${i + 1}：中文字面值請搬進 content/（${line.trim().slice(0, 40)}）`);
  });
}

report('check:font', failures, `字集 ${needed.size} 字、src/ 無 CJK 字面值`);
