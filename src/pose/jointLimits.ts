import type { JointName, Vec3 } from "./poseTypes";
import { add, distance, normalize, scale, sub } from "../utils/math3d";
import { FLOOR_Y, armMax, legMax } from "./skeleton";

/**
 * ソース点(手首/足首)に対する関節制限（設計書 §11.4 / §12）。
 * IK を解く前に適用して、リーチ超過・床貫通を抑える。
 * 戻り値はクランプ後の手首/足首座標。
 */

/** 手首が肩から腕の最大長を超えて離れないようにする */
export function clampWristReach(
  shoulder: Vec3,
  wrist: Vec3,
  side: "left" | "right"
): Vec3 {
  const max = armMax(side) * 0.999;
  const d = distance(shoulder, wrist);
  if (d <= max) return wrist;
  const dir = normalize(sub(wrist, shoulder));
  return add(shoulder, scale(dir, max));
}

/** 足首が股関節から脚の最大長を超えて離れないようにする */
export function clampAnkleReach(
  hip: Vec3,
  ankle: Vec3,
  side: "left" | "right"
): Vec3 {
  const max = legMax(side) * 0.999;
  const d = distance(hip, ankle);
  if (d <= max) return ankle;
  const dir = normalize(sub(hip, ankle));
  // hip 側へ引き戻す
  return add(ankle, scale(dir, d - max));
}

/** 足が床より下に沈まないようにする（設計書 §12.2 脚） */
export function clampFloor(point: Vec3): Vec3 {
  if (point[1] >= FLOOR_Y) return point;
  return [point[0], FLOOR_Y, point[2]];
}

/** デバッグ用: クランプ結果のまとめ */
export type ClampedSources = Partial<Record<JointName, Vec3>>;
