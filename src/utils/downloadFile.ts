/**
 * ブラウザでファイル保存（設計書 §24.5）。
 * スマホでは a[download] のダウンロードリンク経由でファイルアプリ/共有シートへ。
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // 解放は少し遅らせる（iOS Safari 対策）
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(
  text: string,
  filename: string,
  mime = "text/plain"
): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  downloadBlob(blob, filename);
}

function triggerDownload(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  console.log("[download]", filename);
}
