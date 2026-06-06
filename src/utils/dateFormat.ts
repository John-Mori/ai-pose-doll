/** ファイル名用のタイムスタンプ "YYYYMMDD_HHmm"（設計書 §4.5） */
export function fileStamp(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `_${p(d.getHours())}${p(d.getMinutes())}`
  );
}

/** ISO8601（+09:00 などローカルオフセット付き） */
export function isoNow(d: Date = new Date()): string {
  const tz = -d.getTimezoneOffset();
  const sign = tz >= 0 ? "+" : "-";
  const p = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return (
    local.toISOString().replace("Z", "") +
    `${sign}${p(tz / 60)}:${p(tz % 60)}`
  );
}
