import { BoxGeometry, Group, Mesh, Vector3 } from 'three';
import { paper } from './materials';
import type { Palette } from './palette';

/** 程式化書架：格位由我們決定，不綁在別人模型的層板高度上（DECISIONS D19）。 */
export interface Bookcase {
  group: Group;
  /** 六個書格的中心點（書底貼在層板上） */
  slots: Vector3[];
  /** 書架頂面中心（貓坐的位置） */
  top: Vector3;
  /** 下層層板中心（放擺設） */
  lowerShelf: Vector3;
  size: { w: number; h: number; d: number };
}

export function createBookcase(palette: Palette): Bookcase {
  const w = 1.8;
  const h = 1.78;
  const d = 0.42;
  const t = 0.05;
  const g = new Group();
  const wood = paper(palette.wood);
  const dark = paper(palette.woodDark);

  const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number, m = wood) => {
    const mesh = new Mesh(new BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  add(t, h, d, -w / 2 + t / 2, h / 2, 0); // 左側板
  add(t, h, d, w / 2 - t / 2, h / 2, 0); // 右側板
  add(w, t, d, 0, h - t / 2, 0); // 頂板
  add(w, t, d, 0, t / 2, 0); // 底板
  add(w - 2 * t, h - 2 * t, t, 0, h / 2, -d / 2 + t / 2, dark); // 背板
  const shelfBookY = 0.98;
  const shelfLowY = 0.42;
  add(w - 2 * t, t, d - 0.02, 0, shelfBookY, 0.01); // 書層
  add(w - 2 * t, t, d - 0.02, 0, shelfLowY, 0.01); // 下層

  const slots: Vector3[] = [];
  const inner = w - 2 * t - 0.06;
  for (let i = 0; i < 6; i += 1) {
    const x = -inner / 2 + (inner / 6) * (i + 0.5);
    slots.push(new Vector3(x, shelfBookY + t / 2, d / 2 - 0.12));
  }

  return {
    group: g,
    slots,
    top: new Vector3(0, h, 0),
    lowerShelf: new Vector3(0, shelfLowY + t / 2, 0),
    size: { w, h, d },
  };
}
