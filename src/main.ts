import './styles.css';
import { Color, DefaultLoadingManager, PerspectiveCamera, Scene, Timer } from 'three';
import clockRaw from '../content/books/clock.json';
import index from '../content/index.json';
import { ACTIVITY_TYPES } from './activities/registry';
import { createAudioBus } from './app/audio';
import { createNarrator } from './app/narrator';
import { createProgressStore, type StorageLike } from './app/store';
import { createParentReport } from './overlay/parent-report';
import { createProfilePicker } from './overlay/profile-picker';
import { createCuckooClock } from './scene/props/cuckoo-clock';
import { validateBook } from './content/schema';
import { createInput } from './app/input';
import { createLayout } from './app/layout';
import { tweens } from './lib/tween';
import { createBookOverlay } from './overlay/book-overlay';
import { createHud } from './overlay/hud';
import { createBookController } from './scene/book-controller';
import { createBookcase } from './scene/bookcase';
import { createCameraRig } from './scene/camera-rig';
import { createCat } from './scene/cat';
import { createLights } from './scene/lights';
import { hex, resolvePalette } from './scene/palette';
import { createPostFx } from './scene/postfx';
import { createRenderer } from './scene/renderer';
import { createRoom } from './scene/room';
import { createShelf } from './scene/shelf';
import { currentHour, nightAmountAt } from './scene/window';

const canvas = document.getElementById('gl');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !(ui instanceof HTMLElement)) throw new Error('missing #gl or #ui');

const boot = document.getElementById('boot');
const bootBar = boot?.querySelector<HTMLElement>('.boot-bar b') ?? null;
DefaultLoadingManager.onProgress = (_url, loaded, total) => {
  if (bootBar && total > 0) bootBar.style.width = `${Math.max(4, Math.round((loaded / total) * 100))}%`;
};
let booted = false;
function dismissBoot(): void {
  if (booted) return;
  booted = true;
  if (bootBar) bootBar.style.width = '100%';
  boot?.classList.add('is-done');
  boot?.addEventListener('transitionend', () => boot.remove());
  window.setTimeout(() => boot?.remove(), 800); // 背景分頁計時器被節流時的保險
  // PWA：正式建置才註冊 service worker（tools/build-sw.mjs 產的 /sw.js），離線也能整本玩。
  // 放在第一幀之後而不是 load 事件：預快取 82 檔 4.7 MB 會跟首屏的模型與貼圖搶頻寬（2026-09-13 iPhone 首開空白十幾秒的原因之一）。
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.setTimeout(() => navigator.serviceWorker.register('/sw.js').catch(() => undefined), 1500);
  }
}
const params = new URLSearchParams(window.location.search);
const debug = params.get('debug') === '1';
const dbg: { frame: number; lastError: string | null; snapshot?: (name: string) => Promise<string> } = { frame: 0, lastError: null };
// 除錯面板一開始就掛上去：開機途中掛掉也看得到錯誤（2026-09-13 iPhone 只有一片紫底，就是這種死法）
const debugPanel = debug ? document.createElement('div') : null;
if (debugPanel) {
  debugPanel.className = 'debug-panel';
  debugPanel.textContent = 'booting';
  ui.append(debugPanel);
}
if (debug) {
  // 實機（iPhone／iPad）沒接線也看得到錯誤：面板最後一行印出來
  const show = (msg: string) => {
    dbg.lastError = msg;
    if (debugPanel) debugPanel.textContent = `err ${msg}`;
  };
  window.addEventListener('error', (e) => show(`${e.message} @${(e.filename ?? '').split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => {
    const r = (e as PromiseRejectionEvent).reason;
    show(r instanceof Error ? `${r.message}\n${(r.stack ?? '').split('\n').slice(0, 3).join(' | ')}` : String(r));
  });
}
const hour = currentHour();
const palette = resolvePalette(hour);
document.documentElement.style.setProperty('--paper', hex(palette.paper));
document.documentElement.style.setProperty('--ink', hex(palette.ink));
document.documentElement.style.setProperty('--accent', hex(palette.accent));

const renderer = createRenderer({ canvas });
const camera = new PerspectiveCamera(38, 1, 0.1, 100);
const layout = createLayout(renderer, camera, canvas);
const useAo = params.get('ao') !== '0'; // 玩具風預設開 GTAO；iPad 卡就 ?ao=0
const rig = createCameraRig(camera);
const input = createInput(canvas, camera);

const scene = new Scene();
scene.background = new Color(palette.sky).multiplyScalar(0.9);
const postfx = useAo ? createPostFx(renderer, scene, camera) : null;
if (postfx) layout.onLayout((vp) => postfx.setSize(vp.width, vp.height, vp.dpr));

const isTouch = window.matchMedia('(pointer: coarse)').matches;
const lights = createLights(scene, palette, isTouch ? 1024 : 2048, renderer);

const bookcase = createBookcase(palette);
const room = createRoom(palette, bookcase.lowerShelf.y);
scene.add(room.group);

bookcase.group.position.set(0, 0, -2.05);
scene.add(bookcase.group);

await Promise.race([document.fonts.load('bold 40px "Huninn"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => undefined);
const shelf = createShelf(bookcase, index.books, palette);
shelf.group.position.copy(bookcase.group.position);
scene.add(shelf.group);

const cat = await createCat(palette.accent);
cat.group.position.set(bookcase.group.position.x + 0.5, bookcase.top.y, bookcase.group.position.z - 0.04);
cat.group.rotation.y = -0.3; // v3 的臉建在 Blender -Y（glTF +Z），本來就面對鏡頭，只微微側身
cat.setHome();
scene.add(cat.group);

const memoryStorage = (): StorageLike => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
let storage: StorageLike;
try {
  storage = window.localStorage;
  storage.getItem('probe');
} catch {
  storage = memoryStorage();
}
const store = createProgressStore(storage);
const audio = createAudioBus();
// 第一個手勢（通常是選角那一下）就解鎖；Howler 自己也會在 touchend/click 解鎖
window.addEventListener('pointerdown', () => audio.unlock(), { capture: true });

const hud = createHud(ui);
let soundOn = store.data.settings.sound;
hud.setSound(soundOn);
audio.setMuted(!soundOn);
hud.onSoundToggle(() => {
  soundOn = !soundOn;
  hud.setSound(soundOn);
  store.setSound(soundOn);
  audio.setMuted(!soundOn);
  if (soundOn) audio.sfx('toggle');
});

const overlay = createBookOverlay(ui);
overlay.setDebug(debug);
const clockBook = validateBook(clockRaw, ACTIVITY_TYPES);
if (!clockBook.book) throw new Error(`content/books/clock.json: ${clockBook.errors.join('; ')}`);
const narrator = createNarrator({
  subtitle: overlay.subtitle,
  talking: (on) => cat.setTalking(on),
  speed: params.get('fast') === '1' ? 0.15 : 1,
  play: (bookId, lineId, opts) => audio.play(bookId, lineId, opts),
  stopAudio: () => audio.stop(),
});
const bookDefs = { clock: clockBook.book };
const cuckoo = createCuckooClock(palette.accent);
const countingIds = (id: keyof typeof bookDefs) => bookDefs[id].pages.filter((p) => p.countsForCompletion).map((p) => p.id);
/** 房間裝飾與書籤全由進度推導：換人、重整都重算 */
const syncDecorations = () => {
  const clockDone = store.isBookComplete('clock', countingIds('clock'));
  room.setDecoration('wall-left', clockDone ? cuckoo.group : null);
  shelf.books.get('clock')?.setDone(clockDone);
  hud.setStars(store.totalStars());
  hud.setAvatar(store.active()?.id ?? null);
};
const books = createBookController({
  scene, camera, renderer, rig, input, shelf, cat, overlay, palette, hour, narrator, hud, uiRoot: ui, store, audio,
  books: bookDefs,
  viewport: () => layout.viewport,
  onReading: (on) => hud.setReading(on),
  onCompleted: (bookId, firstTime) => {
    if (!firstTime || bookId !== 'clock') {
      syncDecorations();
      return;
    }
    void (async () => {
      input.setEnabled(false);
      rig.parallax = 0;
      await rig.goTo('decoration', 1000);
      room.setDecoration('wall-left', cuckoo.group);
      shelf.books.get('clock')?.setDone(true);
      audio.sfx('fanfare');
      await cuckoo.reveal();
      await cuckoo.pop();
      await tweens.add({ duration: 1, delay: 500, onUpdate: () => {} }).finished;
      await rig.goTo('shelf', 900);
      rig.parallax = 0.12;
      input.setEnabled(true);
      syncDecorations();
    })();
  },
});
input.onTap(cuckoo.group, () => {
  audio.sfx('fanfare');
  void cuckoo.pop();
});

const picker = createProfilePicker(ui);
const report = createParentReport(ui, store, bookDefs, () => void chooseProfile());
async function chooseProfile(): Promise<void> {
  const id = await picker.open(store.active()?.id ?? null);
  store.select(id);
  syncDecorations();
}
hud.onProfile(() => {
  if (books.state === 'on-shelf' && !picker.isOpen) void chooseProfile();
});
hud.onProfileLongPress(() => {
  if (books.state === 'on-shelf') report.open();
});
syncDecorations();
void chooseProfile().then(() => {
  const openId = debug ? params.get('open') : null;
  if (openId) void books.open(openId);
});
if (debug && params.get('pick')) {
  // 選角畫面一出現就替使用者點下去（實機截圖用）
  window.setTimeout(() => picker.root.querySelector<HTMLButtonElement>(`.picker-avatar[data-id="${params.get('pick')}"]`)?.click(), 300);
}
hud.onBack(() => void books.close());
layout.onLayout(() => books.relayout());

// 時間 → 天色與燈光
room.window.setHour(hour);
lights.setNight(nightAmountAt(hour));
room.setNight(nightAmountAt(hour));
let lampOn = nightAmountAt(hour) > 0.3;
lights.setLamp(lampOn);

// 互動：什麼都可以摸
for (const book of shelf.books.values()) {
  input.onTap(book.mesh, () => {
    if (books.state !== 'on-shelf') return;
    if (book.entry.locked) {
      audio.sfx('question');
      void book.wiggle();
    } else void books.open(book.entry.id);
  });
}
input.onTap(cat.group, () => {
  audio.sfx('star');
  void cat.poke();
});
void room.ready.then(() => {
  const lamp = room.props.get('lampRoundFloor');
  if (lamp) input.onTap(lamp, () => {
    lampOn = !lampOn;
    lights.setLamp(lampOn);
    audio.sfx('toggle');
  });
  const bear = room.props.get('bear');
  if (bear) input.onTap(bear, () => {
    audio.sfx('drop');
    const base = bear.position.y;
    void tweens.add({ duration: 500, onUpdate: (t) => { bear.position.y = base + Math.sin(t * Math.PI) * 0.25; } });
  });
  const plant = room.props.get('pottedPlant');
  if (plant) input.onTap(plant, () => {
    audio.sfx('select');
    void tweens.add({ duration: 700, onUpdate: (t) => { plant.rotation.z = Math.sin(t * Math.PI * 5) * 0.12 * (1 - t); } });
  });
  renderer.shadowMap.needsUpdate = true;
});


const timer = new Timer();
let frames = 0;
let fpsAt = 0;
let fps = 0;
if (debug) (window as unknown as { __kb: unknown }).__kb = { dbg, renderer, layout, camera, books, cat, input, scene, narrator, overlay, store, picker, cuckoo, audio };
const frame = (forcedDt?: number, render = true) => {
  dbg.frame += 1;
  layout.tick();
  timer.update();
  const dt = forcedDt ?? Math.min(timer.getDelta(), 0.05);
  tweens.update(dt);
  audio.tick();
  cat.setMouth(audio.level());
  cat.update(dt);
  books.update(dt);
  cuckoo.update(dt);
  room.update(dt);
  if (cuckoo.group.parent) {
    const now = new Date();
    cuckoo.setTime(now.getHours(), now.getMinutes());
  }
  rig.update(dt, input.pointer);
  if (!render) return;
  renderer.shadowMap.needsUpdate = true;
  if (postfx) postfx.render();
  else renderer.render(scene, camera);
  if (!booted) dismissBoot();
  if (debugPanel) {
    frames += 1;
    const now = performance.now() / 1000;
    if (now - fpsAt >= 1) {
      fps = fpsAt ? frames / (now - fpsAt) : 0;
      frames = 0;
      fpsAt = now;
      const { calls, triangles } = renderer.info.render;
      const vp = layout.viewport;
      debugPanel.textContent = `fps ${fps.toFixed(0)}  calls ${calls}  tris ${triangles}  book ${books.state}\n${vp.width}x${vp.height}@${vp.dpr}  palette ${palette.name}  hour ${hour.toFixed(1)}${dbg.lastError ? `\nerr ${dbg.lastError}` : ''}`;
    }
  }
};
if (debug) dbg.snapshot = async (name) => {
  frame(0, true); // 同一個 task 裡先畫一幀再讀：drawing buffer 要到 task 結束才會被交換掉
  const res = await fetch(`/__shot?name=${encodeURIComponent(name)}`, { method: 'POST', body: renderer.domElement.toDataURL('image/png') });
  return res.text();
};
renderer.setAnimationLoop(() => frame());
// 除錯用：分頁被隱藏時瀏覽器不給 rAF、計時器也被節流到每秒一次，動畫序列會凍住；
// 只在 ?debug=1 時，每次計時器觸發就用固定步長推進一秒份的幀，讓隱藏狀態下一秒還是一秒。
// 更激進的除錯模式 ?turbo=1：分頁隱藏超過五分鐘後 Chrome 連計時器都改成每分鐘一次，
// 只剩 MessageChannel 不受節流——用它推邏輯幀（不渲染），讓自動化測試在隱藏的 pane 裡也跑得完。
if (params.get('turbo') === '1') {
  const channel = new MessageChannel();
  const pump = () => {
    if (!document.hidden) return;
    for (let i = 0; i < 4; i += 1) frame(1 / 30, false);
    channel.port2.postMessage(0);
  };
  channel.port1.onmessage = pump;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) channel.port2.postMessage(0);
  });
  if (document.hidden) channel.port2.postMessage(0);
} else if (debug) {
  let last = performance.now();
  window.setInterval(() => {
    const now = performance.now();
    const elapsed = Math.min(2, (now - last) / 1000);
    last = now;
    if (!document.hidden) return;
    const steps = Math.max(1, Math.round(elapsed * 30));
    for (let i = 0; i < steps; i += 1) frame(elapsed / steps);
  }, 100);
}


canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.location.reload();
});
