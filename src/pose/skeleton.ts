import { createDefaultPose } from "./defaultPose";
import { distance, sub } from "../utils/math3d";
import type { Vec3 } from "./poseTypes";

/**
 * 静止ポーズ（default）から導く骨格の固定情報。
 * - 肩/股/首は親(chest/pelvis)からの固定オフセット（設計書 §10.4: 肩はchestの子, 股はpelvisの子）
 * - 各骨の長さは IK のリーチ計算に使う（設計書 §11.4）
 */
const d = createDefaultPose().joints;

export const FLOOR_Y = 0;

/** chest からのオフセット */
export const OFFSET_FROM_CHEST = {
  neck: sub(d.neck, d.chest) as Vec3,
  leftShoulder: sub(d.leftShoulder, d.chest) as Vec3,
  rightShoulder: sub(d.rightShoulder, d.chest) as Vec3,
};

/** pelvis からのオフセット */
export const OFFSET_FROM_PELVIS = {
  leftHip: sub(d.leftHip, d.pelvis) as Vec3,
  rightHip: sub(d.rightHip, d.pelvis) as Vec3,
};

/** 腕の骨長（肩→肘→手首） */
export const ARM = {
  left: {
    upper: distance(d.leftShoulder, d.leftElbow),
    lower: distance(d.leftElbow, d.leftWrist),
  },
  right: {
    upper: distance(d.rightShoulder, d.rightElbow),
    lower: distance(d.rightElbow, d.rightWrist),
  },
};

/** 脚の骨長（股→膝→足首） */
export const LEG = {
  left: {
    thigh: distance(d.leftHip, d.leftKnee),
    shin: distance(d.leftKnee, d.leftAnkle),
  },
  right: {
    thigh: distance(d.rightHip, d.rightKnee),
    shin: distance(d.rightKnee, d.rightAnkle),
  },
};

export const armMax = (side: "left" | "right"): number =>
  ARM[side].upper + ARM[side].lower;

export const legMax = (side: "left" | "right"): number =>
  LEG[side].thigh + LEG[side].shin;
