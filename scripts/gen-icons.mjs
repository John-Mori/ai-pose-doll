// PWA アイコンPNGを生成（外部依存なし・zlib の PNG エンコーダ）。
// 実行: node scripts/gen-icons.mjs
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";

function encodePNG(size, draw) {
  const w = size;
  const h = size;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const [r, g, b] = draw(x, y, w, h);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, data])) >>> 0);
    return Buffer.concat([len, t, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// 灰色人形を想起させる簡易アイコン
const draw = (x, y, w, h) => {
  const bg = [31, 41, 55]; // #1f2937
  const fg = [185, 194, 207]; // 人形の灰色
  const cx = w / 2;
  const headY = h * 0.34;
  const headR = w * 0.13;
  if (Math.hypot(x - cx, y - headY) < headR) return fg; // 頭
  if (Math.abs(x - cx) < w * 0.07 && y > headY && y < h * 0.74) return fg; // 胴
  // 腕
  if (Math.abs(y - h * 0.5) < w * 0.05 && Math.abs(x - cx) < w * 0.26) return fg;
  // 脚
  if (y > h * 0.72 && y < h * 0.9 && Math.abs(Math.abs(x - cx) - w * 0.09) < w * 0.05)
    return fg;
  return bg;
};

const outDir = path.resolve("public/icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), encodePNG(192, draw));
fs.writeFileSync(path.join(outDir, "icon-512.png"), encodePNG(512, draw));
console.log("icons generated in", outDir);
