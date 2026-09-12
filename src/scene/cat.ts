import { Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { easeInOutSine, easeOutBack, lerp, tween } from '../lib/tween';
import { loadModel } from './assets';
import { applyToyShading } from './materials';
import { fitHeight } from './room';

/**
 * 書架上的貓：模型由 tools/blender/cat.py 生成（DECISIONS D13、D20），這裡只做動畫。
 * 介面是物件名：Cat / Body / Head / EyeL / EyeR / Mouth / Tail / Collar / Bell。
 */
export interface Cat {
  group: Group;
  update(dt: number): void;
  /** 被摸：跳一下 */
  poke(): Promise<unknown>;
  /** 講話中：嘴巴開合（估時模式） */
  setTalking(on: boolean): void;
  /** 有音檔時：嘴巴開度 0..1 跟著音量 */
  setMouth(level: number): void;
  /** 記住現在的位置與朝向當「家」（書架頂） */
  setHome(): void;
  /** 抬頭／低頭（弧度，負值抬頭）：在書角時鏡頭從上往下看，抬一點才像在看小孩 */
  setHeadPitch(rad: number): void;
  /** 拋物線跳到世界座標某點並轉向 */
  jumpTo(target: Vector3, rotationY: number, ms?: number, scale?: number): Promise<unknown>;
  jumpHome(ms?: number): Promise<unknown>;
}

const CAT_HEIGHT = 0.56;

export async function createCat(accent: number): Promise<Cat> {
  const g = new Group();
  const model = await loadModel('/assets/models/cat.glb');
  fitHeight(model, CAT_HEIGHT);
  model.traverse((o) => {
    if (o instanceof Mesh && !Array.isArray(o.material)) applyToyShading(o.material);
  });
  g.add(model);

  const part = (name: string): Object3D | null => model.getObjectByName(name) ?? null;
  const body = part('Body');
  const head = part('Head');
  const eyes = [part('EyeL'), part('EyeR')].filter((o): o is Object3D => o !== null);
  const mouth = part('Mouth');
  const tail = part('Tail');
  const collar = part('Collar');
  if (collar instanceof Mesh && collar.material instanceof MeshStandardMaterial) {
    const m = collar.material.clone();
    m.color.set(accent);
    collar.material = m;
  }

  const baseScaleY = body?.scale.y ?? 1;
  const headRot = head ? head.rotation.clone() : null;
  const tailRot = tail ? tail.rotation.clone() : null;
  const mouthScaleY = mouth?.scale.y ?? 1;
  const eyeScaleY = eyes[0]?.scale.y ?? 1;

  let t = 0;
  let blinkAt = 2.5;
  let blinkPhase = -1;
  let talking = false;
  let mouthLevel = 0;
  let headPitch = 0;
  const basePos = new Vector3();
  const home = new Vector3();
  let homeRotY = 0;
  const jumpTo = makeJump(g);

  return {
    group: g,
    update(dt) {
      t += dt;
      if (body) body.scale.y = baseScaleY * (1 + Math.sin(t * 2.2) * 0.02); // 呼吸
      if (head && headRot) {
        head.rotation.x = headRot.x + headPitch;
        head.rotation.z = headRot.z + Math.sin(t * 0.7) * 0.06;
        head.rotation.y = headRot.y + Math.sin(t * 0.45) * 0.14;
      }
      if (tail && tailRot) {
        tail.rotation.y = tailRot.y + Math.sin(t * 1.8) * 0.35;
        tail.rotation.x = tailRot.x + Math.sin(t * 1.1) * 0.08;
      }
      // 眨眼：每 2.5–5 秒一次，120 ms
      if (blinkPhase < 0 && t > blinkAt) blinkPhase = 0;
      if (blinkPhase >= 0) {
        blinkPhase += dt;
        const k = blinkPhase < 0.06 ? 1 - blinkPhase / 0.06 : (blinkPhase - 0.06) / 0.06;
        const sy = Math.max(0.08, Math.min(1, k));
        for (const e of eyes) e.scale.y = eyeScaleY * sy;
        if (blinkPhase > 0.12) {
          blinkPhase = -1;
          blinkAt = t + 2.5 + Math.random() * 2.5;
          for (const e of eyes) e.scale.y = eyeScaleY;
        }
      }
      if (mouth) mouth.scale.y = mouthScaleY * (mouthLevel > 0.02 ? 1 + mouthLevel * 4 : talking ? 1 + Math.abs(Math.sin(t * 14)) * 3.5 : 1);
    },
    poke() {
      basePos.copy(g.position);
      return tween({
        duration: 550,
        ease: easeOutBack,
        onUpdate: (k) => {
          const up = Math.sin(k * Math.PI) * 0.22;
          g.position.y = basePos.y + up;
          g.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.08);
        },
      }).finished.then(() => {
        g.position.copy(basePos);
        g.scale.setScalar(1);
      });
    },
    setTalking(on) {
      talking = on;
    },
    setMouth(level) {
      mouthLevel = level;
    },
    setHome() {
      home.copy(g.position);
      homeRotY = g.rotation.y;
    },
    setHeadPitch(rad) {
      headPitch = rad;
    },
    jumpTo,
    jumpHome(ms = 650) {
      return jumpTo(home.clone(), homeRotY, ms);
    },
  };
}

function makeJump(g: Group) {
  return (target: Vector3, rotationY: number, ms = 650, scale = 1): Promise<unknown> => {
      const from = g.position.clone();
      const fromRot = g.rotation.y;
      const fromScale = g.scale.y;
      const arc = 0.45 + from.distanceTo(target) * 0.15;
      return tween({
        duration: ms,
        ease: easeInOutSine,
        onUpdate: (k) => {
          g.position.lerpVectors(from, target, k);
          g.position.y += Math.sin(k * Math.PI) * arc;
          g.rotation.y = lerp(fromRot, rotationY, k);
          // 起跳蹲一下、落地回彈
          const squash = 1 - Math.sin(k * Math.PI) * 0.06;
          const base = lerp(fromScale, scale, k);
          g.scale.set(base / squash, base * squash, base / squash);
        },
      }).finished.then(() => {
        g.position.copy(target);
        g.rotation.y = rotationY;
        g.scale.setScalar(scale);
      });
  };
}
