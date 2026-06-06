import { usePoseStore } from "../pose/poseStore";
import type { ControlPointName } from "../pose/poseTypes";

// 11操作点（設計書 §10.2）。3Dタップが難しい時のフォールバック選択UI。
const POINTS: Array<{ name: ControlPointName; label: string }> = [
  { name: "head", label: "頭" },
  { name: "chest", label: "胸" },
  { name: "pelvis", label: "腰" },
  { name: "leftWrist", label: "左手" },
  { name: "rightWrist", label: "右手" },
  { name: "leftAnkle", label: "左足" },
  { name: "rightAnkle", label: "右足" },
  { name: "leftElbowPole", label: "左肘P" },
  { name: "rightElbowPole", label: "右肘P" },
  { name: "leftKneePole", label: "左膝P" },
  { name: "rightKneePole", label: "右膝P" },
];

/**
 * 操作点をボタンで選択する（3Dタップの代替・設計書 §14）。
 */
export default function JointSelector() {
  const selectedJoint = usePoseStore((s) => s.selectedJoint);
  const selectJoint = usePoseStore((s) => s.selectJoint);

  return (
    <div className="flex gap-1 overflow-x-auto px-3 py-2">
      {POINTS.map((p) => (
        <button
          key={p.name}
          onClick={() => selectJoint(p.name)}
          className={`shrink-0 rounded px-2.5 py-1 text-xs ${
            selectedJoint === p.name
              ? "bg-yellow-400 text-gray-900 font-semibold"
              : "bg-gray-700 text-gray-300 active:bg-gray-600"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
