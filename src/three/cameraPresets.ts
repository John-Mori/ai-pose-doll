import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { AspectRatio, Vec3 } from "../pose/poseTypes";

/** アスペクト比の数値 (W/H) */
export const ASPECT_VALUE: Record<AspectRatio, number> = {
  "4:5": 4 / 5,
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "1:1": 1,
};

/** PNG 出力解像度（設計書 §15.2） */
export const EXPORT_SIZE: Record<AspectRatio, [number, number]> = {
  "4:5": [1080, 1350],
  "9:16": [1080, 1920],
  "16:9": [1600, 900],
  "1:1": [1080, 1080],
};

export interface ViewPreset {
  position: Vec3;
  target: Vec3;
}

/** 視点プリセット（設計書 §8.5 / §14.7）。座標は初期人形(身長~1.72)基準。 */
export const VIEW_PRESETS: Record<string, ViewPreset> = {
  "Full Body": { position: [0, 1.0, 4.3], target: [0, 0.85, 0] },
  "Knee Up": { position: [0, 1.15, 2.9], target: [0, 1.05, 0] },
  "Waist Up": { position: [0, 1.35, 2.1], target: [0, 1.35, 0] },
  "Bust Up": { position: [0, 1.55, 1.5], target: [0, 1.55, 0] },
  Front: { position: [0, 1.1, 4.0], target: [0, 1.0, 0] },
  "45 Degree": { position: [2.9, 1.2, 2.9], target: [0, 1.0, 0] },
  Side: { position: [4.0, 1.1, 0.01], target: [0, 1.0, 0] },
  "Low Angle": { position: [0, 0.35, 3.6], target: [0, 1.1, 0] },
  "High Angle": { position: [0, 2.6, 3.2], target: [0, 0.9, 0] },
};

export const VIEW_PRESET_NAMES = Object.keys(VIEW_PRESETS);

/** 視点プリセットをカメラ／コントロールへ適用 */
export function applyViewPreset(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  name: string
): void {
  const preset = VIEW_PRESETS[name];
  if (!preset) {
    console.warn("[cameraPresets] 未知の視点:", name);
    return;
  }
  console.log("[cameraPresets] applyViewPreset:", name);
  camera.position.set(...preset.position);
  controls.target.set(...preset.target);
  controls.update();
}
