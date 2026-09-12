import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

/**
 * 可選的後處理：GTAO 環境遮蔽（?ao=1）。iPad 第 9–10 代未實測，所以只是選項；
 * OutputPass 負責色調映射與 sRGB（renderer 的 toneMapping 設定沿用）。
 */
export interface PostFx {
  render(): void;
  setSize(width: number, height: number, dpr: number): void;
  dispose(): void;
}

export function createPostFx(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): PostFx {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.blendIntensity = 0.85;
  gtao.updateGtaoMaterial({ radius: 0.28, distanceExponent: 1.2, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, radiusExponent: 1, rings: 2, samples: 12 });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  return {
    render: () => composer.render(),
    setSize(width, height, dpr) {
      composer.setPixelRatio(dpr);
      composer.setSize(width, height);
    },
    dispose: () => composer.dispose(),
  };
}
