import { Box3, BoxGeometry, EdgesGeometry, Group, LineDashedMaterial, LineSegments, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3, type Object3D } from 'three';
import { loadModel, modelUrl } from './assets';
import { paper } from './materials';
import type { Palette } from './palette';
import { createWindow, type RoomWindow } from './window';

export interface DecorationSlot {
  id: string;
  position: Vector3;
  size: Vector3;
  silhouette: LineSegments;
}

export interface Room {
  group: Group;
  window: RoomWindow;
  /** 依名字拿擺設（給點擊互動用） */
  props: Map<string, Object3D>;
  slots: DecorationSlot[];
  ready: Promise<void>;
  /** 把裝飾放進空位（剪影隱藏）；傳 null 清空回剪影 */
  setDecoration(slotId: string, object: Object3D | null): void;
}

const _box = new Box3();
const _size = new Vector3();

/** 把模型等比縮到指定高度，底部貼地、置中。 */
export function fitHeight(obj: Object3D, height: number): void {
  _box.setFromObject(obj);
  _box.getSize(_size);
  const s = height / (_size.y || 1);
  obj.scale.multiplyScalar(s);
  _box.setFromObject(obj);
  obj.position.y -= _box.min.y;
  obj.position.x -= (_box.min.x + _box.max.x) / 2;
  obj.position.z -= (_box.min.z + _box.max.z) / 2;
}

/** 換掉模型自己的顏色（先 clone 材質，模型快取是共用的）。 */
export function tint(obj: Object3D, color: number): void {
  obj.traverse((o) => {
    if (o instanceof Mesh && o.material instanceof MeshStandardMaterial) {
      const m = o.material.clone();
      m.color.set(color);
      o.material = m;
    }
  });
}

export function createRoom(palette: Palette, lowerShelfY = 0.55): Room {
  const g = new Group();
  const props = new Map<string, Object3D>();

  const floor = new Mesh(new PlaneGeometry(9, 9), paper(palette.floor, { flat: false }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);

  const wallMat = paper(palette.wall, { flat: false });
  const back = new Mesh(new PlaneGeometry(9, 3.4), wallMat);
  back.position.set(0, 1.7, -2.5);
  back.receiveShadow = true;
  g.add(back);
  const left = new Mesh(new PlaneGeometry(6, 3.4), wallMat);
  left.position.set(-3.6, 1.7, 0.5);
  left.rotation.y = Math.PI / 2;
  left.receiveShadow = true;
  g.add(left);
  const right = new Mesh(new PlaneGeometry(6, 3.4), wallMat);
  right.position.set(3.6, 1.7, 0.5);
  right.rotation.y = -Math.PI / 2;
  right.receiveShadow = true;
  g.add(right);
  const skirting = new Mesh(new BoxGeometry(9, 0.12, 0.04), paper(palette.wallTrim, { flat: false }));
  skirting.position.set(0, 0.06, -2.48);
  g.add(skirting);

  const window = createWindow(palette);
  window.group.position.set(1.75, 1.85, -2.45);
  g.add(window.group);

  // 裝飾空位：虛線剪影。空位是「這裡可以放什麼？」的問句。
  const slots: DecorationSlot[] = [];
  const addSlot = (id: string, position: Vector3, size: Vector3) => {
    const edges = new EdgesGeometry(new BoxGeometry(size.x, size.y, size.z));
    const line = new LineSegments(edges, new LineDashedMaterial({ color: palette.ink, dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.55 }));
    line.computeLineDistances();
    line.position.copy(position);
    g.add(line);
    slots.push({ id, position, size, silhouette: line });
  };
  addSlot('wall-left', new Vector3(-1.75, 1.95, -2.4), new Vector3(0.34, 0.5, 0.14));
  addSlot('floor-right', new Vector3(2.4, 0.2, 0.2), new Vector3(0.4, 0.4, 0.4));
  addSlot('table-top', new Vector3(-2.35, 0.75, -1.7), new Vector3(0.22, 0.26, 0.22));

  const place = async (name: string, height: number, x: number, z: number, rotY = 0) => {
    const m = await loadModel(modelUrl(name));
    fitHeight(m, height);
    const holder = new Group();
    holder.add(m);
    holder.position.set(x, 0, z);
    holder.rotation.y = rotY;
    holder.name = `prop:${name}`;
    g.add(holder);
    props.set(name, holder);
    return holder;
  };

  const ready = (async () => {
    await Promise.all([
      place('rugRound', 0.03, 0, 1.15).then((h) => {
        h.scale.multiplyScalar(2.4);
        tint(h, palette.rug);
      }),
      place('lampRoundFloor', 1.45, -2.4, -0.7),
      place('sideTable', 0.55, -2.35, -1.7),
      place('pottedPlant', 0.95, 2.5, -1.7),
      place('plantSmall1', 0.28, -0.55, -2.05).then((h) => {
        h.position.y = lowerShelfY;
      }),
      place('books', 0.16, 0.35, -2.05, 0.4).then((h) => {
        h.position.y = lowerShelfY;
      }),
      place('bear', 0.38, 1.35, 0.55, -0.6),
      place('radio', 0.22, 2.5, -1.7).then((h) => {
        h.position.set(2.9, 0, -2.0);
      }),
    ]);
  })();

  const mounted = new Map<string, Object3D>();
  return {
    group: g,
    window,
    props,
    slots,
    ready,
    setDecoration(slotId, object) {
      const slot = slots.find((x) => x.id === slotId);
      if (!slot) return;
      const prev = mounted.get(slotId);
      if (prev) {
        g.remove(prev);
        mounted.delete(slotId);
      }
      slot.silhouette.visible = object === null;
      if (object) {
        object.position.copy(slot.position);
        g.add(object);
        mounted.set(slotId, object);
      }
    },
  };
}
