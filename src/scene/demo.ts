// M0 的驗收場景：一個有光、會投影的紙藝方塊。M1 會被房間取代，留著是為了讓
// renderer / layout / palette 三個地基先在 iPad 與桌機上各跑一次。
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
} from 'three';
import { palette } from './palette';

export function createDemoScene() {
  const scene = new Scene();
  scene.background = new Color(palette.sky);

  scene.add(new HemisphereLight(0xfff4e0, palette.floor, 0.9));

  const sun = new DirectionalLight(0xffe8c8, 2.2);
  sun.position.set(3, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 20;
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 5;
  sun.shadow.camera.bottom = -5;
  scene.add(sun);

  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshStandardMaterial({ color: palette.floor, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: palette.accent, flatShading: true, roughness: 0.9 }),
  );
  cube.position.y = 0.9;
  cube.castShadow = true;
  cube.receiveShadow = true;
  scene.add(cube);

  return {
    scene,
    cube,
    update(dt: number): void {
      cube.rotation.y += dt * 0.8;
      cube.rotation.x += dt * 0.3;
    },
  };
}
