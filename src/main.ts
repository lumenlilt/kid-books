import './styles.css';
import { PerspectiveCamera, Timer } from 'three';
import { createLayout } from './app/layout';
import { createDemoScene } from './scene/demo';
import { createRenderer } from './scene/renderer';

const canvas = document.getElementById('gl');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('missing #gl canvas');

const renderer = createRenderer({ canvas });
const camera = new PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 2.2, 5);
camera.lookAt(0, 0.8, 0);

const layout = createLayout(renderer, camera, canvas);

const demo = createDemoScene();
const timer = new Timer();

renderer.setAnimationLoop(() => {
  layout.tick();
  timer.update();
  const dt = Math.min(timer.getDelta(), 0.05);
  demo.update(dt);
  renderer.shadowMap.needsUpdate = true;
  renderer.render(demo.scene, camera);
});

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();
  window.location.reload();
});
