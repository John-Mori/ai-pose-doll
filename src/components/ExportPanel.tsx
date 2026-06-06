import { useRef, useState } from "react";
import { usePoseStore } from "../pose/poseStore";
import { viewportApi } from "../three/viewportApi";
import { EXPORT_SIZE } from "../three/cameraPresets";
import type { ExportBackground } from "../three/exportCanvas";
import {
  buildPoseJson,
  parsePoseJson,
  serializePose,
} from "../pose/poseJson";
import { generatePrompt } from "../pose/promptGenerator";
import { downloadBlob, downloadText } from "../utils/downloadFile";
import { fileStamp } from "../utils/dateFormat";

const BACKGROUNDS: Array<{ value: ExportBackground; label: string }> = [
  { value: "white", label: "白" },
  { value: "gray", label: "グレー" },
  { value: "transparent", label: "透過" },
  { value: "current", label: "現在" },
];

/**
 * Exportタブ（設計書 §14.8）。CP4 では PNG 保存に対応。
 * JSON / TXT 出力は CP5 で追加。
 */
export default function ExportPanel() {
  const aspectRatio = usePoseStore((s) => s.pose.aspectRatio);
  const loadPose = usePoseStore((s) => s.loadPose);
  const setAspectRatio = usePoseStore((s) => s.setAspectRatio);

  // 既定は ChatGPT 添付用（操作点なし・白背景・グリッドなし, §15.4）
  const [background, setBackground] = useState<ExportBackground>("white");
  const [withCP, setWithCP] = useState(false);
  const [withGrid, setWithGrid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);

  const savePoseJson = () => {
    const pose = usePoseStore.getState().pose;
    const camera = viewportApi.getCameraState?.() ?? pose.camera;
    const out = buildPoseJson(pose, camera);
    downloadText(
      serializePose(out),
      `pose_${fileStamp()}.pose.json`,
      "application/json"
    );
    setMsg("Pose JSON を保存しました");
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを再選択できるように
    if (!file) return;
    try {
      const text = await file.text();
      const pose = parsePoseJson(text);
      loadPose(pose);
      setAspectRatio(pose.aspectRatio);
      viewportApi.setCameraState?.(pose.camera);
      setMsg(`読込: ${pose.poseName}`);
    } catch (err) {
      console.error("[ExportPanel] load error", err);
      setMsg("読込に失敗しました（JSON形式を確認）");
    }
  };

  const promptFromDisplay = () => {
    const st = usePoseStore.getState();
    // 表示用(回転反映)の関節で説明文を作る
    return generatePrompt({ ...st.pose, joints: st.displayJoints });
  };

  const savePromptTxt = () => {
    const { ja, en } = promptFromDisplay();
    downloadText(`${ja}\n\n---\n\n${en}\n`, `pose_${fileStamp()}_prompt.txt`);
    setMsg("プロンプト TXT を保存しました");
  };

  const copyPrompt = async () => {
    const { ja, en } = promptFromDisplay();
    try {
      await navigator.clipboard.writeText(`${ja}\n\n---\n\n${en}`);
      setMsg("プロンプトをコピーしました");
    } catch {
      setMsg("コピーに失敗しました");
    }
  };

  const savePNG = async () => {
    if (!viewportApi.exportPNG) return;
    setBusy(true);
    setMsg("");
    const [w, h] = EXPORT_SIZE[aspectRatio];
    try {
      const blob = await viewportApi.exportPNG({
        width: w,
        height: h,
        background,
        showControlPoints: withCP,
        showGrid: withGrid,
      });
      if (blob) {
        downloadBlob(blob, `pose_${fileStamp()}.png`);
        setMsg(`保存しました (${w}×${h})`);
      } else {
        setMsg("書き出しに失敗しました");
      }
    } catch (e) {
      console.error("[ExportPanel] savePNG error", e);
      setMsg("エラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-3">
      {/* 背景 */}
      <div className="mb-2">
        <span className="text-xs text-gray-400">背景</span>
        <div className="mt-1 flex gap-1">
          {BACKGROUNDS.map((b) => (
            <button
              key={b.value}
              onClick={() => setBackground(b.value)}
              className={`flex-1 rounded py-2 text-xs ${
                background === b.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-300 active:bg-gray-600"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* 表示トグル */}
      <div className="mb-3 flex gap-2">
        <button
          onClick={() => setWithCP((v) => !v)}
          className="flex-1 rounded bg-gray-700 py-2 text-xs active:bg-gray-600"
        >
          操作点: {withCP ? "あり" : "なし"}
        </button>
        <button
          onClick={() => setWithGrid((v) => !v)}
          className="flex-1 rounded bg-gray-700 py-2 text-xs active:bg-gray-600"
        >
          グリッド: {withGrid ? "あり" : "なし"}
        </button>
      </div>

      <button
        onClick={savePNG}
        disabled={busy}
        className="w-full rounded bg-blue-600 py-3 text-sm font-medium active:bg-blue-500 disabled:opacity-50"
      >
        {busy ? "書き出し中..." : `Save PNG（${aspectRatio}）`}
      </button>

      {/* Pose JSON（再編集用・§13） */}
      <div className="mt-3 border-t border-gray-700 pt-3">
        <span className="text-xs text-gray-400">再編集データ（.pose.json）</span>
        <div className="mt-1 flex gap-2">
          <button
            onClick={savePoseJson}
            className="flex-1 rounded bg-gray-700 py-2 text-sm active:bg-gray-600"
          >
            Save JSON
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="flex-1 rounded bg-gray-700 py-2 text-sm active:bg-gray-600"
          >
            Load JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onPickFile}
          />
        </div>
      </div>

      {/* プロンプト補助文（§16） */}
      <div className="mt-3 border-t border-gray-700 pt-3">
        <span className="text-xs text-gray-400">プロンプト補助文（.txt）</span>
        <div className="mt-1 flex gap-2">
          <button
            onClick={savePromptTxt}
            className="flex-1 rounded bg-gray-700 py-2 text-sm active:bg-gray-600"
          >
            Save TXT
          </button>
          <button
            onClick={copyPrompt}
            className="flex-1 rounded bg-gray-700 py-2 text-sm active:bg-gray-600"
          >
            Copy Prompt
          </button>
        </div>
      </div>

      {msg && <p className="mt-2 text-center text-xs text-gray-400">{msg}</p>}
    </div>
  );
}
