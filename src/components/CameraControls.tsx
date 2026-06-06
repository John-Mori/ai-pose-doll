import { usePoseStore } from "../pose/poseStore";
import { viewportApi } from "../three/viewportApi";
import { VIEW_PRESET_NAMES } from "../three/cameraPresets";
import type { AspectRatio } from "../pose/poseTypes";

const ASPECTS: AspectRatio[] = ["4:5", "9:16", "16:9", "1:1"];

/**
 * Cameraタブ（設計書 §14.7）。アスペクト比と視点プリセットの切替。
 */
export default function CameraControls() {
  const aspectRatio = usePoseStore((s) => s.pose.aspectRatio);
  const setAspectRatio = usePoseStore((s) => s.setAspectRatio);

  return (
    <div className="px-3 py-3">
      {/* アスペクト比（構図フレーム） */}
      <div className="mb-2">
        <span className="text-xs text-gray-400">アスペクト比</span>
        <div className="mt-1 flex gap-1">
          {ASPECTS.map((a) => (
            <button
              key={a}
              onClick={() => setAspectRatio(a)}
              className={`flex-1 rounded py-2 text-sm ${
                aspectRatio === a
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 active:bg-gray-600"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* 視点プリセット */}
      <div>
        <span className="text-xs text-gray-400">視点</span>
        <div className="mt-1 grid grid-cols-3 gap-1">
          {VIEW_PRESET_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => viewportApi.applyCameraView?.(name)}
              className="rounded bg-gray-700 py-2 text-xs text-white active:bg-blue-600"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
