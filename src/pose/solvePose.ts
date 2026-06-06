import type { JointName, PoleName, Pose, Vec3 } from "./poseTypes";
import { add, rotateAround } from "../utils/math3d";
import { OFFSET_FROM_CHEST, OFFSET_FROM_PELVIS, ARM, LEG } from "./skeleton";
import { solveTwoBoneIK } from "./ikSolver";
import {
  clampAnkleReach,
  clampFloor,
  clampWristReach,
} from "./jointLimits";

export interface SolveResult {
  joints: Record<JointName, Vec3>;
  warnings: string[];
}

/**
 * 処理パイプライン（設計書 §11.5）:
 *   2. リーチ/床 制限（ソース点）
 *   3. IK 解決（従属点 肘/膝 を計算）
 *   4. 関節制限
 *   （5. 検査は呼び出し側 or validatePose で）
 *
 * ソース(head/chest/pelvis/手首/足首)＋Pole から、従属点
 * (neck/肩/股/肘/膝) を再計算して完全な joints を返す（設計書 §13.5）。
 */
export function solveDependents(pose: Pose): Record<JointName, Vec3> {
  const j = pose.joints;
  const poles = pose.poles as Record<PoleName, Vec3>;

  // --- 肩/股/首は親からの固定オフセット（§10.4）---
  const chest = j.chest;
  const pelvis = j.pelvis;
  const neck = add(chest, OFFSET_FROM_CHEST.neck);
  const leftShoulder = add(chest, OFFSET_FROM_CHEST.leftShoulder);
  const rightShoulder = add(chest, OFFSET_FROM_CHEST.rightShoulder);
  const leftHip = add(pelvis, OFFSET_FROM_PELVIS.leftHip);
  const rightHip = add(pelvis, OFFSET_FROM_PELVIS.rightHip);

  // --- ステップ2: リーチ/床 制限（ソース点をクランプ）---
  let leftWrist = clampWristReach(leftShoulder, j.leftWrist, "left");
  let rightWrist = clampWristReach(rightShoulder, j.rightWrist, "right");
  let leftAnkle = clampFloor(clampAnkleReach(leftHip, j.leftAnkle, "left"));
  let rightAnkle = clampFloor(clampAnkleReach(rightHip, j.rightAnkle, "right"));

  // --- ステップ3: IK 解決（肘/膝）---
  const leftElbow = solveTwoBoneIK(
    leftShoulder,
    leftWrist,
    poles.leftElbowPole,
    ARM.left.upper,
    ARM.left.lower
  );
  const rightElbow = solveTwoBoneIK(
    rightShoulder,
    rightWrist,
    poles.rightElbowPole,
    ARM.right.upper,
    ARM.right.lower
  );
  const leftKnee = solveTwoBoneIK(
    leftHip,
    leftAnkle,
    poles.leftKneePole,
    LEG.left.thigh,
    LEG.left.shin
  );
  const rightKnee = solveTwoBoneIK(
    rightHip,
    rightAnkle,
    poles.rightKneePole,
    LEG.right.thigh,
    LEG.right.shin
  );

  return {
    head: j.head,
    neck,
    chest,
    pelvis,
    leftShoulder,
    leftElbow,
    leftWrist,
    rightShoulder,
    rightElbow,
    rightWrist,
    leftHip,
    leftKnee,
    leftAnkle,
    rightHip,
    rightKnee,
    rightAnkle,
  };
}

/**
 * 表示・検査・出力用の関節を返す（設計書 §13.6）。
 * 「無回転のソース解決」(solveDependents) に回転をポスト変換で重ねる。
 * 重要: これは pose.joints へ書き戻さない（書き戻すと回転が二重適用される）。
 * pose.joints は常に無回転の真実、表示はこの派生値を使う。
 */
export function computeDisplayJoints(pose: Pose): Record<JointName, Vec3> {
  const out = { ...solveDependents(pose) };
  applyRotations(out, pose);
  return out;
}

const UPPER_BODY: JointName[] = [
  "neck",
  "head",
  "leftShoulder",
  "leftElbow",
  "leftWrist",
  "rightShoulder",
  "rightElbow",
  "rightWrist",
];
const ALL_BUT_PELVIS: JointName[] = [
  "head",
  "neck",
  "chest",
  "leftShoulder",
  "leftElbow",
  "leftWrist",
  "rightShoulder",
  "rightElbow",
  "rightWrist",
  "leftHip",
  "leftKnee",
  "leftAnkle",
  "rightHip",
  "rightKnee",
  "rightAnkle",
];

const isZero = (v: Vec3) => v[0] === 0 && v[1] === 0 && v[2] === 0;

/** head→chest(上半身)→pelvis(全身) の順で回転を重ねる */
function applyRotations(j: Record<JointName, Vec3>, pose: Pose): void {
  const r = pose.rotations;

  // 頭: 首を支点に
  if (!isZero(r.head)) {
    j.head = rotateAround(j.head, j.neck, r.head);
  }
  // 胸: 上半身を chest 支点に回す
  if (!isZero(r.chest)) {
    for (const name of UPPER_BODY) {
      j[name] = rotateAround(j[name], j.chest, r.chest);
    }
  }
  // 腰: 全身を pelvis 支点に回す（体の向き・§10.4）
  if (!isZero(r.pelvis)) {
    for (const name of ALL_BUT_PELVIS) {
      j[name] = rotateAround(j[name], j.pelvis, r.pelvis);
    }
  }
  // 手首/足首の回転は手足マーカーの向き（CP5では位置に影響なし・JSONで保持）
}
