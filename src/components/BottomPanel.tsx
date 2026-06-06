import { useState } from "react";
import { usePoseStore } from "../pose/poseStore";
import JointSelector from "./JointSelector";
import MoveControls from "./MoveControls";
import RotateControls from "./RotateControls";
import CameraControls from "./CameraControls";
import ExportPanel from "./ExportPanel";

// 設計書 §14.3 のタブ構成。CP2 では Pose / Move を有効化。
const TABS = ["Pose", "Move", "Rotate", "Camera", "Export", "Check"] as const;
type Tab = (typeof TABS)[number];
const ENABLED: Tab[] = [
  "Pose",
  "Move",
  "Rotate",
  "Camera",
  "Export",
  "Check",
];

/**
 * 下部操作パネル（設計書 §14.3）。タブで内容を切替える。
 */
export default function BottomPanel() {
  const [tab, setTab] = useState<Tab>("Move");

  const showGrid = usePoseStore((s) => s.showGrid);
  const toggleGrid = usePoseStore((s) => s.toggleGrid);
  const showCP = usePoseStore((s) => s.showControlPoints);
  const toggleCP = usePoseStore((s) => s.toggleControlPoints);
  const resetPose = usePoseStore((s) => s.resetPose);
  const selectedJoint = usePoseStore((s) => s.selectedJoint);
  const warnings = usePoseStore((s) => s.warnings);
  const checkPose = usePoseStore((s) => s.checkPose);
  const clearWarnings = usePoseStore((s) => s.clearWarnings);

  return (
    <div className="bg-gray-800 border-t border-gray-700 select-none">
      {/* タブ行 */}
      <div className="flex">
        {TABS.map((t) => {
          const enabled = ENABLED.includes(t);
          return (
            <button
              key={t}
              disabled={!enabled}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-medium border-r border-gray-700 last:border-r-0 ${
                tab === t
                  ? "bg-gray-700 text-white"
                  : enabled
                  ? "text-gray-300 active:bg-gray-700"
                  : "text-gray-600"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* 選択中インジケータ */}
      <div className="px-3 pt-2 text-xs text-gray-400">
        選択: {selectedJoint ?? "なし"}
      </div>

      {/* タブ内容 */}
      {tab === "Move" && (
        <>
          <JointSelector />
          <MoveControls />
        </>
      )}

      {tab === "Pose" && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-3">
          <button
            onClick={resetPose}
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium active:bg-blue-500"
          >
            Reset Pose
          </button>
          <button
            onClick={toggleGrid}
            className="rounded bg-gray-700 px-3 py-2 text-sm active:bg-gray-600"
          >
            グリッド: {showGrid ? "ON" : "OFF"}
          </button>
          <button
            onClick={toggleCP}
            className="rounded bg-gray-700 px-3 py-2 text-sm active:bg-gray-600"
          >
            操作点: {showCP ? "ON" : "OFF"}
          </button>
        </div>
      )}

      {tab === "Rotate" && <RotateControls />}

      {tab === "Camera" && <CameraControls />}

      {tab === "Export" && <ExportPanel />}

      {tab === "Check" && (
        <div className="px-3 py-3">
          <div className="mb-2 flex gap-2">
            <button
              onClick={checkPose}
              className="rounded bg-blue-600 px-3 py-2 text-sm font-medium active:bg-blue-500"
            >
              Check Pose
            </button>
            <button
              onClick={clearWarnings}
              className="rounded bg-gray-700 px-3 py-2 text-sm active:bg-gray-600"
            >
              Clear Warnings
            </button>
          </div>
          {warnings.length === 0 ? (
            <p className="text-xs text-gray-500">警告はありません</p>
          ) : (
            <ul className="space-y-1 text-xs text-amber-400">
              {warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
