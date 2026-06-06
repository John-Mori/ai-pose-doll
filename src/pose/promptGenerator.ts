import type { JointName, Pose, Vec3 } from "./poseTypes";

export interface PromptText {
  ja: string;
  en: string;
}

const COMPO_JA: Record<string, string> = {
  "4:5": "全身が見える4:5の縦構図",
  "9:16": "9:16の縦長構図",
  "16:9": "16:9の横構図",
  "1:1": "1:1の正方形構図",
};
const COMPO_EN: Record<string, string> = {
  "4:5": "a full-body 4:5 vertical composition",
  "9:16": "a tall 9:16 vertical composition",
  "16:9": "a 16:9 wide composition",
  "1:1": "a 1:1 square composition",
};

type ArmState = "forward" | "raised" | "down" | "side";

function armState(j: Record<JointName, Vec3>, side: "left" | "right"): ArmState {
  const s = side === "left" ? j.leftShoulder : j.rightShoulder;
  const w = side === "left" ? j.leftWrist : j.rightWrist;
  if (w[2] - s[2] > 0.15) return "forward";
  if (w[1] - s[1] > 0.05) return "raised";
  if (s[1] - w[1] > 0.2) return "down";
  return "side";
}

const ARM_JA: Record<ArmState, string> = {
  forward: "前方へ伸ばし",
  raised: "上げ",
  down: "体の横に下げ",
  side: "体の横に置き",
};
const ARM_EN: Record<ArmState, string> = {
  forward: "extended forward",
  raised: "raised",
  down: "lowered at the side",
  side: "kept near the side",
};

/**
 * ポーズから画像生成AI向けの補助文を生成する（設計書 §16）。
 * 簡易ヒューリスティック。ユーザーが手直しする前提。
 */
export function generatePrompt(pose: Pose): PromptText {
  const j = pose.joints;
  const yaw = pose.rotations.pelvis[1];
  const dirJa = yaw > 15 ? "やや右向き" : yaw < -15 ? "やや左向き" : "正面向き";
  const dirEn =
    yaw > 15
      ? "slightly angled to the right"
      : yaw < -15
      ? "slightly angled to the left"
      : "facing forward";

  const rArm = armState(j, "right");
  const lArm = armState(j, "left");

  // 重心: 骨盤の真下に近い足
  const dxL = Math.abs(j.leftAnkle[0] - j.pelvis[0]);
  const dxR = Math.abs(j.rightAnkle[0] - j.pelvis[0]);
  const weightJa = dxR < dxL ? "右脚に重心を置いています" : "左脚に重心を置いています";
  const weightEn =
    dxR < dxL ? "The weight is on the right leg" : "The weight is on the left leg";

  const ja = [
    "添付画像の3D人形のポーズと構図を参照してください。",
    `キャラクターは${COMPO_JA[pose.aspectRatio]}で、体は${dirJa}です。`,
    `右腕は${ARM_JA[rArm]}、左腕は${ARM_JA[lArm]}ています。`,
    `${weightJa}。`,
    "3D人形の灰色の質感や背景は反映せず、ポーズ、体の向き、腕と脚の配置、カメラ距離だけを参考にしてください。",
  ].join("\n");

  const en = [
    "Use the attached 3D mannequin image as a pose and composition reference only.",
    `The character is shown in ${COMPO_EN[pose.aspectRatio]}, with the body ${dirEn}.`,
    `The right arm is ${ARM_EN[rArm]}, while the left arm is ${ARM_EN[lArm]}.`,
    `${weightEn}.`,
    "Do not copy the gray mannequin material or background. Use only the pose, body direction, limb placement, and camera distance as reference.",
  ].join("\n");

  return { ja, en };
}
