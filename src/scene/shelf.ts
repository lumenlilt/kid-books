import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three';
import { easeOutElastic, tween } from '../lib/tween';
import type { Bookcase } from './bookcase';
import { makeCoverTexture } from './book-cover';
import { paper, roundedBox } from './materials';
import { hex, type Palette } from './palette';

export interface ShelfBookEntry {
  id: string;
  title: string;
  icon: string;
  color: string;
  locked: boolean;
}

export interface ShelfBook {
  entry: ShelfBookEntry;
  mesh: Mesh;
  /** 讀完：封面上緣一條金色書籤 */
  setDone(on: boolean): void;
  /** 鎖住的書：晃一下 */
  wiggle(): Promise<unknown>;
  /** 被點到：往前跳一下 */
  bounce(): Promise<unknown>;
}

export interface Shelf {
  group: Group;
  books: Map<string, ShelfBook>;
  hitTargets(): Object3D[];
  /** 某本書在格位上的姿態：世界座標（飛回去用）與書架本地座標（歸位用） */
  slotWorld(id: string): { position: Vector3; local: Vector3; rotationX: number };
}

export const BOOK_SIZE = { w: 0.255, h: 0.4, d: 0.05 } as const;

/** 書封面朝外立在層板上，微微後傾靠著背板——小孩看到的是大而彩色的封面，不是書脊。 */
export function createShelf(bookcase: Bookcase, entries: ShelfBookEntry[], palette: Palette): Shelf {
  const group = new Group();
  const books = new Map<string, ShelfBook>();
  const locals = new Map<string, Vector3>();
  const geometry = roundedBox(BOOK_SIZE.w, BOOK_SIZE.h, BOOK_SIZE.d);
  const lean = -0.12;

  entries.slice(0, bookcase.slots.length).forEach((entry, i) => {
    const slot = bookcase.slots[i];
    if (!slot) return;
    const patterns = ['dots', 'stripes', 'stars'] as const;
    const cover = makeCoverTexture({ color: entry.color, icon: entry.icon, title: entry.title, locked: entry.locked, ink: hex(palette.ink), paper: hex(palette.paper), pattern: patterns[i % patterns.length] });
    const side = paper(entry.locked ? 0xb9b3ad : parseInt(entry.color.slice(1), 16), { flat: false });
    const pages = paper(0xfdf5e6, { flat: false });
    const front = new MeshStandardMaterial({ map: cover, roughness: 0.9, metalness: 0 });
    // BoxGeometry 材質順序：+x, -x, +y, -y, +z(正面), -z
    const mesh = new Mesh(geometry, [pages, side, pages, side, front, side]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set(slot.x, slot.y + BOOK_SIZE.h / 2, slot.z);
    mesh.rotation.x = lean;
    mesh.name = `book:${entry.id}`;
    group.add(mesh);
    locals.set(entry.id, mesh.position.clone());

    const baseZ = mesh.position.z;
    const ribbon = new Mesh(roundedBox(0.05, 0.12, BOOK_SIZE.d + 0.012), paper(0xffd45a, { flat: false }));
    ribbon.position.set(BOOK_SIZE.w * 0.28, BOOK_SIZE.h / 2 - 0.03, 0);
    ribbon.visible = false;
    mesh.add(ribbon);
    books.set(entry.id, {
      entry,
      mesh,
      setDone(on) {
        ribbon.visible = on;
      },
      wiggle: () =>
        tween({
          duration: 600,
          onUpdate: (t) => {
            mesh.rotation.z = Math.sin(t * Math.PI * 6) * 0.12 * (1 - t);
          },
        }).finished,
      bounce: () =>
        tween({
          duration: 700,
          ease: easeOutElastic,
          onUpdate: (t) => {
            mesh.position.z = baseZ + 0.08 * (1 - t);
          },
        }).finished,
    });
  });

  return {
    group,
    books,
    hitTargets: () => [...books.values()].map((b) => b.mesh),
    slotWorld(id) {
      const local = locals.get(id) ?? new Vector3();
      group.updateMatrixWorld(true);
      return { position: group.localToWorld(local.clone()), local: local.clone(), rotationX: lean };
    },
  };
}
