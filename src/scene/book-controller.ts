import { PerspectiveCamera, Vector3, type Scene, type WebGLRenderer } from 'three';
import { createActivity } from '../activities/registry';
import type { Activity, ActivityContext } from '../activities/types';
import { createBookFsm, type BookState } from '../app/book-fsm';
import type { AudioBus } from '../app/audio';
import type { Narrator } from '../app/narrator';
import type { ProgressStore } from '../app/store';
import type { BookDef } from '../content/schema';
import { fromTotal } from '../lib/clock-math';
import { burstStars } from '../overlay/stars';
import { createClockSvg } from '../ui/clock-svg';
import type { Input } from '../app/input';
import { ndcBounds, solveFitDistance } from '../lib/fit-rect';
import { easeInOutCubic, easeOutCubic, tween } from '../lib/tween';
import type { BookOverlay } from '../overlay/book-overlay';
import type { CameraRig } from './camera-rig';
import type { Cat } from './cat';
import { OpenBook } from './open-book';
import type { Palette } from './palette';
import { createClockStage, type ClockStage } from './popup/clock-stage';
import { BOOK_SIZE, type Shelf, type ShelfBook } from './shelf';

export interface BookControllerDeps {
  scene: Scene;
  camera: PerspectiveCamera;
  renderer: WebGLRenderer;
  rig: CameraRig;
  input: Input;
  shelf: Shelf;
  cat: Cat;
  overlay: BookOverlay;
  palette: Palette;
  viewport(): { width: number; height: number };
  hour: number;
  onReading?: (reading: boolean) => void;
  narrator: Narrator;
  books: Record<string, BookDef>;
  hud: { setStars(n: number): void; starTarget: Element };
  uiRoot: HTMLElement;
  store: ProgressStore;
  audio: AudioBus;
  /** 闔書回架之後：這本書是不是剛第一次讀完（獎勵登場用） */
  onCompleted?: (bookId: string, firstTime: boolean) => void;
}

export interface BookController {
  readonly state: BookState;
  readonly current: ShelfBook | null;
  readonly pageIndex: number;
  readonly stars: number;
  open(bookId: string): Promise<void>;
  close(): Promise<void>;
  /** 視口變了：重算閱讀姿態與 DOM 矩形（只在 reading 時有事） */
  relayout(): void;
  update(dt: number): void;
  /** 除錯：閱讀姿態解出的距離 vs 真鏡頭投影的 extent */
  probe(): Record<string, unknown>;
}

const PAGE = { w: 0.64, h: 1.0 } as const;
/** 書躺在讀者前方，幾乎平放（法線朝上偏向讀者），像真的立體書 */
const BOOK_TILT = -1.22;
const READ_PITCH = 0.72; // 鏡頭俯角（弧度）
const BOOK_WORLD = new Vector3(0, 1.0, 0.45);

export function createBookController(d: BookControllerDeps): BookController {
  const fsm = createBookFsm();
  let current: ShelfBook | null = null;
  let book: OpenBook | null = null;
  let stage: ClockStage | null = null;
  const tmp = new Vector3();
  const corners: Vector3[] = [];
  let bookDef: BookDef | null = null;
  let pageIndex = -1;
  let pageAbort: AbortController | null = null;
  let activity: Activity | null = null;
  let completedFirstTime = false;
  const countingIds = (def: BookDef) => def.pages.filter((p) => p.countsForCompletion).map((p) => p.id);

  /** 用一台影子鏡頭試距離：整本書＋舞台都要在 NDC ±margin 內 */
  function solveReadingPose(): { position: Vector3; target: Vector3; fov: number } {
    const fov = 40;
    const target = BOOK_WORLD.clone().add(new Vector3(0, 0.12, -0.05));
    const dir = new Vector3(0, Math.sin(READ_PITCH), Math.cos(READ_PITCH));
    const probe = new PerspectiveCamera(fov, d.camera.aspect, 0.1, 100);
    const pts = book ? book.corners(corners) : [];
    // 舞台立起後的高度也要算進去：書中心往法線方向加 0.75
    if (book) {
      const up = new Vector3(0, 0, 0.75).applyQuaternion(book.group.quaternion);
      for (const p of book.corners([])) pts.push(p.clone().add(up));
    }
    const extentAt = (dist: number) => {
      probe.position.copy(target).addScaledVector(dir, dist);
      probe.lookAt(target);
      probe.updateMatrixWorld(true);
      probe.updateProjectionMatrix();
      let e = 0;
      for (const p of pts) {
        tmp.copy(p).project(probe);
        e = Math.max(e, Math.abs(tmp.x), Math.abs(tmp.y));
      }
      return e;
    };
    const dist = pts.length ? solveFitDistance(extentAt, 2.2, 0.86) : 2.2;
    return { position: target.clone().addScaledVector(dir, dist), target, fov };
  }

  function projectBookRect(): void {
    if (!book) return;
    d.camera.updateMatrixWorld(true);
    const vp = d.viewport();
    const pts = book.corners(corners).map((p) => {
      tmp.copy(p).project(d.camera);
      return { x: tmp.x, y: tmp.y };
    });
    d.overlay.setRect(ndcBounds(pts, vp.width, vp.height), vp);
  }

  function catPerch(): { position: Vector3; rotationY: number } {
    if (!book) return { position: new Vector3(), rotationY: 0 };
    const local = new Vector3(book.pageW - 0.08, -book.pageH / 2 + 0.12, book.thick / 2);
    return { position: book.group.localToWorld(local), rotationY: -0.25 };
  }

  async function open(bookId: string): Promise<void> {
    const sb = d.shelf.books.get(bookId);
    const def = d.books[bookId];
    if (!sb || !def || sb.entry.locked || !fsm.send('TAP')) return;
    current = sb;
    bookDef = def;
    completedFirstTime = false;
    d.narrator.setLines(def.lines, bookId);
    d.store.bookOpened(bookId);
    d.audio.preload(bookId, Object.keys(def.lines));
    d.audio.sfx('whoosh');
    d.input.setEnabled(false);
    const mesh = sb.mesh;

    // 1. 滑出
    const z0 = mesh.position.z;
    await tween({ duration: 280, ease: easeOutCubic, onUpdate: (k) => { mesh.position.z = z0 + 0.22 * k; } }).finished;
    fsm.send('ARRIVED');

    // 2. 飛到閱讀位（同時鏡頭過去）。書從書架座標系脫離、保留世界變換。
    d.scene.attach(mesh);
    const cover = Array.isArray(mesh.material) ? mesh.material[4] : mesh.material;
    const map = cover && 'map' in cover ? (cover as { map: import('three').Texture | null }).map : null;
    if (!map) throw new Error('shelf book has no cover texture');
    book = new OpenBook({ pageW: PAGE.w, pageH: PAGE.h, cover: map, coverColor: parseInt(sb.entry.color.slice(1), 16), paperColor: d.palette.paper });
    book.group.position.copy(BOOK_WORLD);
    book.group.rotation.x = BOOK_TILT;
    book.group.visible = false;
    d.scene.add(book.group);
    stage = createClockStage();
    stage.setHour(d.hour);
    stage.setTime(3, 0);
    stage.setRise(0);
    book.stageAnchor.add(stage.group);

    d.rig.poses.reading = solveReadingPose();
    const from = { p: mesh.position.clone(), r: mesh.rotation.x, s: mesh.scale.x };
    // 閉合書的中心：hinge 疊上去後厚度是 2t+2c，中心在 +z 偏一點
    const closedCenter = book.group.localToWorld(new Vector3(PAGE.w / 2 + book.margin / 2, 0, book.thick / 2 + book.coverThick / 2));
    const scale = (PAGE.w + book.margin) / BOOK_SIZE.w;
    await Promise.all([
      tween({
        duration: 750,
        ease: easeInOutCubic,
        onUpdate: (k) => {
          mesh.position.lerpVectors(from.p, closedCenter, k);
          mesh.position.y += Math.sin(k * Math.PI) * 0.25;
          mesh.rotation.x = from.r + (BOOK_TILT - from.r) * k;
          const s = from.s + (scale - from.s) * k;
          mesh.scale.setScalar(s);
        },
      }).finished,
      d.rig.goTo('reading', 900),
    ]);
    mesh.visible = false;
    book.group.visible = true;
    fsm.send('ARRIVED');

    // 3. 翻開，紙雕隨角度立起
    d.audio.sfx('open');
    await tween({
      duration: 950,
      ease: easeInOutCubic,
      onUpdate: (k) => {
        book?.setOpen(k);
        stage?.setRise(Math.min(1, Math.max(0, (k - 0.35) / 0.65)));
      },
    }).finished;
    fsm.send('OPENED');

    // 4. 閱讀：DOM 貼上、貓跳到書角
    d.rig.parallax = 0.03;
    d.rig.snapTo('reading');
    projectBookRect();
    d.overlay.show();
    d.onReading?.(true);
    const perch = catPerch();
    void d.cat.jumpTo(perch.position, perch.rotationY, 650, 0.62);
    d.input.setEnabled(true);
    d.hud.setStars(d.store.totalStars());
    // 從第一個還沒拿星的計分頁開始；全部讀完就從頭再玩
    const pages = def.pages;
    const progress = d.store.active()?.books[bookId]?.pages ?? {};
    const firstOpen = pages.findIndex((p) => p.countsForCompletion && !(progress[p.id]?.stars ?? 0));
    void startPage(firstOpen < 0 ? 0 : firstOpen);
  }

  function mirror(total: number): void {
    const { h, m } = fromTotal(total);
    stage?.setTime(h, m);
    stage?.setHour(h + m / 60);
  }

  async function startPage(i: number): Promise<void> {
    if (!bookDef || !stage || fsm.state !== 'reading') return;
    const page = bookDef.pages[i];
    if (!page) return;
    pageAbort?.abort();
    d.narrator.stop();
    d.overlay.hideNext();
    d.overlay.deck.replaceChildren();
    pageIndex = i;
    const ac = new AbortController();
    pageAbort = ac;
    const book = bookDef;
    const st = stage;
    const ctx: ActivityContext = {
      book,
      page,
      deck: d.overlay.deck,
      deckSize: d.overlay.deckSize,
      stage: st,
      narrator: d.narrator,
      signal: ac.signal,
      mirror,
      totalStars: () => d.store.bookStars(book.id),
      recordAttempt: () => d.store.recordAttempt(book.id, page.id),
      sfx: (name) => d.audio.sfx(name),
      mountClock(opts = {}) {
        const clock = createClockSvg();
        const box = document.createElement('div');
        box.className = 'clock-box';
        box.style.setProperty('--frac', String(opts.frac ?? 0.92));
        box.append(clock.el);
        (opts.into ?? d.overlay.deck).append(box);
        clock.setInteractive(opts.interactive ?? true);
        clock.onChange((t) => mirror(t));
        ac.signal.addEventListener('abort', () => clock.destroy(), { once: true });
        mirror(clock.getTotal());
        return clock;
      },
      complete: () => void completePage(page, i, ac.signal),
      finish: () => {
        completedFirstTime = d.store.markBookComplete(book.id, countingIds(book));
        void close();
      },
    };
    activity = createActivity(page.activity);
    try {
      await activity.mount(ctx);
      for (const id of page.say) {
        if (ac.signal.aborted) return;
        await d.narrator.say(id);
      }
      if (ac.signal.aborted) return;
      await activity.start();
    } catch (err) {
      if (!(err instanceof Error && err.message === 'aborted')) throw err;
    }
  }

  async function completePage(page: BookDef['pages'][number], i: number, signal: AbortSignal): Promise<void> {
    if (signal.aborted || !bookDef) return;
    if (page.countsForCompletion) {
      const first = d.store.recordPage(bookDef.id, page.id);
      d.audio.sfx('star');
      const from = d.overlay.deck.firstElementChild ?? d.overlay.deck;
      if (first) void burstStars(from, d.hud.starTarget, d.uiRoot).then(() => d.hud.setStars(d.store.totalStars()));
      else void burstStars(from, d.hud.starTarget, d.uiRoot, 4);
    }
    if (page.doneSay) await d.narrator.say(page.doneSay);
    if (signal.aborted) return;
    if (i + 1 < bookDef.pages.length) d.overlay.showNext(() => {
      d.audio.sfx('select');
      void startPage(i + 1);
    });
  }

  async function close(): Promise<void> {
    if (!book || !current || !fsm.send('CLOSE')) return;
    const mesh = current.mesh;
    d.input.setEnabled(false);
    pageAbort?.abort();
    pageAbort = null;
    activity = null;
    d.narrator.stop();
    d.overlay.deck.replaceChildren();
    d.overlay.hide();
    d.onReading?.(false);
    d.audio.sfx('close');
    void d.cat.jumpHome();
    await tween({
      duration: 800,
      ease: easeInOutCubic,
      onUpdate: (k) => {
        const o = 1 - k;
        book?.setOpen(o);
        stage?.setRise(Math.min(1, Math.max(0, (o - 0.35) / 0.65)));
      },
    }).finished;
    fsm.send('CLOSED');

    book.group.visible = false;
    mesh.visible = true;
    const slot = d.shelf.slotWorld(current.entry.id);
    const from = { p: mesh.position.clone(), r: mesh.rotation.x, s: mesh.scale.x };
    d.rig.parallax = 0.12;
    await Promise.all([
      tween({
        duration: 750,
        ease: easeInOutCubic,
        onUpdate: (k) => {
          mesh.position.lerpVectors(from.p, slot.position, k);
          mesh.position.y += Math.sin(k * Math.PI) * 0.25;
          mesh.rotation.x = from.r + (slot.rotationX - from.r) * k;
          mesh.scale.setScalar(from.s + (1 - from.s) * k);
        },
      }).finished,
      d.rig.goTo('shelf', 900),
    ]);
    d.shelf.group.attach(mesh);
    mesh.position.copy(slot.local);
    mesh.rotation.set(slot.rotationX, 0, 0);
    mesh.scale.setScalar(1);
    fsm.send('RETURNED');
    stage?.dispose();
    book.dispose();
    stage = null;
    book = null;
    const finishedId = current.entry.id;
    if (bookDef) {
      current.setDone(d.store.isBookComplete(bookDef.id, countingIds(bookDef)));
      d.audio.unloadBook(bookDef.id);
    }
    current = null;
    d.input.setEnabled(true);
    d.onCompleted?.(finishedId, completedFirstTime);
    completedFirstTime = false;
  }

  return {
    get state() {
      return fsm.state;
    },
    get current() {
      return current;
    },
    get pageIndex() {
      return pageIndex;
    },
    get stars() {
      return bookDef ? d.store.bookStars(bookDef.id) : 0;
    },
    open,
    close,
    relayout() {
      if (fsm.state !== 'reading' || !book) return;
      const pose = solveReadingPose();
      d.rig.poses.reading = pose;
      d.rig.snapTo('reading');
      projectBookRect();
    },
    update(dt) {
      stage?.update(dt);
    },
    probe() {
      if (!book) return { book: null };
      d.camera.updateMatrixWorld(true);
      let e = 0;
      for (const p of book.corners(corners)) {
        tmp.copy(p).project(d.camera);
        e = Math.max(e, Math.abs(tmp.x), Math.abs(tmp.y));
      }
      const pose = d.rig.poses.reading;
      return { state: fsm.state, realExtent: e, aspect: d.camera.aspect, fov: d.camera.fov, cam: d.camera.position.toArray(), pose: pose.position.toArray(), dist: pose.position.distanceTo(pose.target) };
    },
  };
}
