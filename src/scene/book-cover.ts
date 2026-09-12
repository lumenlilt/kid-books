import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * 封面貼圖：底色＋圖樣＋大圖示＋白色圓角標籤上的書名；鎖住的書是淡色底＋大問號＋小鎖。
 * 之後使用者的 AI 插圖進來，只要換這一支的輸出（同尺寸 256×342）。
 */
export function makeCoverTexture(opts: { color: string; icon: string; title: string; locked: boolean; ink: string; paper: string; pattern?: 'dots' | 'stripes' | 'stars' }): CanvasTexture {
  const w = 256;
  const h = 342;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const base = opts.locked ? mix(opts.color, '#b9b3ad', 0.7) : opts.color;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // 圖樣（淡）
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  const pattern = opts.pattern ?? 'dots';
  if (pattern === 'dots') {
    for (let y = 18; y < h; y += 34) for (let x = (y / 34) % 2 ? 34 : 18; x < w; x += 34) circle(ctx, x, y, 6);
  } else if (pattern === 'stripes') {
    ctx.save();
    ctx.rotate(-Math.PI / 5);
    for (let x = -h; x < w + h; x += 40) ctx.fillRect(x, -h, 14, w + 2 * h);
    ctx.restore();
  } else {
    for (let y = 22; y < h; y += 44) for (let x = (y / 44) % 2 ? 44 : 22; x < w; x += 44) star(ctx, x, y, 8);
  }
  // 書脊那一側的深色邊＋內框
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 0, 16, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 5;
  roundRect(ctx, 30, 20, w - 50, h - 40, 16);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (opts.locked) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '150px "Huninn", "PingFang TC", system-ui, sans-serif';
    ctx.fillText('?', w / 2 + 8, h / 2 - 30);
    ctx.font = '44px "Huninn", "PingFang TC", system-ui, sans-serif';
    ctx.fillText('🔒', w / 2 + 8, h - 62);
  } else {
    // 圖示浮在白色圓盤上
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(ctx, w / 2 + 8, h / 2 - 40, 72);
    ctx.fillStyle = opts.ink;
    ctx.font = '96px "Huninn", "PingFang TC", system-ui, sans-serif';
    ctx.fillText(opts.icon, w / 2 + 8, h / 2 - 34);
    // 標籤
    ctx.fillStyle = opts.paper;
    roundRect(ctx, 44, h - 96, w - 72, 60, 14);
    ctx.fill();
    ctx.fillStyle = opts.ink;
    ctx.font = 'bold 36px "Huninn", "PingFang TC", system-ui, sans-serif';
    ctx.fillText(opts.title, w / 2 + 8, h - 66);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mix(a: string, b: string, k: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - k) + ((pb >> shift) & 255) * k);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
