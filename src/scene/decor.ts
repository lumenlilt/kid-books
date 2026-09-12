// 房間擺設（程序生成、跟色板走）：彩旗、窗簾、雲朵吊飾、彩虹海報、圓地毯貼圖、木地板貼圖。
// 全部是紙藝：平色、有厚度、柔影。任何一件都能單獨拿掉。
import {
  CanvasTexture, CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, DoubleSide, ExtrudeGeometry, Group, Mesh,
  MeshStandardMaterial, PlaneGeometry, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, TubeGeometry, Vector3,
} from 'three';
import { paper } from './materials';
import { hex, type Palette } from './palette';

export interface Decor {
  group: Group;
  update(dt: number): void;
}

const canvasTexture = (size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d');
  draw(ctx, size);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
};

const shade = (color: number, k: number): string => hex(new Color(color).lerp(new Color(k > 0 ? 0xffffff : 0x000000), Math.abs(k)).getHex());

/** 木地板：橫向木板＋細木紋 */
export function woodFloorTexture(palette: Palette): CanvasTexture {
  const t = canvasTexture(512, (ctx, s) => {
    const plank = 64;
    for (let y = 0; y < s; y += plank) {
      const k = ((y / plank) % 3) * 0.05 - 0.04;
      ctx.fillStyle = shade(palette.floor, k);
      ctx.fillRect(0, y, s, plank);
      ctx.fillStyle = shade(palette.floor, -0.22);
      ctx.fillRect(0, y, s, 2);
      // 木板接縫錯開
      const seam = ((y / plank) * 197) % s;
      ctx.fillRect(seam, y, 2, plank);
      // 木紋
      ctx.strokeStyle = shade(palette.floor, -0.07);
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i += 1) {
        const yy = y + 8 + i * 11 + ((y * 7 + i * 13) % 5);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(s * 0.3, yy + 3, s * 0.6, yy - 3, s, yy + 1);
        ctx.stroke();
      }
    }
  });
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(3, 3);
  return t;
}

/** 圓地毯：同心環＋花邊 */
export function rugTexture(palette: Palette): CanvasTexture {
  return canvasTexture(512, (ctx, s) => {
    const c = s / 2;
    const rings = [palette.rug, palette.paper, palette.rug, palette.accent, palette.rug];
    rings.forEach((col, i) => {
      ctx.beginPath();
      ctx.arc(c, c, c * (1 - i * 0.16), 0, Math.PI * 2);
      ctx.fillStyle = hex(col);
      ctx.fill();
    });
    ctx.fillStyle = hex(palette.paper);
    for (let i = 0; i < 36; i += 1) {
      const a = (i / 36) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * c * 0.9, c + Math.sin(a) * c * 0.9, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** 彩虹海報（紙卡，貼在牆上） */
export function posterTexture(palette: Palette): CanvasTexture {
  return canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = hex(palette.paper);
    ctx.fillRect(0, 0, s, s);
    const cols = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#4dabf7', '#9775fa'];
    cols.forEach((col, i) => {
      ctx.beginPath();
      ctx.arc(s / 2, s * 0.78, s * 0.42 - i * 14, Math.PI, 0);
      ctx.lineWidth = 14;
      ctx.strokeStyle = col;
      ctx.stroke();
    });
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath();
    ctx.arc(s * 0.22, s * 0.25, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd43b';
    ctx.lineWidth = 5;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(s * 0.22 + Math.cos(a) * 34, s * 0.25 + Math.sin(a) * 34);
      ctx.lineTo(s * 0.22 + Math.cos(a) * 46, s * 0.25 + Math.sin(a) * 46);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    const puffs: Array<[number, number]> = [[0.72, 0.28], [0.8, 0.3], [0.64, 0.3]];
    for (const [x, y] of puffs) {
      ctx.beginPath();
      ctx.arc(s * x, s * y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** 雲朵形狀（幾個圓弧拼起來） */
export function cloudShape(w = 0.5, h = 0.26): Shape {
  const s = new Shape();
  s.moveTo(-w / 2, 0);
  s.absarc(-w * 0.3, 0.02, h * 0.42, Math.PI, Math.PI * 1.85, false);
  s.absarc(-w * 0.05, 0.08, h * 0.55, Math.PI * 1.1, Math.PI * 1.95, false);
  s.absarc(w * 0.25, 0.03, h * 0.45, Math.PI * 1.15, Math.PI * 2, false);
  s.lineTo(w / 2, 0);
  s.closePath();
  return s;
}

export function createDecor(palette: Palette): Decor {
  const g = new Group();
  const updaters: Array<(dt: number, t: number) => void> = [];

  // 彩旗：書架上方一條微垂的線，掛九面小三角旗
  const bunting = new Group();
  const curve = new CatmullRomCurve3([new Vector3(-1.35, 2.42, -2.3), new Vector3(-0.45, 2.24, -2.28), new Vector3(0.45, 2.24, -2.28), new Vector3(1.35, 2.42, -2.3)]);
  const rope = new Mesh(new TubeGeometry(curve, 24, 0.006, 6, false), paper(palette.ink, { flat: false, grain: false }));
  bunting.add(rope);
  const flagCols = [palette.accent, palette.rug, palette.sky, 0xffd45a, palette.accent, 0x7bd3ff, palette.rug, 0xffd45a, palette.accent];
  const tri = new Shape();
  tri.moveTo(-0.075, 0);
  tri.lineTo(0.075, 0);
  tri.lineTo(0, -0.2);
  tri.closePath();
  const triGeo = new ShapeGeometry(tri);
  const flags: Mesh[] = [];
  flagCols.forEach((col, i) => {
    const p = curve.getPoint((i + 0.5) / flagCols.length);
    const m = new Mesh(triGeo, new MeshStandardMaterial({ color: col, roughness: 0.9, side: DoubleSide }));
    m.position.copy(p);
    m.position.y -= 0.005;
    m.castShadow = true;
    bunting.add(m);
    flags.push(m);
  });
  g.add(bunting);
  updaters.push((_dt, t) => {
    flags.forEach((f, i) => {
      f.rotation.y = Math.sin(t * 1.1 + i * 0.7) * 0.25;
      f.rotation.z = Math.sin(t * 0.8 + i) * 0.06;
    });
  });

  // 窗簾：兩片有皺褶的紙，掛在窗戶兩側；窗桿
  const curtainMat = new MeshStandardMaterial({ color: palette.rug, roughness: 0.95, side: DoubleSide });
  const makeCurtain = (x: number) => {
    const geo = new PlaneGeometry(0.34, 1.42, 10, 1);
    const pos = geo.attributes['position'];
    if (pos) {
      for (let i = 0; i < pos.count; i += 1) {
        const px = pos.getX(i);
        pos.setZ(i, Math.sin((px / 0.34) * Math.PI * 4) * 0.035);
      }
      geo.computeVertexNormals();
    }
    const m = new Mesh(geo, curtainMat);
    m.position.set(x, 1.85, -2.38);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };
  makeCurtain(1.75 - 0.72);
  makeCurtain(1.75 + 0.72);
  const rod = new Mesh(new CylinderGeometry(0.02, 0.02, 1.9, 10), paper(palette.wood, { flat: false }));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(1.75, 2.6, -2.36);
  g.add(rod);

  // 雲朵吊飾：三朵有厚度的紙雲從上面垂下來，慢慢晃
  const cloudMat = paper(0xffffff, { flat: false });
  const clouds: Mesh[] = [];
  [[-2.5, 2.55, -1.3, 0.42], [-2.9, 2.85, -1.0, 0.3], [-2.15, 2.95, -1.6, 0.34]].forEach(([x, y, z, w], i) => {
    const geo = new ExtrudeGeometry(cloudShape(w ?? 0.4, (w ?? 0.4) * 0.5), { depth: 0.03, bevelEnabled: false });
    const m = new Mesh(geo, cloudMat);
    m.position.set(x ?? 0, y ?? 0, z ?? 0);
    m.castShadow = true;
    g.add(m);
    const string = new Mesh(new CylinderGeometry(0.004, 0.004, 3.4 - (y ?? 0), 4), paper(palette.ink, { flat: false, grain: false }));
    string.position.set(x ?? 0, (y ?? 0) + (3.4 - (y ?? 0)) / 2 + 0.1, z ?? 0);
    g.add(string);
    clouds.push(m);
    updaters.push((_dt, t) => {
      m.position.y = (y ?? 0) + Math.sin(t * 0.6 + i * 1.3) * 0.03;
      m.rotation.y = Math.sin(t * 0.4 + i) * 0.25;
    });
  });

  // 彩虹海報：牆左上
  const poster = new Mesh(new PlaneGeometry(0.5, 0.5), new MeshStandardMaterial({ map: posterTexture(palette), roughness: 0.95 }));
  poster.position.set(-2.75, 1.45, -2.47);
  poster.rotation.z = 0.03;
  poster.receiveShadow = true;
  g.add(poster);
  const tapes: Array<[number, number]> = [[-0.2, 0.22], [0.2, 0.22]];
  for (const [dx, dy] of tapes) {
    const tape = new Mesh(new PlaneGeometry(0.1, 0.035), new MeshStandardMaterial({ color: 0xfff1a8, roughness: 1, transparent: true, opacity: 0.85 }));
    tape.position.set(-2.75 + dx, 1.45 + dy, -2.462);
    tape.rotation.z = dx < 0 ? 0.6 : -0.6;
    g.add(tape);
  }

  // 圓地毯
  const rug = new Mesh(new CircleGeometry(1.25, 48), new MeshStandardMaterial({ map: rugTexture(palette), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.02, 0.55); // 貼著地板會 z-fighting 消失（2026-09-12 實測），墊高 2 cm；往書架靠一點，書架視角看得到毯緣
  rug.receiveShadow = true;
  g.add(rug);

  // 半牆護牆板＋橫條
  const wainscot = new Mesh(new PlaneGeometry(9, 0.95), paper(palette.wallTrim, { flat: false }));
  wainscot.position.set(0, 0.475, -2.495);
  wainscot.receiveShadow = true;
  g.add(wainscot);
  const rail = new Mesh(new CylinderGeometry(0.018, 0.018, 9, 6), paper(palette.paper, { flat: false }));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(0, 0.96, -2.47);
  g.add(rail);

  let t = 0;
  return {
    group: g,
    update(dt) {
      t += dt;
      for (const u of updaters) u(dt, t);
    },
  };
}
