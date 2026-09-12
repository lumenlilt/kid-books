import type { Group, Object3D } from 'three';
import { Mesh } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map<string, Promise<Group>>();

/** 載入一次、之後每次拿到的是複本（materials 共用，geometry 共用）。 */
export async function loadModel(url: string): Promise<Group> {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => {
      gltf.scene.traverse((o: Object3D) => {
        if (o instanceof Mesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      return gltf.scene;
    });
    cache.set(url, p);
  }
  const scene = await p;
  return scene.clone(true);
}

export const modelUrl = (name: string): string => `/assets/models/kenney/furniture/${name}.glb`;
