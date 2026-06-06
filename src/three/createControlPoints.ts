import * as THREE from "three";
import type {
  ControlPointName,
  JointName,
  PoleName,
  Vec3,
} from "../pose/poseTypes";

// ユーザーが直接操作する11点（設計書 §10.2）
const JOINT_POINTS: ControlPointName[] = [
  "head",
  "chest",
  "pelvis",
  "leftWrist",
  "rightWrist",
  "leftAnkle",
  "rightAnkle",
];
const POLE_POINTS: PoleName[] = [
  "leftElbowPole",
  "rightElbowPole",
  "leftKneePole",
  "rightKneePole",
];

const COLOR_JOINT = 0xf59e0b; // オレンジ: 関節操作点
const COLOR_POLE = 0x22d3ee; // シアン: Pole
const COLOR_SELECTED = 0xfde047; // 黄: 選択中
const RADIUS = 0.06;

export interface ControlPointsBundle {
  group: THREE.Group;
  /** Raycast 対象のメッシュ一覧（userData.cpName に名前） */
  meshes: THREE.Mesh[];
  update: (
    joints: Record<JointName, Vec3>,
    poles: Record<PoleName, Vec3>
  ) => void;
  setSelected: (name: ControlPointName | null) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

/**
 * 操作点を球で表示し、タップ選択できるようにする（設計書 §14.2 / Step4）。
 * 人形に隠れてもタップしやすいよう depthTest を切って常に手前に描く。
 */
export function createControlPoints(): ControlPointsBundle {
  console.log("[createControlPoints] 操作点を生成");

  const group = new THREE.Group();
  group.name = "controlPoints";
  group.renderOrder = 10;

  const meshes: THREE.Mesh[] = [];
  const byName = new Map<ControlPointName, THREE.Mesh>();
  const baseColor = new Map<ControlPointName, number>();

  const make = (name: ControlPointName, color: number) => {
    const mat = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(RADIUS, 16, 12), mat);
    mesh.name = `cp:${name}`;
    mesh.renderOrder = 11;
    mesh.userData.cpName = name;
    group.add(mesh);
    meshes.push(mesh);
    byName.set(name, mesh);
    baseColor.set(name, color);
  };

  JOINT_POINTS.forEach((n) => make(n, COLOR_JOINT));
  POLE_POINTS.forEach((n) => make(n, COLOR_POLE));

  const update = (
    joints: Record<JointName, Vec3>,
    poles: Record<PoleName, Vec3>
  ) => {
    JOINT_POINTS.forEach((n) => {
      const p = joints[n as JointName];
      byName.get(n)!.position.set(p[0], p[1], p[2]);
    });
    POLE_POINTS.forEach((n) => {
      const p = poles[n];
      byName.get(n)!.position.set(p[0], p[1], p[2]);
    });
  };

  const setSelected = (name: ControlPointName | null) => {
    byName.forEach((mesh, n) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      if (n === name) {
        mat.color.setHex(COLOR_SELECTED);
        mesh.scale.setScalar(1.5);
      } else {
        mat.color.setHex(baseColor.get(n)!);
        mesh.scale.setScalar(1);
      }
    });
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  const dispose = () => {
    meshes.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  };

  return { group, meshes, update, setSelected, setVisible, dispose };
}
