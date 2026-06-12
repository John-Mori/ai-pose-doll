import type { Pose } from "./poseTypes";

/**
 * 初期ポーズ＝キャラクター体型資料に合わせた立ち姿（正面・腕を下ろした自然体）。
 *
 * 体型仕様（ユーザー提供の体型資料）:
 *   - 身長 160cm  → 内部単位は 1単位=1m とし、全高 ≈ 1.60
 *   - 7頭身        → 頭の高さ ≈ 1.60 / 7 ≈ 0.229。頭は小さめ・脚は長め
 *   - スリムな女性体型（胸・くびれ・腰のラインが分かるよう太さも調整。createDoll.ts 参照）
 *
 * 座標系: X:左右 / Y:上下 / Z:前後、床 Y=0。createdAt/updatedAt は保存・読込時に上書き。
 *
 * 縦の目安（頭頂=1.60, 1頭≈0.229）:
 *   頭頂1.60 / 頭中心1.49 / 顎1.37 / 肩1.27 / 胸(バスト)1.12 / くびれ~1.0 /
 *   骨盤0.84 / 股0.80 / 膝0.40 / 足首0.05 / 床0
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
      position: [0, 0.95, 4.0],
      target: [0, 0.82, 0],
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
      // 体幹（中央）
      head: [0, 1.49, 0],
      neck: [0, 1.31, 0],
      chest: [0, 1.12, 0],
      pelvis: [0, 0.84, 0],
      // 腕（自然に下ろす。肩はやや狭め＝女性的。肘は Pole で背側へわずかに曲がる）
      leftShoulder: [-0.15, 1.27, 0],
      leftElbow: [-0.2, 0.95, 0.07],
      leftWrist: [-0.18, 0.7, 0.04],
      rightShoulder: [0.15, 1.27, 0],
      rightElbow: [0.2, 0.95, 0.07],
      rightWrist: [0.18, 0.7, 0.04],
      // 脚（腰は肩と同等〜やや広め。膝を少し前に、スリムで脚は長め）
      leftHip: [-0.13, 0.8, 0],
      leftKnee: [-0.11, 0.4, 0.06],
      leftAnkle: [-0.1, 0.05, 0],
      rightHip: [0.13, 0.8, 0],
      rightKnee: [0.11, 0.4, 0.06],
      rightAnkle: [0.1, 0.05, 0],
    },
    poles: {
      leftElbowPole: [-0.2, 0.95, -0.35], // 肘は背側へ
      rightElbowPole: [0.2, 0.95, -0.35],
      leftKneePole: [-0.11, 0.42, 0.5], // 膝は前へ
      rightKneePole: [0.11, 0.42, 0.5],
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
    notes: "体型資料: 身長160cm / 7頭身 / スリム女性体型",
  };
}
