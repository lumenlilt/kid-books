import { Box3, BoxGeometry, EdgesGeometry, Group, LineDashedMaterial, LineSegments, Mesh, MeshStandardMaterial, PlaneGeometry, Vector3, type Object3D } from 'three';
import { createDecor, type Decor } from './decor';
import { makeBear, makeBookStack, makeFloorLamp, makePlant, makeRadio, makeSideTable } from './props/furniture';
import { woodFloorTexture } from './decor';
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
  update(dt: number): void;
  setNight(amount: number): void;
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

  const floorMat = paper(palette.floor, { flat: false });
  floorMat.map = woodFloorTexture(palette);
  const floor = new Mesh(new PlaneGeometry(9, 9), floorMat);
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

  const decor: Decor = createDecor(palette);
  g.add(decor.group);

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

  // 擺設全是自製圓潤模型（玩具風，D27）；名字沿用舊的 Kenney 名以免點擊註冊處要改
  const place = (name: string, obj: Group, x: number, y: number, z: number, rotY = 0) => {
    obj.position.set(x, y, z);
    obj.rotation.y = rotY;
    obj.name = `prop:${name}`;
    g.add(obj);
    props.set(name, obj);
    return obj;
  };
  place('lampRoundFloor', makeFloorLamp(palette), -2.4, 0, -0.7);
  place('sideTable', makeSideTable(palette), -2.35, 0, -1.7);
  place('pottedPlant', makePlant(palette, 1), 2.5, 0, -1.7);
  place('plantSmall1', makePlant(palette, 0.45), -0.55, lowerShelfY, -2.05);
  place('books', makeBookStack(palette), 0.35, lowerShelfY, -2.05, 0.4);
  place('bear', makeBear(palette), 1.25, 0, -0.15, -0.5);
  place('radio', makeRadio(palette), 2.9, 0, -2.0, -0.2);
  const ready = Promise.resolve();

  const mounted = new Map<string, Object3D>();
  return {
    group: g,
    window,
    props,
    slots,
    ready,
    update(dt) {
      decor.update(dt);
      window.update(dt);
    },
    setNight(amount) {
      decor.setNight(amount);
    },
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
