// 房間擺設：模型由 tools/blender/props.py 生成（D31），這裡只載入、依材質名染色板、包成 Group。
// 名字沿用舊的 Kenney 名字（room.ts 的點擊註冊靠它）。
import { Group, Mesh, type MeshStandardMaterial } from 'three';
import { loadModel } from '../assets';
import { paper, texturedToy } from '../materials';
import type { Palette } from '../palette';

type MatMap = Record<string, MeshStandardMaterial>;

function fromGlb(name: string, mats: MatMap, scale = 1): Group {
  const g = new Group();
  void loadModel(`/assets/models/prop-${name}.glb`).then((model) => {
    model.traverse((o) => {
      if (o instanceof Mesh && !Array.isArray(o.material)) {
        const m = mats[o.material.name];
        if (m) o.material = m;
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    model.scale.setScalar(scale);
    g.add(model);
  });
  return g;
}

const woodMats = (p: Palette): MatMap => ({
  Wood: texturedToy('wood', p.wood, { repeat: 2, roughness: 0.75, normalScale: 0.4, gain: 2.4 }),
  WoodDark: texturedToy('wood', p.woodDark, { repeat: 2, roughness: 0.8, normalScale: 0.3, gain: 2.1 }),
  Gold: paper(0xffd45a, { roughness: 0.45 }),
});

export const makeSideTable = (p: Palette): Group => fromGlb('sidetable', woodMats(p));

export function makeFloorLamp(p: Palette): Group {
  const bulb = paper(0xfff1b0, { roughness: 0.4 });
  bulb.emissive.setHex(0xffe08a);
  bulb.emissiveIntensity = 0.5;
  return fromGlb('floorlamp', { ...woodMats(p), Shade: paper(p.accent, { roughness: 0.6 }), Bulb: bulb });
}

export const makePlant = (p: Palette, size = 1): Group =>
  fromGlb('plant', { Pot: paper(p.rug, { roughness: 0.7 }), Leaf: paper(0x6fbf73, { roughness: 0.7 }), LeafDark: paper(0x4f9f5a, { roughness: 0.7 }), ...woodMats(p) }, size);

export const makeBear = (p: Palette): Group =>
  fromGlb('bear', { Fur: paper(0xd9a066, { roughness: 0.85 }), Cream: paper(0xf6dfc0, { roughness: 0.85 }), Ink: paper(0x2b2220, { roughness: 1 }), Bow: paper(p.accent, { roughness: 0.6 }) }, 1.1);

export const makeRadio = (p: Palette): Group =>
  fromGlb('radio', { Body: paper(p.accent, { roughness: 0.6 }), Grill: paper(p.paper, { roughness: 0.7 }), Knob: paper(p.ink, { roughness: 0.6 }), Gold: paper(0xffd45a, { roughness: 0.45 }) });

export const makeBookStack = (p: Palette): Group =>
  fromGlb('bookstack', { Book1: paper(p.accent), Book2: paper(p.sky), Book3: paper(p.rug) });
