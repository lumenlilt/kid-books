import { ConeGeometry, CylinderGeometry, Group, Mesh, SphereGeometry, type BufferGeometry } from 'three';
import { hourAngle, minuteAngle } from '../../lib/clock-math';
import { easeOutBack, tween } from '../../lib/tween';
import { paper, roundedBox } from '../materials';

/** 讀完時鐘書的獎勵：牆上一座會走的咕咕鐘（顯示真實時間、鐘擺會擺、整點或點它鳥會探頭）。 */
export interface CuckooClock {
  group: Group;
  update(dt: number): void;
  setTime(h: number, m: number): void;
  /** 鳥探頭 */
  pop(): Promise<unknown>;
  /** 從無到有的登場 */
  reveal(): Promise<unknown>;
}

export function createCuckooClock(accent: number): CuckooClock {
  const g = new Group();
  const wood = paper(0x8a5a3c);
  const dark = paper(0x5e3b27);
  const cream = paper(0xfff6e5, { flat: false });
  const mk = (geo: BufferGeometry, mat = wood) => {
    const m = new Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  const body = mk(roundedBox(0.28, 0.34, 0.12));
  body.position.set(0, 0.05, 0);
  g.add(body);
  const roof = mk(new ConeGeometry(0.2, 0.17, 24), dark);
  roof.position.set(0, 0.3, 0);
  g.add(roof);
  const face = mk(new CylinderGeometry(0.1, 0.1, 0.02, 32), cream);
  face.rotation.x = Math.PI / 2;
  face.position.set(0, 0.03, 0.065);
  g.add(face);
  const rim = mk(new CylinderGeometry(0.112, 0.112, 0.012, 32), dark);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.03, 0.058);
  g.add(rim);
  const hourHand = new Group();
  hourHand.position.set(0, 0.03, 0.078);
  const hm = mk(roundedBox(0.016, 0.055, 0.006), paper(0x2b2220, { flat: false }));
  hm.position.y = 0.024;
  hourHand.add(hm);
  const minuteHand = new Group();
  minuteHand.position.set(0, 0.03, 0.084);
  const mm = mk(roundedBox(0.012, 0.08, 0.006), paper(0xd9534f, { flat: false }));
  mm.position.y = 0.036;
  minuteHand.add(mm);
  g.add(hourHand, minuteHand);
  // 小門與鳥
  const door = mk(roundedBox(0.08, 0.07, 0.01), dark);
  door.position.set(0, 0.19, 0.062);
  g.add(door);
  const bird = new Group();
  bird.position.set(0, 0.19, 0.04);
  const birdBody = mk(new SphereGeometry(0.028, 12, 10), paper(accent, { flat: false }));
  bird.add(birdBody);
  const beak = mk(new ConeGeometry(0.01, 0.025, 6), paper(0xffd45a, { flat: false }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0, 0.035);
  bird.add(beak);
  bird.visible = false;
  g.add(bird);
  // 鐘擺與兩個重錘
  const pendulum = new Group();
  pendulum.position.set(0, -0.12, 0.04);
  const rod = mk(roundedBox(0.012, 0.16, 0.008), paper(0xffd45a, { flat: false }));
  rod.position.y = -0.08;
  pendulum.add(rod);
  const bob = mk(new CylinderGeometry(0.03, 0.03, 0.012, 20), paper(0xffd45a, { flat: false }));
  bob.rotation.x = Math.PI / 2;
  bob.position.y = -0.16;
  pendulum.add(bob);
  g.add(pendulum);
  for (const s of [-1, 1]) {
    const chain = mk(roundedBox(0.006, 0.12, 0.006), dark);
    chain.position.set(0.07 * s, -0.18, 0.02);
    g.add(chain);
    const weight = mk(new ConeGeometry(0.02, 0.06, 8), paper(0xffd45a, { flat: false }));
    weight.rotation.x = Math.PI;
    weight.position.set(0.07 * s, -0.27, 0.02);
    g.add(weight);
  }

  let t = 0;
  let popping = false;
  return {
    group: g,
    update(dt) {
      t += dt;
      pendulum.rotation.z = Math.sin(t * 3.2) * 0.32;
    },
    setTime(h, m) {
      hourHand.rotation.z = (-hourAngle(h, m) * Math.PI) / 180;
      minuteHand.rotation.z = (-minuteAngle(m) * Math.PI) / 180;
    },
    pop() {
      if (popping) return Promise.resolve();
      popping = true;
      bird.visible = true;
      return tween({
        duration: 1400,
        onUpdate: (k) => {
          const out = Math.sin(Math.min(1, k * 1.15) * Math.PI);
          bird.position.z = 0.04 + out * 0.09;
          door.rotation.y = -out * 1.2;
          bird.rotation.z = Math.sin(k * Math.PI * 6) * 0.2 * out;
        },
      }).finished.then(() => {
        bird.visible = false;
        door.rotation.y = 0;
        popping = false;
      });
    },
    reveal() {
      g.scale.setScalar(0.001);
      return tween({
        duration: 800,
        ease: easeOutBack,
        onUpdate: (k) => g.scale.setScalar(Math.max(0.001, k)),
      }).finished.then(() => {
        g.scale.setScalar(1);
      });
    },
  };
}
