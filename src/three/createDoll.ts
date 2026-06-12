import * as THREE from "three";
import type { JointName, Vec3 } from "../pose/poseTypes";

/**
 * 骨格セグメントの半径（体型資料: 7頭身スリム女性）。
 * 胴体は「胸(やや太)→くびれ(spineを細く)→腰(太)」でラインを表現。手脚は細め、脚＞腕。
 */
const BONES: Array<[JointName, JointName, number]> = [
  // [from, to, 半径]
  ["pelvis", "chest", 0.085], // 胴体（spine）＝くびれ。胸/腰の球より細くする
  ["chest", "neck", 0.04],
  ["neck", "head", 0.038],
  // 腕（細め）
  ["chest", "leftShoulder", 0.04],
  ["leftShoulder", "leftElbow", 0.036],
  ["leftElbow", "leftWrist", 0.03],
  ["chest", "rightShoulder", 0.04],
  ["rightShoulder", "rightElbow", 0.036],
  ["rightElbow", "rightWrist", 0.03],
  // 脚（腕より太く、太もも＞ふくらはぎ）
  ["pelvis", "leftHip", 0.05],
  ["leftHip", "leftKnee", 0.058],
  ["leftKnee", "leftAnkle", 0.042],
  ["pelvis", "rightHip", 0.05],
  ["rightHip", "rightKnee", 0.058],
  ["rightKnee", "rightAnkle", 0.042],
];

/**
 * 関節の球の半径。head は7頭身ぶん小さめ。
 * chest=バスト、pelvis=ヒップで、間の spine(0.085) よりやや太くしてくびれを出す。
 */
const JOINT_RADIUS: Partial<Record<JointName, number>> = {
  head: 0.114, // 7頭身: 頭の高さ ≈ 全高1.6/7 ≈ 0.229（直径）
  chest: 0.1, // バスト/胸郭
  pelvis: 0.118, // ヒップ（最も広い）
};
const DEFAULT_JOINT_RADIUS = 0.035; // 肩肘膝足首など＝細い関節

const UP = new THREE.Vector3(0, 1, 0);

export interface DollBundle {
  group: THREE.Group;
  /** 関節座標から人形メッシュを更新（命令的・設計書 §6.3） */
  update: (joints: Record<JointName, Vec3>) => void;
  dispose: () => void;
}

/**
 * Sphere / Cylinder のプリミティブで簡易デッサン人形を組む（設計書 §9）。
 */
export function createDoll(joints: Record<JointName, Vec3>): DollBundle {
  console.log("[createDoll] 人形を生成");

  const group = new THREE.Group();
  group.name = "doll";

  const material = new THREE.MeshStandardMaterial({
    color: 0xb9c2cf,
    roughness: 0.75,
    metalness: 0.05,
  });

  // --- 関節の球 ---
  const jointMeshes = {} as Record<JointName, THREE.Mesh>;
  (Object.keys(joints) as JointName[]).forEach((name) => {
    const r = JOINT_RADIUS[name] ?? DEFAULT_JOINT_RADIUS;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 16, 12),
      material
    );
    mesh.name = `joint:${name}`;
    group.add(mesh);
    jointMeshes[name] = mesh;
  });

  // --- 骨（単位シリンダー height=1 を scale.y で伸ばす） ---
  const boneMeshes = BONES.map(([from, to, radius]) => {
    const geo = new THREE.CylinderGeometry(radius, radius, 1, 12);
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = `bone:${from}->${to}`;
    group.add(mesh);
    return { from, to, mesh };
  });

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const dirv = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  function update(j: Record<JointName, Vec3>): void {
    // 関節球
    (Object.keys(jointMeshes) as JointName[]).forEach((name) => {
      const p = j[name];
      jointMeshes[name].position.set(p[0], p[1], p[2]);
    });
    // 骨
    for (const { from, to, mesh } of boneMeshes) {
      a.set(...j[from]);
      b.set(...j[to]);
      mid.addVectors(a, b).multiplyScalar(0.5);
      dirv.subVectors(b, a);
      const len = dirv.length();
      mesh.position.copy(mid);
      if (len > 1e-5) {
        dirv.normalize();
        quat.setFromUnitVectors(UP, dirv);
        mesh.quaternion.copy(quat);
        mesh.scale.set(1, len, 1);
      }
    }
  }

  function dispose(): void {
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
    material.dispose();
  }

  update(joints);
  return { group, update, dispose };
}
