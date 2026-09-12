import './styles.css';
import { Color, PerspectiveCamera, Scene, Timer } from 'three';
import index from '../content/index.json';
import { createInput } from './app/input';
import { createLayout } from './app/layout';
import { tweens } from './lib/tween';
import { createHud } from './overlay/hud';
import { createBookcase } from './scene/bookcase';
import { createCameraRig } from './scene/camera-rig';
import { createCat } from './scene/cat';
import { createLights } from './scene/lights';
import { hex, resolvePalette } from './scene/palette';
import { createRenderer } from './scene/renderer';
import { createRoom } from './scene/room';
import { createShelf } from './scene/shelf';
import { currentHour, nightAmountAt } from './scene/window';

const canvas = document.getElementById('gl');
const ui = document.getElementById('ui');
if (!(canvas instanceof HTMLCanvasElement) || !(ui instanceof HTMLElement)) throw new Error('missing #gl or #ui');

const params = new URLSearchParams(window.location.search);
const debug = params.get('debug') === '1';
const hour = currentHour();
const palette = resolvePalette(hour);
document.documentElement.style.setProperty('--paper', hex(palette.paper));
document.documentElement.style.setProperty('--ink', hex(palette.ink));
document.documentElement.style.setProperty('--accent', hex(palette.accent));

const renderer = createRenderer({ canvas });
const camera = new PerspectiveCamera(38, 1, 0.1, 100);
const layout = createLayout(renderer, camera, canvas);
const rig = createCameraRig(camera);
const input = createInput(canvas, camera);

const scene = new Scene();
scene.background = new Color(palette.sky).multiplyScalar(0.9);

const isTouch = window.matchMedia('(pointer: coarse)').matches;
const lights = createLights(scene, palette, isTouch ? 1024 : 2048);

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
cat.group.position.set(bookcase.group.position.x + 0.5, bookcase.top.y, bookcase.group.position.z + 0.02);
cat.group.rotation.y = Math.PI - 0.3; // Blender +Y 前方在 glTF 是 -Z，轉過來面對鏡頭
scene.add(cat.group);

const hud = createHud(ui);
let soundOn = true;
hud.onSoundToggle(() => {
  soundOn = !soundOn;
  hud.setSound(soundOn);
});

// 時間 → 天色與燈光
room.window.setHour(hour);
lights.setNight(nightAmountAt(hour));
let lampOn = nightAmountAt(hour) > 0.3;
lights.setLamp(lampOn);

// 互動：什麼都可以摸
for (const book of shelf.books.values()) {
  input.onTap(book.mesh, () => {
    if (book.entry.locked) void book.wiggle();
    else void book.bounce();
  });
}
input.onTap(cat.group, () => void cat.poke());
void room.ready.then(() => {
  const lamp = room.props.get('lampRoundFloor');
  if (lamp) input.onTap(lamp, () => {
    lampOn = !lampOn;
    lights.setLamp(lampOn);
  });
  const bear = room.props.get('bear');
  if (bear) input.onTap(bear, () => {
    const base = bear.position.y;
    void tweens.add({ duration: 500, onUpdate: (t) => { bear.position.y = base + Math.sin(t * Math.PI) * 0.25; } });
  });
  const plant = room.props.get('pottedPlant');
  if (plant) input.onTap(plant, () => {
    void tweens.add({ duration: 700, onUpdate: (t) => { plant.rotation.z = Math.sin(t * Math.PI * 5) * 0.12 * (1 - t); } });
  });
  renderer.shadowMap.needsUpdate = true;
});

const debugPanel = debug ? document.createElement('div') : null;
if (debugPanel) {
  debugPanel.className = 'debug-panel';
  ui.append(debugPanel);
}

const timer = new Timer();
let frames = 0;
let fpsAt = 0;
let fps = 0;
const dbg = { frame: 0, lastError: null as unknown };
if (debug) (window as unknown as { __kb: unknown }).__kb = { dbg, renderer, layout, camera };
renderer.setAnimationLoop(() => {
  dbg.frame += 1;
  layout.tick();
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  tweens.update(dt);
  cat.update(dt);
  rig.update(dt, input.pointer);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(scene, camera);
  if (debugPanel) {
    frames += 1;
    const now = performance.now() / 1000;
    if (now - fpsAt >= 1) {
      fps = fpsAt ? frames / (now - fpsAt) : 0;
      frames = 0;
      fpsAt = now;
      const { calls, triangles } = renderer.info.render;
      const vp = layout.viewport;
      debugPanel.textContent = `fps ${fps.toFixed(0)}  calls ${calls}  tris ${triangles}\n${vp.width}x${vp.height}@${vp.dpr}  palette ${palette.name}  hour ${hour.toFixed(1)}`;
    }
  }
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.location.reload();
});
