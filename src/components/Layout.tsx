import ThreeViewport from "./ThreeViewport";
import BottomPanel from "./BottomPanel";
import WarningPanel from "./WarningPanel";

/**
 * 画面全体レイアウト（設計書 §14.1）。
 * 上部: アプリ名 / 中央: 3Dビュー / 下部: 操作パネル。スマホ縦持ち基準。
 */
export default function Layout() {
  return (
    <div className="flex h-full flex-col">
      {/* 上部バー */}
      <header className="flex items-center gap-2 bg-gray-900 px-3 py-2 border-b border-gray-700">
        <h1 className="text-base font-semibold tracking-tight">
          AI Pose Doll Mobile
        </h1>
        <span className="ml-auto text-xs text-gray-500">CP5 データ</span>
      </header>

      {/* 中央: 3Dビュー（position:relative の中に absolute canvas） */}
      <main className="relative flex-1 overflow-hidden">
        <ThreeViewport />
        <WarningPanel />
      </main>

      {/* 下部: 操作パネル */}
      <BottomPanel />
    </div>
  );
}
