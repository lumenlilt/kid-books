import { DirectionalLight, HemisphereLight, PointLight, type Scene } from 'three';
import type { Palette } from './palette';

export interface Lights {
  hemi: HemisphereLight;
  sun: DirectionalLight;
  lamp: PointLight;
  /** 0 白天 … 1 深夜：太陽變弱、檯燈變強、半球光偏暖 */
  setNight(amount: number): void;
  setLamp(on: boolean): void;
}

export function createLights(scene: Scene, palette: Palette, shadowSize: number): Lights {
  const hemi = new HemisphereLight(palette.skyLight, palette.floor, 0.9);
  scene.add(hemi);

  const sun = new DirectionalLight(0xffe8c8, 2.0);
  sun.position.set(3.5, 6, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 20;
  sun.shadow.camera.left = -5;
  sun.shadow.camera.right = 5;
  sun.shadow.camera.top = 6;
  sun.shadow.camera.bottom = -2;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

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
    lamp,
    setNight(amount) {
      night = amount;
      sun.intensity = 2.0 - amount * 1.5;
      hemi.intensity = 0.9 - amount * 0.45;
      applyLamp();
    },
    setLamp(on) {
      lampOn = on;
      applyLamp();
    },
  };
}
