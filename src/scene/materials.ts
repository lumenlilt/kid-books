import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TextureLoader, Vector2, type Material, type Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

let grain: Texture | null = null;

/** 程序紙紋：低對比值雜訊，當凹凸圖用。一張共用，256²。 */
export function paperGrain(): Texture {
  if (grain) return grain;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const img = ctx.createImageData(size, size);
  // 兩層雜訊：細顆粒＋粗纖維
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const coarse = new Float32Array(32 * 32);
  for (let i = 0; i < coarse.length; i += 1) coarse[i] = rnd();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cx = (x / 8) % 32;
      const cy = (y / 8) % 32;
      const x0 = Math.floor(cx);
      const y0 = Math.floor(cy);
      const fx = cx - x0;
      const fy = cy - y0;
      const c = (i: number, j: number) => coarse[((j % 32) * 32 + (i % 32)) % coarse.length] ?? 0.5;
      const smooth = (c(x0, y0) * (1 - fx) + c(x0 + 1, y0) * fx) * (1 - fy) + (c(x0, y0 + 1) * (1 - fx) + c(x0 + 1, y0 + 1) * fx) * fy;
      const v = 128 + (smooth - 0.5) * 40 + (rnd() - 0.5) * 34;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  grain = new CanvasTexture(canvas);
  grain.wrapS = RepeatWrapping;
  grain.wrapT = RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

/**
 * 玩具著色：注入兩個效果——世界空間「上亮下暗」的漸層（像柔光箱從上面打）與菲涅耳邊光（邊緣微亮，像塑膠／絨毛的柔和輪廓）。
 * 用 onBeforeCompile 加在 MeshStandardMaterial 上，所有 toy 材質共用同一支 program（customProgramCacheKey）。
 */
export function toyShading(material: MeshStandardMaterial, opts: { gradient?: number; rim?: number } = {}): MeshStandardMaterial {
  const gradient = opts.gradient ?? 0.16;
  const rim = opts.rim ?? 0.1;
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uToyGradient'] = { value: gradient };
    shader.uniforms['uToyRim'] = { value: rim };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vToyWorldNormal;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvToyWorldNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vToyWorldNormal;\nuniform float uToyGradient;\nuniform float uToyRim;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        {
          float up = clamp(vToyWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
          diffuseColor.rgb *= mix(1.0 - uToyGradient, 1.0 + uToyGradient * 0.45, up);
          vec3 viewDir = normalize(vViewPosition);
          float facing = clamp(dot(normalize(vNormal), viewDir), 0.0, 1.0);
          float rimK = pow(1.0 - facing, 3.0);
          diffuseColor.rgb += rimK * uToyRim;
        }`,
      );
  };
  material.customProgramCacheKey = () => `toy:${gradient}:${rim}`;
  return material;
}

/** 對載入的模型（GLB）也套玩具著色 */
export function applyToyShading(material: Material): void {
  if (material instanceof MeshStandardMaterial) toyShading(material);
}

/**
 * 材質工廠（名字留著 paper 是歷史：D07 時是紙雕，2026-09-12 使用者裁示改**柔軟玩具風**）：
 * 平滑著色、霧面塑膠（粗糙度 0.6）、吃環境反射；紙紋只在 grain: true 時加。所有自製幾何都走這裡，換色板才換得動。
 */
export function paper(color: number, opts: { roughness?: number; flat?: boolean; grain?: boolean } = {}): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.6, metalness: 0, flatShading: opts.flat ?? false, envMapIntensity: 0.7 });
  if (opts.grain === true) {
    m.bumpMap = paperGrain();
    m.bumpScale = 0.0035;
  }
  return toyShading(m);
}

/** 圓角盒：玩具風的基本磚。半徑預設取最短邊的 1/6，不超過 0.05。 */
export function roundedBox(w: number, h: number, d: number, radius?: number, segments = 4): RoundedBoxGeometry {
  const r = radius ?? Math.min(0.05, Math.min(w, h, d) / 6);
  return new RoundedBoxGeometry(w, h, d, segments, r);
}

const loader = new TextureLoader();
const texCache = new Map<string, Texture>();

function loadTex(url: string, srgb: boolean, repeat: number): Texture {
  const key = `${url}|${repeat}`;
  let t = texCache.get(key);
  if (!t) {
    t = loader.load(url);
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 4;
    if (srgb) t.colorSpace = SRGBColorSpace;
    texCache.set(key, t);
  }
  return t;
}

/**
 * PBR 貼圖組（Poly Haven CC0，public/assets/textures/<name>-{diffuse,normal,rough}.jpg）套到玩具材質上：
 * 顏色仍由色板決定（tint 乘上 diffuse），貼圖只提供紋理與凹凸——換色板不用換圖。
 */
export function texturedToy(name: 'floor' | 'wall' | 'rug' | 'wood', tint: number, opts: { repeat?: number; roughness?: number; normalScale?: number; flat?: boolean; gain?: number } = {}): MeshStandardMaterial {
  const repeat = opts.repeat ?? 2;
  const m = paper(tint, { roughness: opts.roughness ?? 0.85, flat: opts.flat ?? false });
  // 貼圖的平均亮度大多在 0.4–0.6，乘上色板色會整體變暗：用 gain 把色板色抬回來（color 可以超過 1）
  m.color.multiplyScalar(opts.gain ?? 1.6);
  m.map = loadTex(`/assets/textures/${name}-diffuse.jpg`, true, repeat);
  m.normalMap = loadTex(`/assets/textures/${name}-normal.jpg`, false, repeat);
  m.normalScale = new Vector2(opts.normalScale ?? 0.6, opts.normalScale ?? 0.6);
  m.roughnessMap = loadTex(`/assets/textures/${name}-rough.jpg`, false, repeat);
  return m;
}
