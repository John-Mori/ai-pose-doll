import { create } from "zustand";
import type {
  AspectRatio,
  ControlPointName,
  JointName,
  PoleName,
  Pose,
  RotatableName,
  Vec3,
} from "./poseTypes";
import { createDefaultPose } from "./defaultPose";
import { solveDependents, computeDisplayJoints } from "./solvePose";
import { validatePose } from "./poseValidator";

/** 移動方向（設計書 §8.3） */
export type MoveDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "forward"
  | "back";

/** カメラ相対の移動基準ベクトル（World座標・Three側から供給） */
export interface CameraBasis {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
}

const POLE_NAMES: PoleName[] = [
  "leftElbowPole",
  "rightElbowPole",
  "leftKneePole",
  "rightKneePole",
];

/** 回転軸（設計書 §8.4） */
export type RotationAxis = "pitch" | "yaw" | "roll";

const ROTATABLE: RotatableName[] = [
  "head",
  "chest",
  "pelvis",
  "leftWrist",
  "rightWrist",
  "leftAnkle",
  "rightAnkle",
];

const add = (a: Vec3, d: Vec3): Vec3 => [a[0] + d[0], a[1] + d[1], a[2] + d[2]];

const AXIS_INDEX: Record<RotationAxis, number> = { pitch: 0, yaw: 1, roll: 2 };

/**
 * ポーズ・選択・表示設定の状態管理（設計書 §19）。
 * Three.js 側は React の外でこのストアを `subscribe` して人形を更新する（§6.3）。
 */
export interface PoseStore {
  pose: Pose;
  /** 表示用の関節（pose.joints に回転を重ねた派生値・§13.6）。描画はこれを使う。 */
  displayJoints: Record<JointName, Vec3>;
  selectedJoint: ControlPointName | null;

  // 表示設定（設計書 §19.1）
  showGrid: boolean;
  showControlPoints: boolean;
  showFrameGuide: boolean;
  moveStep: number;
  rotationStep: number;
  warnings: string[];

  /** Three側が更新するカメラ基準（§8.3） */
  cameraBasis: CameraBasis;

  // actions
  selectJoint: (joint: ControlPointName | null) => void;
  setMoveStep: (step: number) => void;
  setCameraBasis: (basis: CameraBasis) => void;
  moveSelectedJoint: (direction: MoveDirection) => void;
  setRotationStep: (step: number) => void;
  rotateSelectedJoint: (axis: RotationAxis, sign: number) => void;
  loadPose: (pose: Pose) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  toggleGrid: () => void;
  toggleControlPoints: () => void;
  checkPose: () => void;
  clearWarnings: () => void;
  resetPose: () => void;
}

/** 方向 → カメラ基準ベクトルと符号 */
function directionToDelta(
  dir: MoveDirection,
  basis: CameraBasis,
  step: number
): Vec3 {
  let axis: Vec3;
  let sign = 1;
  switch (dir) {
    case "up":
      axis = basis.up;
      break;
    case "down":
      axis = basis.up;
      sign = -1;
      break;
    case "right":
      axis = basis.right;
      break;
    case "left":
      axis = basis.right;
      sign = -1;
      break;
    case "forward":
      axis = basis.forward;
      break;
    case "back":
      axis = basis.forward;
      sign = -1;
      break;
  }
  return [axis[0] * step * sign, axis[1] * step * sign, axis[2] * step * sign];
}

/**
 * パイプライン後半（§11.5 の IK→関節制限→検査）をまとめて適用。
 * - pose.joints: 無回転の真実（リーチ/床制限＋IK・§11.5 step2-4）
 * - displayJoints: 表示用に回転を重ねた派生値（書き戻さない・§13.6）
 * - warnings: 表示ポーズに対する検査（§11.5 step5）
 */
function finalize(pose: Pose): {
  pose: Pose;
  displayJoints: Record<JointName, Vec3>;
  warnings: string[];
} {
  const joints = solveDependents(pose);
  const newPose = { ...pose, joints };
  const displayJoints = computeDisplayJoints(newPose);
  const warnings = validatePose(displayJoints);
  return { pose: newPose, displayJoints, warnings };
}

const initial = finalize(createDefaultPose());

export const usePoseStore = create<PoseStore>((set) => ({
  pose: initial.pose,
  displayJoints: initial.displayJoints,
  selectedJoint: null,

  showGrid: true,
  showControlPoints: true,
  showFrameGuide: false,
  moveStep: 0.05, // 中（設計書 §8.3）
  rotationStep: 10, // 度（設計書 §8.4）

  warnings: [],

  cameraBasis: {
    right: [1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
  },

  selectJoint: (joint) => {
    console.log("[store] selectJoint:", joint);
    set({ selectedJoint: joint });
  },
  setMoveStep: (step) => set({ moveStep: step }),
  setCameraBasis: (basis) => set({ cameraBasis: basis }),

  moveSelectedJoint: (direction) =>
    set((s) => {
      const sel = s.selectedJoint;
      if (!sel) {
        console.log("[store] moveSelectedJoint: 選択なし");
        return {};
      }
      const delta = directionToDelta(direction, s.cameraBasis, s.moveStep);

      // --- 入力（§11.5 step1）: ソース点 or Pole を更新 ---
      const joints = { ...s.pose.joints };
      const poles = { ...s.pose.poles };

      if ((POLE_NAMES as string[]).includes(sel)) {
        // Pole 移動（曲げ方向のみ・§11.2）
        poles[sel as PoleName] = add(poles[sel as PoleName], delta);
      } else if (sel === "pelvis") {
        // pelvis = 全身ルート → 平行移動（§10.4）
        (Object.keys(joints) as JointName[]).forEach((k) => {
          joints[k] = add(joints[k], delta);
        });
        (Object.keys(poles) as PoleName[]).forEach((k) => {
          poles[k] = add(poles[k], delta);
        });
      } else {
        // head/chest/手首/足首 = そのソース点を移動
        joints[sel as JointName] = add(joints[sel as JointName], delta);
      }

      // --- 後半（§11.5 step2-5）: リーチ/床制限→IK→検査 ---
      const r = finalize({ ...s.pose, joints, poles });
      return { pose: r.pose, displayJoints: r.displayJoints, warnings: r.warnings };
    }),

  setRotationStep: (step) => set({ rotationStep: step }),

  rotateSelectedJoint: (axis, sign) =>
    set((s) => {
      const sel = s.selectedJoint;
      if (!sel || !(ROTATABLE as string[]).includes(sel)) {
        console.log("[store] rotateSelectedJoint: 回転不可", sel);
        return {};
      }
      const name = sel as RotatableName;
      const cur = s.pose.rotations[name];
      const next: Vec3 = [...cur] as Vec3;
      next[AXIS_INDEX[axis]] += s.rotationStep * sign;
      const rotations = { ...s.pose.rotations, [name]: next };
      const r = finalize({ ...s.pose, rotations });
      return { pose: r.pose, displayJoints: r.displayJoints, warnings: r.warnings };
    }),

  loadPose: (loaded) => {
    console.log("[store] loadPose:", loaded.poseName);
    const r = finalize(loaded);
    set({
      pose: r.pose,
      displayJoints: r.displayJoints,
      selectedJoint: null,
      warnings: r.warnings,
    });
  },

  checkPose: () =>
    set((s) => {
      const warnings = validatePose(s.displayJoints);
      console.log("[store] checkPose:", warnings);
      return { warnings };
    }),

  clearWarnings: () => set({ warnings: [] }),
  setAspectRatio: (ratio) =>
    set((s) => ({ pose: { ...s.pose, aspectRatio: ratio } })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleControlPoints: () =>
    set((s) => ({ showControlPoints: !s.showControlPoints })),
  resetPose: () => {
    console.log("[store] resetPose");
    // default も IK で従属点を整合させてから反映（§13.5）
    const r = finalize(createDefaultPose());
    set({
      pose: r.pose,
      displayJoints: r.displayJoints,
      selectedJoint: null,
      warnings: [],
    });
  },
}));

// 開発時のデバッグ用にストアを公開（本番ビルドでは無効）
if (import.meta.env.DEV) {
  (window as unknown as { __poseStore: typeof usePoseStore }).__poseStore =
    usePoseStore;
}
