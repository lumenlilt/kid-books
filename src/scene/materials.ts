import { MeshStandardMaterial } from 'three';

/** 紙藝：無金屬、高粗糙、平面著色。所有自製幾何都走這裡，換色板才換得動。 */
export function paper(color: number, opts: { roughness?: number; flat?: boolean } = {}): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.95, metalness: 0, flatShading: opts.flat ?? true });
}
