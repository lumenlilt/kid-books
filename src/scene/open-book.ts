import { Box3, BoxGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type Texture } from 'three';
import { paper, roundedBox } from './materials';

export interface OpenBookOptions {
  pageW: number;
  pageH: number;
  cover: Texture;
  coverColor: number;
  paperColor: number;
}

/**
 * 可翻開的書。本體座標：書脊在 x=0、右頁在 +x、法線 +z（朝讀者）。
 * 左半（左頁塊＋封面）掛在 hinge 上：閉合時疊在右頁塊上方，繞 y 軸轉 -π 後翻到 -x 且與右頁同高——
 * 真書的書脊有厚度，這裡用 hinge 的 z 位移從 t 補到 0 來作弊，小孩看不出來。
 */
export class OpenBook {
  readonly group = new Group();
  readonly hinge = new Group();
  /** 立體書舞台掛這裡：右頁表面、書脊處 */
  readonly stageAnchor = new Group();
  readonly pageW: number;
  readonly pageH: number;
  readonly thick = 0.05;
  readonly coverThick = 0.012;
  readonly margin = 0.02;
  private readonly disposables: Array<{ dispose(): void }> = [];
  private openness = 0;

  constructor(o: OpenBookOptions) {
    this.pageW = o.pageW;
    this.pageH = o.pageH;
    const { pageW, pageH, thick: t, coverThick: c, margin: m } = this;
    const pages = paper(o.paperColor, { flat: false });
    const coverSide = paper(o.coverColor, { flat: false });
    const coverFace = new MeshStandardMaterial({ map: o.cover, roughness: 0.9, metalness: 0 });
    this.disposables.push(pages, coverSide, coverFace);

    const block = roundedBox(pageW, pageH, t);
    const coverGeo = roundedBox(pageW + m, pageH + 2 * m, c);
    this.disposables.push(block, coverGeo);

    const right = new Mesh(block, pages);
    right.position.set(pageW / 2, 0, 0);
    const backCover = new Mesh(coverGeo, coverSide);
    backCover.position.set(pageW / 2 + m / 2, 0, -t / 2 - c / 2);
    this.group.add(right, backCover);

    const left = new Mesh(block, pages);
    left.position.set(pageW / 2, 0, 0);
    // BoxGeometry 材質順序：+x, -x, +y, -y, +z, -z；封面貼圖在 +z（閉合時朝讀者）
    const frontCover = new Mesh(coverGeo, [coverSide, coverSide, coverSide, coverSide, coverFace, pages]);
    frontCover.position.set(pageW / 2 + m / 2, 0, t / 2 + c / 2);
    this.hinge.add(left, frontCover);
    this.group.add(this.hinge);

    this.stageAnchor.position.set(0, 0, t / 2);
    this.group.add(this.stageAnchor);

    this.group.traverse((obj) => {
      if (obj instanceof Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.setOpen(0);
  }

  /** 0 閉合 … 1 全開 */
  setOpen(k: number): void {
    this.openness = k;
    this.hinge.rotation.y = -Math.PI * k;
    this.hinge.position.z = this.thick * (1 - k);
  }

  get open(): number {
    return this.openness;
  }

  /** 全開狀態下整本書（不含舞台）的八個角，世界座標 */
  corners(out: Vector3[] = []): Vector3[] {
    const { pageW, pageH, thick: t, coverThick: c, margin: m } = this;
    const box = new Box3(new Vector3(-pageW - m, -pageH / 2 - m, -t / 2 - c), new Vector3(pageW + m, pageH / 2 + m, t / 2));
    out.length = 0;
    this.group.updateMatrixWorld(true);
    for (let i = 0; i < 8; i += 1) {
      const v = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      out.push(this.group.localToWorld(v));
    }
    return out;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.group.removeFromParent();
  }
}
