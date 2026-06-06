import type { Vec3 } from "../pose/poseTypes";

// Vec3(タプル)の最小限ベクトル演算。pose ロジックに THREE を持ち込まないため自前で用意。

export const add = (a: Vec3, b: Vec3): Vec3 => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];

export const sub = (a: Vec3, b: Vec3): Vec3 => [
  a[0] - b[0],
  a[1] - b[1],
  a[2] - b[2],
];

export const scale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];

export const dot = (a: Vec3, b: Vec3): number =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export const length = (a: Vec3): number => Math.sqrt(dot(a, a));

export const distance = (a: Vec3, b: Vec3): number => length(sub(a, b));

export const normalize = (a: Vec3): Vec3 => {
  const len = length(a);
  return len < 1e-9 ? [0, 0, 0] : scale(a, 1 / len);
};

export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

/** v に直交する適当な単位ベクトル（Pole が軸と平行なときの保険） */
export const anyPerpendicular = (v: Vec3): Vec3 => {
  const ref: Vec3 = Math.abs(v[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  return normalize(cross(v, ref));
};

const DEG = Math.PI / 180;

/**
 * オイラー角(度, [pitch=x, yaw=y, roll=z])でベクトルを回転。
 * 回転順序は XYZ 固定（R = Rz·Ry·Rx, X を最初に適用）。設計書 §13.6 に明記する順序。
 */
export const rotateEulerXYZ = (v: Vec3, deg: Vec3): Vec3 => {
  const [rx, ry, rz] = [deg[0] * DEG, deg[1] * DEG, deg[2] * DEG];
  const cx = Math.cos(rx),
    sx = Math.sin(rx);
  const cy = Math.cos(ry),
    sy = Math.sin(ry);
  const cz = Math.cos(rz),
    sz = Math.sin(rz);

  // Rx
  let x = v[0];
  let y = v[1] * cx - v[2] * sx;
  let z = v[1] * sx + v[2] * cx;
  // Ry
  let x2 = x * cy + z * sy;
  let y2 = y;
  let z2 = -x * sy + z * cy;
  // Rz
  return [x2 * cz - y2 * sz, x2 * sz + y2 * cz, z2];
};

/** pivot を中心に point を回転 */
export const rotateAround = (point: Vec3, pivot: Vec3, deg: Vec3): Vec3 =>
  add(pivot, rotateEulerXYZ(sub(point, pivot), deg));
