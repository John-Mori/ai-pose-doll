// ポーズ関連の型定義（設計書 §10, §13, §19）

export type Vec3 = [number, number, number];

/** 全関節名（人形メッシュを構成する点・設計書 §10.1） */
export type JointName =
  | "head"
  | "neck"
  | "chest"
  | "pelvis"
  | "leftShoulder"
  | "leftElbow"
  | "leftWrist"
  | "rightShoulder"
  | "rightElbow"
  | "rightWrist"
  | "leftHip"
  | "leftKnee"
  | "leftAnkle"
  | "rightHip"
  | "rightKnee"
  | "rightAnkle";

/** Pole Target 名（肘・膝の曲げ方向・設計書 §11.2） */
export type PoleName =
  | "leftElbowPole"
  | "rightElbowPole"
  | "leftKneePole"
  | "rightKneePole";

/** ユーザーが直接操作する点（設計書 §10.2） */
export type ControlPointName =
  | "head"
  | "chest"
  | "pelvis"
  | "leftWrist"
  | "rightWrist"
  | "leftAnkle"
  | "rightAnkle"
  | PoleName;

/** 回転を保持する操作点（設計書 §13.6） */
export type RotatableName =
  | "head"
  | "chest"
  | "pelvis"
  | "leftWrist"
  | "rightWrist"
  | "leftAnkle"
  | "rightAnkle";

export type AspectRatio = "4:5" | "9:16" | "16:9" | "1:1";

export interface CameraSettings {
  position: Vec3;
  target: Vec3;
  fov: number;
  zoom: number;
}

export interface BodyScale {
  height: number;
  headSize: number;
  armLength: number;
  legLength: number;
}

/** pose.json と同じ構造（設計書 §13.1） */
export interface Pose {
  version: string;
  appName: string;
  createdAt: string;
  updatedAt: string;
  poseName: string;
  aspectRatio: AspectRatio;
  camera: CameraSettings;
  bodyScale: BodyScale;
  joints: Record<JointName, Vec3>;
  poles: Record<PoleName, Vec3>;
  rotations: Record<RotatableName, Vec3>;
  limits: {
    enabled: boolean;
    strictness: "loose" | "normal" | "strict";
  };
  notes: string;
}
