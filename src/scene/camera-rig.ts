import { Vector3, type PerspectiveCamera } from 'three';
import { easeInOutCubic, lerp, tween } from '../lib/tween';

export interface Pose {
  readonly position: Vector3;
  readonly target: Vector3;
  readonly fov: number;
}

export type PoseName = 'shelf' | 'reading' | 'decoration';

export interface CameraRig {
  readonly pose: PoseName;
  poses: Record<PoseName, Pose>;
  goTo(name: PoseName, ms?: number): Promise<void>;
  /** 不動畫、直接到位（轉向重算時用） */
  snapTo(name: PoseName): void;
  /** 每幀：套視差（指標 -1..1）並 lookAt */
  update(dt: number, pointer: { x: number; y: number; active: boolean }): void;
  /** 視差幅度（世界單位）；閱讀時設 0 */
  parallax: number;
}

export function createCameraRig(camera: PerspectiveCamera): CameraRig {
  const poses: Record<PoseName, Pose> = {
    shelf: { position: new Vector3(0, 1.4, 3.0), target: new Vector3(0, 1.05, -1.2), fov: 36 },
    reading: { position: new Vector3(0, 1.9, 2.4), target: new Vector3(0, 1.2, 0), fov: 36 },
    decoration: { position: new Vector3(-0.6, 1.9, 0.6), target: new Vector3(-1.75, 1.85, -2.4), fov: 30 },
  };
  const basePos = poses.shelf.position.clone();
  const baseTarget = poses.shelf.target.clone();
  let baseFov = poses.shelf.fov;
  const offset = new Vector3();
  const wanted = new Vector3();
  let current: PoseName = 'shelf';
  let moving = false;

  const rig: CameraRig = {
    get pose() {
      return current;
    },
    poses,
    parallax: 0.12,
    async goTo(name, ms = 900) {
      const from = { p: basePos.clone(), t: baseTarget.clone(), f: baseFov };
      const to = poses[name];
      current = name;
      moving = true;
      await tween({
        duration: ms,
        ease: easeInOutCubic,
        onUpdate: (k) => {
          basePos.lerpVectors(from.p, to.position, k);
          baseTarget.lerpVectors(from.t, to.target, k);
          baseFov = lerp(from.f, to.fov, k);
          camera.fov = baseFov;
          camera.updateProjectionMatrix();
        },
      }).finished;
      moving = false;
    },
    snapTo(name) {
      const to = poses[name];
      current = name;
      basePos.copy(to.position);
      baseTarget.copy(to.target);
      baseFov = to.fov;
      camera.fov = baseFov;
      camera.updateProjectionMatrix();
      // 立刻到位：呼叫端接著就要用鏡頭矩陣投影，不能等下一幀的 update()
      offset.set(0, 0, 0);
      camera.position.copy(basePos);
      camera.lookAt(baseTarget);
      camera.updateMatrixWorld(true);
    },
    update(dt, pointer) {
      const amount = moving ? 0 : rig.parallax;
      wanted.set(pointer.active ? pointer.x * amount : 0, pointer.active ? pointer.y * amount * 0.6 : 0, 0);
      const k = 1 - Math.exp(-dt * 4);
      offset.lerp(wanted, k);
      camera.position.copy(basePos).add(offset);
      camera.lookAt(baseTarget);
    },
  };
  camera.fov = baseFov;
  camera.updateProjectionMatrix();
  return rig;
}
