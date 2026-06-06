import { usePoseStore } from "../pose/poseStore";

/**
 * 3Dビュー上に重ねる警告表示（設計書 §14.2）。
 * warnings が空なら何も出さない。
 */
export default function WarningPanel() {
  const warnings = usePoseStore((s) => s.warnings);
  if (warnings.length === 0) return null;

  return (
    <div className="pointer-events-none absolute left-2 top-2 right-2 z-10 space-y-1">
      {warnings.map((w, i) => (
        <div
          key={i}
          className="rounded bg-amber-500/90 px-2 py-1 text-xs font-medium text-gray-900 shadow"
        >
          ⚠ {w}
        </div>
      ))}
    </div>
  );
}
