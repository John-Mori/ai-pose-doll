import type { Vec3 } from "./poseTypes";
import {
  add,
  anyPerpendicular,
  clamp,
  dot,
  length,
  normalize,
  scale,
  sub,
} from "../utils/math3d";

/**
 * 解析的な2ボーンIK（設計書 §11.2 / §11.3）。
 * root(肩/股) と target(手首/足首) と pole(曲げ方向) と2本の骨長から、
 * 中間関節(肘/膝)の位置を求める。
 *
 * 肘/膝は常に pole 側へ曲がるため、逆曲げは構造的に起きない（設計書 §11.4）。
 */
export function solveTwoBoneIK(
  root: Vec3,
  target: Vec3,
  pole: Vec3,
  len1: number, // root→mid
  len2: number // mid→target
): Vec3 {
  const toTarget = sub(target, root);
  const dist = length(toTarget);
  const axis = dist < 1e-6 ? [0, -1, 0] as Vec3 : scale(toTarget, 1 / dist);

  // 余弦定理で root から「肘の足」までの距離 a と、軸からの高さ h を求める
  const minReach = Math.abs(len1 - len2) + 1e-4;
  const maxReach = len1 + len2 - 1e-4;
  const d = clamp(dist, minReach, maxReach);

  const a = (len1 * len1 - len2 * len2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, len1 * len1 - a * a));

  const foot = add(root, scale(axis, a));

  // pole を軸に直交する成分へ射影し、その向きへ h だけ持ち上げる
  const poleVec = sub(pole, root);
  let perp = sub(poleVec, scale(axis, dot(poleVec, axis)));
  if (length(perp) < 1e-5) {
    perp = anyPerpendicular(axis); // pole が軸と平行: 保険
  } else {
    perp = normalize(perp);
  }

  return add(foot, scale(perp, h));
}
