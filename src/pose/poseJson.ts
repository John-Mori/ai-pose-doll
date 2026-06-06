import type { CameraSettings, Pose } from "./poseTypes";
import { createDefaultPose } from "./defaultPose";
import { isoNow } from "../utils/dateFormat";

export const POSE_VERSION = "0.2.0";

/**
 * 現在ポーズ＋ライブカメラから保存用 Pose を作る（設計書 §13）。
 * 従属点も含めて書き出すが、読込時の真実はソース＋回転＋Pole（§13.5）。
 */
export function buildPoseJson(pose: Pose, camera: CameraSettings): Pose {
  const now = isoNow();
  return {
    ...pose,
    version: POSE_VERSION,
    appName: "AI Pose Doll Mobile",
    createdAt: pose.createdAt || now,
    updatedAt: now,
    camera,
  };
}

export function serializePose(pose: Pose): string {
  return JSON.stringify(pose, null, 2);
}

/**
 * pose.json をパースし、旧版を migration して Pose を返す（設計書 §13.4 / §13.6）。
 * 欠損フィールドは default で補完する。失敗時は例外。
 */
export function parsePoseJson(text: string): Pose {
  const raw = JSON.parse(text) as Partial<Pose> & Record<string, unknown>;
  if (!raw || typeof raw !== "object" || !raw.joints) {
    throw new Error("pose.json の形式が不正です（joints がありません）");
  }

  const base = createDefaultPose();
  const version = (raw.version as string) || "0.1.0";
  if (version !== POSE_VERSION) {
    console.log("[poseJson] migration:", version, "->", POSE_VERSION);
  }

  // rotations が無い旧版(0.1.0)は全0で補完（§13.6）
  const rotations = raw.rotations ?? base.rotations;

  const merged: Pose = {
    ...base,
    ...raw,
    version: POSE_VERSION,
    joints: { ...base.joints, ...raw.joints },
    poles: { ...base.poles, ...(raw.poles ?? {}) },
    rotations: { ...base.rotations, ...rotations },
    bodyScale: { ...base.bodyScale, ...(raw.bodyScale ?? {}) },
    camera: { ...base.camera, ...(raw.camera ?? {}) },
    limits: { ...base.limits, ...(raw.limits ?? {}) },
  } as Pose;

  return merged;
}
