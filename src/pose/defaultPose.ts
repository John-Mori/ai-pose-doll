import type { Pose } from "./poseTypes";

/**
 * 初期ポーズ（おおむね T〜A ポーズ）。
 * 座標は設計書 §13.1 のサンプルを基準。X:左右 / Y:上下 / Z:前後、床 Y=0、身長 約1.7。
 * createdAt / updatedAt は読込・保存時に上書きするためここでは固定文字列。
 */
export function createDefaultPose(): Pose {
  return {
    version: "0.2.0",
    appName: "AI Pose Doll Mobile",
    createdAt: "2026-06-06T00:00:00+09:00",
    updatedAt: "2026-06-06T00:00:00+09:00",
    poseName: "default_pose",
    aspectRatio: "4:5",
    camera: {
      position: [0, 1.3, 4.5],
      target: [0, 1.1, 0],
      fov: 35,
      zoom: 1.0,
    },
    bodyScale: {
      height: 1.0,
      headSize: 1.0,
      armLength: 1.0,
      legLength: 1.0,
    },
    joints: {
      head: [0, 1.72, 0],
      neck: [0, 1.55, 0],
      chest: [0, 1.32, 0],
      pelvis: [0, 0.95, 0],
      leftShoulder: [-0.22, 1.38, 0],
      leftElbow: [-0.45, 1.18, 0.1],
      leftWrist: [-0.62, 1.02, 0.2],
      rightShoulder: [0.22, 1.38, 0],
      rightElbow: [0.5, 1.25, 0.1],
      rightWrist: [0.75, 1.22, 0.25],
      leftHip: [-0.13, 0.9, 0],
      leftKnee: [-0.25, 0.48, 0.05],
      leftAnkle: [-0.35, 0.05, 0.08],
      rightHip: [0.13, 0.9, 0],
      rightKnee: [0.28, 0.48, 0.05],
      rightAnkle: [0.42, 0.05, 0.08],
    },
    poles: {
      leftElbowPole: [-0.5, 1.2, -0.4],
      rightElbowPole: [0.5, 1.2, -0.4],
      leftKneePole: [-0.25, 0.5, 0.5],
      rightKneePole: [0.25, 0.5, 0.5],
    },
    rotations: {
      head: [0, 0, 0],
      chest: [0, 0, 0],
      pelvis: [0, 0, 0],
      leftWrist: [0, 0, 0],
      rightWrist: [0, 0, 0],
      leftAnkle: [0, 0, 0],
      rightAnkle: [0, 0, 0],
    },
    limits: {
      enabled: true,
      strictness: "normal",
    },
    notes: "AI image generation pose reference",
  };
}
