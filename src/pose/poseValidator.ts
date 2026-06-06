import type { JointName, Vec3 } from "./poseTypes";
import { distance } from "../utils/math3d";
import { FLOOR_Y } from "./skeleton";

/**
 * ポーズ検査（設計書 §12.2 / §11.5 ステップ5）。
 * 破綻を「止める」のではなく warnings として知らせる簡易判定。
 */
export function validatePose(joints: Record<JointName, Vec3>): string[] {
  const warnings: string[] = [];

  const pelvis = joints.pelvis;
  const la = joints.leftAnkle;
  const ra = joints.rightAnkle;

  const onFloor = (a: Vec3) => a[1] <= FLOOR_Y + 0.06;
  const leftDown = onFloor(la);
  const rightDown = onFloor(ra);

  // --- 重心（骨盤の水平位置 vs 支持足）---
  if (leftDown && rightDown) {
    const minX = Math.min(la[0], ra[0]) - 0.12;
    const maxX = Math.max(la[0], ra[0]) + 0.12;
    if (pelvis[0] < minX || pelvis[0] > maxX) {
      warnings.push("重心: 骨盤が両足の支持範囲から外れています");
    }
  } else if (leftDown !== rightDown) {
    const support = leftDown ? la : ra;
    if (Math.abs(pelvis[0] - support[0]) > 0.25) {
      warnings.push("重心: 片足立ちで骨盤が支持足から大きく外れています");
    }
  }

  // --- 両足が極端に開きすぎ（設計書 §12.2 脚）---
  if (distance([la[0], 0, la[2]], [ra[0], 0, ra[2]]) > 1.2) {
    warnings.push("脚: 両足が離れすぎています");
  }

  // --- 腕が胴体中心を大きく越えて反対側へ貫通（簡易）---
  const chestX = joints.chest[0];
  if (joints.leftWrist[0] > chestX + 0.25) {
    warnings.push("腕: 左手が胴体を大きく越えています");
  }
  if (joints.rightWrist[0] < chestX - 0.25) {
    warnings.push("腕: 右手が胴体を大きく越えています");
  }

  // --- 床貫通の最終チェック ---
  if (la[1] < FLOOR_Y - 1e-3 || ra[1] < FLOOR_Y - 1e-3) {
    warnings.push("脚: 足が床より下にあります");
  }

  return warnings;
}
