import { NeutralToneMapping, SRGBColorSpace, VSMShadowMap, WebGLRenderer } from 'three';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
  /** iPad 的 DPR 是 2，再高只是燒電；預設上限 2，效能不足時由 layout 降到 1.5。 */
  maxPixelRatio?: number;
}

export function createRenderer({ canvas, maxPixelRatio = 2 }: RendererOptions): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  // Neutral（Khronos PBR Neutral）：保住粉彩的色相，只壓高光；ACES 會把淺色壓灰（D25）
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  // VSM：可模糊的軟陰影，紙藝／玩具兩種風格都要軟影
  renderer.shadowMap.type = VSMShadowMap;
  // 陰影只在場景變動時更新（呼叫端設 needsUpdate），靜態房間不必每幀重算。
  renderer.shadowMap.autoUpdate = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  return renderer;
}
