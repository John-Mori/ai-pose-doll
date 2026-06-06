import * as THREE from "three";
import type { SceneBundle } from "./createScene";

export type ExportBackground = "white" | "gray" | "transparent" | "current";

export interface ExportOptions {
  width: number;
  height: number;
  background: ExportBackground;
  showControlPoints: boolean;
  showGrid: boolean;
}

const BG_COLOR: Record<"white" | "gray", number> = {
  white: 0xffffff,
  gray: 0x9aa0a6,
};

/**
 * 現在のシーンを指定解像度の PNG として書き出す（設計書 §15）。
 * ライブ表示と同じ camera.aspect で描くため WYSIWYG。
 * 描画後は元の表示状態へ確実に戻す。
 */
export async function exportPNG(
  bundle: SceneBundle,
  controlPointsGroup: THREE.Object3D,
  opts: ExportOptions
): Promise<Blob | null> {
  const { renderer, scene, camera, grid } = bundle;
  console.log("[exportPNG]", opts);

  // --- 現在状態を退避 ---
  const oldSize = renderer.getSize(new THREE.Vector2());
  const oldPixelRatio = renderer.getPixelRatio();
  const oldBg = scene.background;
  const oldGrid = grid.visible;
  const oldCP = controlPointsGroup.visible;

  try {
    // --- 出力用に状態を変更 ---
    grid.visible = opts.showGrid;
    controlPointsGroup.visible = opts.showControlPoints;
    if (opts.background === "transparent") scene.background = null;
    else if (opts.background !== "current") {
      scene.background = new THREE.Color(BG_COLOR[opts.background]);
    }

    renderer.setPixelRatio(1);
    renderer.setSize(opts.width, opts.height, false);
    camera.aspect = opts.width / opts.height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    const blob = await new Promise<Blob | null>((resolve) =>
      renderer.domElement.toBlob(resolve, "image/png")
    );
    return blob;
  } finally {
    // --- 必ず元へ戻す ---
    scene.background = oldBg;
    grid.visible = oldGrid;
    controlPointsGroup.visible = oldCP;
    renderer.setPixelRatio(oldPixelRatio);
    renderer.setSize(oldSize.x, oldSize.y, false);
    bundle.resize(); // レターボックスとアスペクトを復元
  }
}
