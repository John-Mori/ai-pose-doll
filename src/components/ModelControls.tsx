import { useRef, useState } from "react";
import { usePoseStore } from "../pose/poseStore";
import { viewportApi } from "../three/viewportApi";

/**
 * キャラ3Dモデル(VRM推奨/GLB)の読込・解除（設計書 §10B 拡張）。
 * 読み込むと人形の代わりにモデルがポーズへ追従する。
 */
export default function ModelControls() {
  const modelName = usePoseStore((s) => s.modelName);
  const setModelName = usePoseStore((s) => s.setModelName);
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setMsg("読込中...");
    try {
      const buf = await file.arrayBuffer();
      const name = await viewportApi.loadModel!(buf, file.name);
      setModelName(name);
      setMsg(`表示中: ${name}`);
    } catch (err) {
      console.error("[ModelControls] load error", err);
      setMsg(err instanceof Error ? err.message : "読込に失敗しました");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    viewportApi.removeModel?.();
    setModelName(null);
    setMsg("人形表示に戻しました");
  };

  return (
    <div className="mt-2 w-full border-t border-gray-700 pt-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">キャラモデル</span>
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy}
          className="rounded bg-purple-600 px-3 py-1.5 text-sm font-medium active:bg-purple-500 disabled:opacity-50"
        >
          {busy ? "読込中..." : "VRM/GLB を読込"}
        </button>
        {modelName && (
          <button
            onClick={remove}
            className="rounded bg-gray-700 px-3 py-1.5 text-sm active:bg-gray-600"
          >
            人形に戻す
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept=".vrm,.glb,model/gltf-binary"
          className="hidden"
          onChange={onPick}
        />
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {msg || "VRoid等で書き出した VRM を推奨。読み込むとポーズに追従します。"}
      </p>
    </div>
  );
}
