// 自製圓潤擺設（玩具風，取代 Kenney 低多邊形）：邊桌、落地燈、盆栽、小熊、收音機、小盆栽、書堆。
// 全部程序生成、跟色板走、底部貼地（y=0）、朝 +z。
import { ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, TorusGeometry, type BufferGeometry, type Material } from 'three';
import { paper, roundedBox } from '../materials';
import type { Palette } from '../palette';

const mk = (geo: BufferGeometry, mat: Material): Mesh => {
  const m = new Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

export function makeSideTable(p: Palette): Group {
  const g = new Group();
  const wood = paper(p.wood);
  const top = mk(roundedBox(0.62, 0.06, 0.5, 0.03), wood);
  top.position.y = 0.55;
  g.add(top);
  for (const [x, z] of [[-0.26, -0.19], [0.26, -0.19], [-0.26, 0.19], [0.26, 0.19]] as Array<[number, number]>) {
    const leg = mk(new CylinderGeometry(0.03, 0.035, 0.53, 14), wood);
    leg.position.set(x, 0.265, z);
    g.add(leg);
  }
  return g;
}

export function makeFloorLamp(p: Palette): Group {
  const g = new Group();
  const base = mk(new CylinderGeometry(0.14, 0.16, 0.05, 24), paper(p.woodDark));
  base.position.y = 0.025;
  const pole = mk(new CylinderGeometry(0.02, 0.02, 1.1, 12), paper(p.woodDark));
  pole.position.y = 0.6;
  const shade = mk(new CylinderGeometry(0.16, 0.24, 0.32, 28, 1, true), new MeshStandardMaterial({ color: p.accent, roughness: 0.7, side: 2 }));
  shade.position.y = 1.28;
  const bulb = mk(new SphereGeometry(0.06, 14, 12), new MeshStandardMaterial({ color: 0xfff1b0, emissive: 0xffe08a, emissiveIntensity: 0.6, roughness: 0.5 }));
  bulb.position.y = 1.22;
  g.add(base, pole, shade, bulb);
  return g;
}

export function makePlant(p: Palette, size = 1): Group {
  const g = new Group();
  const pot = mk(new CylinderGeometry(0.16 * size, 0.12 * size, 0.24 * size, 20), paper(p.rug));
  pot.position.y = 0.12 * size;
  const rim = mk(new TorusGeometry(0.16 * size, 0.02 * size, 10, 24), paper(p.rug));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.24 * size;
  g.add(pot, rim);
  const leaf = paper(0x6fbf73);
  const leafDark = paper(0x4f9f5a);
  const blobs: Array<[number, number, number, number]> = [[0, 0.42, 0, 0.17], [-0.12, 0.36, 0.05, 0.12], [0.13, 0.38, -0.03, 0.13], [0.03, 0.34, 0.13, 0.11], [-0.05, 0.52, -0.06, 0.1]];
  blobs.forEach(([x, y, z, r], i) => {
    const b = mk(new SphereGeometry(r * size, 16, 12), i % 2 ? leafDark : leaf);
    b.position.set(x * size, y * size, z * size);
    b.scale.set(1, 0.8, 1);
    g.add(b);
  });
  return g;
}

export function makeBear(p: Palette): Group {
  const g = new Group();
  const fur = paper(0xd9a066, { roughness: 0.85 });
  const cream = paper(0xf6dfc0, { roughness: 0.85 });
  const body = mk(new SphereGeometry(0.13, 18, 14), fur);
  body.scale.set(1, 1.1, 0.9);
  body.position.y = 0.14;
  const belly = mk(new SphereGeometry(0.08, 14, 12), cream);
  belly.scale.set(1, 1, 0.5);
  belly.position.set(0, 0.13, 0.1);
  const head = mk(new SphereGeometry(0.11, 18, 14), fur);
  head.position.set(0, 0.32, 0.02);
  const muzzle = mk(new SphereGeometry(0.05, 12, 10), cream);
  muzzle.scale.set(1.2, 0.8, 0.7);
  muzzle.position.set(0, 0.29, 0.1);
  g.add(body, belly, head, muzzle);
  for (const s of [-1, 1]) {
    const ear = mk(new SphereGeometry(0.04, 12, 10), fur);
    ear.position.set(0.08 * s, 0.41, 0);
    const arm = mk(new SphereGeometry(0.045, 12, 10), fur);
    arm.scale.set(1, 1.6, 1);
    arm.position.set(0.14 * s, 0.14, 0.03);
    const leg = mk(new SphereGeometry(0.05, 12, 10), fur);
    leg.scale.set(1, 0.8, 1.4);
    leg.position.set(0.08 * s, 0.05, 0.1);
    const eye = mk(new SphereGeometry(0.014, 10, 8), paper(0x2b2220));
    eye.position.set(0.04 * s, 0.34, 0.1);
    g.add(ear, arm, leg, eye);
  }
  const nose = mk(new SphereGeometry(0.016, 10, 8), paper(0x2b2220));
  nose.position.set(0, 0.31, 0.15);
  g.add(nose);
  g.scale.setScalar(1.15);
  return g;
}

export function makeRadio(p: Palette): Group {
  const g = new Group();
  const body = mk(roundedBox(0.3, 0.2, 0.14, 0.04), paper(p.accent));
  body.position.y = 0.1;
  const grill = mk(roundedBox(0.14, 0.12, 0.02, 0.02), paper(p.paper));
  grill.position.set(-0.05, 0.1, 0.07);
  g.add(body, grill);
  for (const y of [0.13, 0.07]) {
    const knob = mk(new CylinderGeometry(0.02, 0.02, 0.02, 12), paper(p.ink));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.08, y, 0.075);
    g.add(knob);
  }
  const antenna = mk(new CylinderGeometry(0.006, 0.006, 0.22, 6), paper(p.ink));
  antenna.position.set(0.12, 0.3, -0.03);
  antenna.rotation.z = -0.3;
  g.add(antenna);
  return g;
}

export function makeBookStack(p: Palette): Group {
  const g = new Group();
  const cols = [p.accent, p.sky, p.rug];
  cols.forEach((c, i) => {
    const b = mk(roundedBox(0.22 - i * 0.02, 0.035, 0.16, 0.012), paper(c));
    b.position.set(i * 0.01, 0.0175 + i * 0.035, 0);
    b.rotation.y = (i - 1) * 0.12;
    g.add(b);
  });
  return g;
}
