import { usePoseStore } from "../pose/poseStore";
import type { RotationAxis } from "../pose/poseStore";

// 設計書 §14.6: Pitch(前後) / Yaw(左右回転) / Roll(傾き)
const AXES: Array<{ axis: RotationAxis; label: string }> = [
  { axis: "pitch", label: "Pitch 前後" },
  { axis: "yaw", label: "Yaw 左右" },
  { axis: "roll", label: "Roll 傾き" },
];

const STEPS = [5, 10, 15];

// 回転できる操作点（head/chest/pelvis/手首/足首・§13.6）
const ROTATABLE = new Set([
  "head",
  "chest",
  "pelvis",
  "leftWrist",
  "rightWrist",
  "leftAnkle",
  "rightAnkle",
]);

/**
 * Rotateタブ（設計書 §14.6）。選択中の部位を回転する。
 */
export default function RotateControls() {
  const selectedJoint = usePoseStore((s) => s.selectedJoint);
  const rotationStep = usePoseStore((s) => s.rotationStep);
  const setRotationStep = usePoseStore((s) => s.setRotationStep);
  const rotate = usePoseStore((s) => s.rotateSelectedJoint);

  const canRotate = selectedJoint !== null && ROTATABLE.has(selectedJoint);

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-gray-400">回転量</span>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <button
              key={s}
              onClick={() => setRotationStep(s)}
              className={`rounded px-3 py-1 text-sm ${
                rotationStep === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 active:bg-gray-600"
              }`}
            >
              {s}°
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {AXES.map((a) => (
          <div key={a.axis} className="flex items-center gap-2">
            <span className="w-24 text-xs text-gray-300">{a.label}</span>
            <button
              disabled={!canRotate}
              onClick={() => rotate(a.axis, -1)}
              className={`flex-1 rounded py-2 text-sm ${
                canRotate
                  ? "bg-gray-700 text-white active:bg-blue-600"
                  : "bg-gray-800 text-gray-600"
              }`}
            >
              −
            </button>
            <button
              disabled={!canRotate}
              onClick={() => rotate(a.axis, +1)}
              className={`flex-1 rounded py-2 text-sm ${
                canRotate
                  ? "bg-gray-700 text-white active:bg-blue-600"
                  : "bg-gray-800 text-gray-600"
              }`}
            >
              ＋
            </button>
          </div>
        ))}
      </div>

      {!canRotate && (
        <p className="mt-2 text-center text-xs text-gray-500">
          回転できる部位（頭/胸/腰/手首/足首）を選択してください
        </p>
      )}
    </div>
  );
}
