import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { loadModel } from './assets';
import { paper, texturedToy } from './materials';
import type { Palette } from './palette';

/**
 * 書架 v2：模型由 tools/blender/bookcase.py 生成（D30），這裡只負責格位數字與依色板染材質。
 * 格位由我們決定、不綁在模型上（D19）——模型的層板高度是照這裡的數字建的。
 */
export interface Bookcase {
  group: Group;
  /** 六個書格的中心點（書底貼在層板上） */
  slots: Vector3[];
  /** 書架頂面中心（貓坐的位置） */
  top: Vector3;
  /** 下層層板中心（放擺設） */
  lowerShelf: Vector3;
  size: { w: number; h: number; d: number };
  ready: Promise<void>;
}

const W = 1.8;
const H = 1.78;
const D = 0.42;
const SIDE = 0.07;
const SHELF_BOOKS_Y = 0.98;
const SHELF_LOW_Y = 0.42;

export function createBookcase(palette: Palette): Bookcase {
  const g = new Group();
  const materials: Record<string, MeshStandardMaterial> = {
    Wood: texturedToy('wood', palette.wood, { repeat: 2, roughness: 0.75, normalScale: 0.45, gain: 2.5 }),
    WoodDark: texturedToy('wood', palette.woodDark, { repeat: 2, roughness: 0.85, normalScale: 0.3, gain: 2.1 }),
    Inner: paper(palette.paper, { roughness: 0.9 }),
    Trim: paper(palette.accent),
  };
  const ready = loadModel('/assets/models/bookcase.glb').then((model) => {
    model.traverse((o) => {
      if (o instanceof Mesh && !Array.isArray(o.material)) {
        const m = materials[o.material.name];
        if (m) o.material = m;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.add(model);
  });

  const slots: Vector3[] = [];
  const inner = W - 2 * SIDE - 0.06;
  for (let i = 0; i < 6; i += 1) {
    const x = -inner / 2 + (inner / 6) * (i + 0.5);
    slots.push(new Vector3(x, SHELF_BOOKS_Y, D / 2 - 0.13));
  }

  return {
    group: g,
    slots,
    top: new Vector3(0, H, 0),
    lowerShelf: new Vector3(0, SHELF_LOW_Y, 0),
    size: { w: W, h: H, d: D },
    ready,
  };
}
