import type { ExportOptions } from "./exportCanvas";
import type { CameraSettings } from "../pose/poseTypes";

/**
 * React の操作パネル → Three.js 側へ命令を渡すための薄い橋（設計書 §6.3）。
 * データ(選択・ポーズ・アスペクト)は Zustand、命令(カメラ移動・PNG書き出し)はここ。
 * ThreeViewport がマウント時に実体を登録し、アンマウントで解除する。
 */
export interface ViewportApi {
  applyCameraView: (name: string) => void;
  exportPNG: (opts: ExportOptions) => Promise<Blob | null>;
  getCameraState: () => CameraSettings;
  setCameraState: (camera: CameraSettings) => void;
  /** VRM/GLB キャラモデルを読み込みポーズに追従させる。失敗時は throw。 */
  loadModel: (data: ArrayBuffer, fileName: string) => Promise<string>;
  /** モデルを外してプリミティブ人形へ戻す */
  removeModel: () => void;
}

export const viewportApi: Partial<ViewportApi> = {};

// 開発時のデバッグ用に公開（本番ビルドでは無効）
if (import.meta.env.DEV) {
  (window as unknown as { __viewportApi: typeof viewportApi }).__viewportApi =
    viewportApi;
}
