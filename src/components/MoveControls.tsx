import { usePoseStore } from "../pose/poseStore";
import type { MoveDirection } from "../pose/poseStore";

// 設計書 §8.3: 移動量 小0.01 / 中0.05 / 大0.10
const STEPS: Array<{ label: string; value: number }> = [
  { label: "小", value: 0.01 },
  { label: "中", value: 0.05 },
  { label: "大", value: 0.1 },
];

// 3x2 グリッド配置（カメラ相対・§8.3）
const DIRS: Array<{ dir: MoveDirection; label: string }> = [
  { dir: "left", label: "左 ◀" },
  { dir: "up", label: "上 ▲" },
  { dir: "right", label: "右 ▶" },
  { dir: "back", label: "後 奥" },
  { dir: "down", label: "下 ▼" },
  { dir: "forward", label: "前 手前" },
];

/**
 * Moveタブ本体（設計書 §14.5）。選択中の操作点を6方向に動かす。
 */
export default function MoveControls() {
  const selectedJoint = usePoseStore((s) => s.selectedJoint);
  const moveStep = usePoseStore((s) => s.moveStep);
  const setMoveStep = usePoseStore((s) => s.setMoveStep);
  const move = usePoseStore((s) => s.moveSelectedJoint);

  const disabled = selectedJoint === null;

  return (
    <div className="px-3 py-3">
      {/* 移動量 */}
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs text-gray-400">移動量</span>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <button
              key={s.value}
              onClick={() => setMoveStep(s.value)}
              className={`rounded px-3 py-1 text-sm ${
                Math.abs(moveStep - s.value) < 1e-6
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 active:bg-gray-600"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 方向ボタン */}
      <div className="grid grid-cols-3 gap-2">
        {DIRS.map((d) => (
          <button
            key={d.dir}
            disabled={disabled}
            onClick={() => move(d.dir)}
            className={`rounded py-3 text-sm font-medium ${
              disabled
                ? "bg-gray-800 text-gray-600"
                : "bg-gray-700 text-white active:bg-blue-600"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {disabled && (
        <p className="mt-2 text-center text-xs text-gray-500">
          操作点をタップして選択してください
        </p>
      )}
    </div>
  );
}
