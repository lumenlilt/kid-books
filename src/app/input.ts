import { Raycaster, Vector2, type Camera, type Intersection, type Object3D } from 'three';

export type TapHandler = (hit: Intersection) => void;

export interface Input {
  /** 註冊可點的物件（含子孫）；回傳解除函式 */
  onTap(object: Object3D, handler: TapHandler): () => void;
  setEnabled(enabled: boolean): void;
  /** 最近一次指標位置，-1..1，給視差用；沒有指標時慢慢回 0 */
  readonly pointer: { x: number; y: number; active: boolean };
}

const TAP_MAX_MOVE_PX = 12;
const TAP_MAX_MS = 600;

export function createInput(canvas: HTMLCanvasElement, camera: Camera): Input {
  const targets = new Map<Object3D, TapHandler>();
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  const pointer = { x: 0, y: 0, active: false };
  let enabled = true;
  let down: { id: number; x: number; y: number; t: number } | null = null;

  const toNdc = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };

  canvas.addEventListener('pointermove', (e) => {
    toNdc(e);
    pointer.x = ndc.x;
    pointer.y = ndc.y;
    pointer.active = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointercancel', () => {
    down = null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || down.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const held = performance.now() - down.t;
    down = null;
    if (!enabled || moved > TAP_MAX_MOVE_PX || held > TAP_MAX_MS) return;
    toNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...targets.keys()], true);
    const hit = hits[0];
    if (!hit) return;
    // 找到被註冊的那個祖先
    let o: Object3D | null = hit.object;
    while (o && !targets.has(o)) o = o.parent;
    if (o) targets.get(o)?.(hit);
  });

  return {
    pointer,
    onTap(object, handler) {
      targets.set(object, handler);
      return () => {
        targets.delete(object);
      };
    },
    setEnabled(v) {
      enabled = v;
    },
  };
}
