import { DirectionalLight, HemisphereLight, PMREMGenerator, PointLight, SpotLight, type Scene, type WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Palette } from './palette';

export interface Lights {
  hemi: HemisphereLight;
  sun: DirectionalLight;
  fill: DirectionalLight;
  /** 窗光：白天從窗戶方向灑一塊在地上 */
  windowLight: SpotLight;
  lamp: PointLight;
  /** 0 白天 … 1 深夜：太陽變弱、檯燈變強、半球光偏暖 */
  setNight(amount: number): void;
  setLamp(on: boolean): void;
}

export function createLights(scene: Scene, palette: Palette, shadowSize: number, renderer?: WebGLRenderer): Lights {
  // 環境光：RoomEnvironment 的 PMREM，讓材質有柔和的反射與基本環境照明（強度壓低，主要還是燈）
  if (renderer) {
    const pmrem = new PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.28;
    pmrem.dispose();
  }

  const hemi = new HemisphereLight(palette.skyLight, palette.floor, 0.55);
  scene.add(hemi);

  // 主光：暖、從右前上方（窗戶那側）
  const sun = new DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(3.2, 5.5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 20;
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -2;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 5;
  sun.shadow.blurSamples = 12;
  scene.add(sun);

  // 補光：冷、從左前，不投影，把陰影面撐起來
  const fill = new DirectionalLight(0xd6e6ff, 0.7);
  fill.position.set(-4, 3, 3);
  scene.add(fill);

  // 窗光：白天從窗戶灑一塊暖光到地上（不投影，便宜）
  const windowLight = new SpotLight(0xfff2cc, 0, 9, 0.55, 0.9, 1.2);
  windowLight.position.set(1.75, 2.6, -2.2);
  windowLight.target.position.set(0.6, 0, 0.4);
  scene.add(windowLight, windowLight.target);

  const lamp = new PointLight(0xffb070, 0, 6, 1.6);
  lamp.position.set(-1.9, 1.35, -0.6);
  scene.add(lamp);

  let lampOn = false;
  let night = 0;
  const applyLamp = () => {
    lamp.intensity = lampOn ? 6 + night * 10 : 0;
  };

  return {
    hemi,
    sun,
    fill,
    windowLight,
    lamp,
    setNight(amount) {
      night = amount;
      sun.intensity = 2.4 - amount * 1.9;
      sun.color.setHex(amount > 0.5 ? 0xbcc8ff : 0xfff0dc);
      fill.intensity = 0.7 - amount * 0.35;
      hemi.intensity = 0.55 - amount * 0.3;
      windowLight.intensity = (1 - amount) * 18;
      scene.environmentIntensity = 0.28 - amount * 0.16;
      applyLamp();
    },
    setLamp(on) {
      lampOn = on;
      applyLamp();
    },
  };
}
