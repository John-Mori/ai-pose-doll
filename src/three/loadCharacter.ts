import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils, type VRM } from "@pixiv/three-vrm";
import type { JointName, RotatableName, Vec3 } from "../pose/poseTypes";

/**
 * VRM(推奨) / GLB のヒューマノイドモデルを読み込み、本アプリの16関節ポーズに
 * 追従させる（位置→ボーン回転のリターゲット）。設計書 §10B / 拡張。
 *
 * ねらい: 「ただの人形」ではなく、ユーザーが用意したキャラ3Dモデルを動かす。
 * 仕組み: 各ボーンを「対応する関節ベクトルの向き」へ回す（aim）。ねじりは位置情報からは
 * 決まらないため rest 準拠（MVP）。腰の向き・頭の回転はオイラー角で別途適用。
 */

const DEG = Math.PI / 180;

// VRM ヒューマノイドボーン → (向ける元関節, 向ける先関節, 子ボーン候補)
interface BoneAim {
  bone: string;
  from: JointName;
  to: JointName;
  child: string[]; // rest方向を測る子ボーン（最初に存在するもの）
}
const AIM: BoneAim[] = [
  { bone: "spine", from: "pelvis", to: "chest", child: ["chest", "upperChest", "neck"] },
  { bone: "chest", from: "chest", to: "neck", child: ["upperChest", "neck"] },
  { bone: "upperChest", from: "chest", to: "neck", child: ["neck"] },
  { bone: "neck", from: "neck", to: "head", child: ["head"] },
  { bone: "leftShoulder", from: "chest", to: "leftShoulder", child: ["leftUpperArm"] },
  { bone: "leftUpperArm", from: "leftShoulder", to: "leftElbow", child: ["leftLowerArm"] },
  { bone: "leftLowerArm", from: "leftElbow", to: "leftWrist", child: ["leftHand"] },
  { bone: "rightShoulder", from: "chest", to: "rightShoulder", child: ["rightUpperArm"] },
  { bone: "rightUpperArm", from: "rightShoulder", to: "rightElbow", child: ["rightLowerArm"] },
  { bone: "rightLowerArm", from: "rightElbow", to: "rightWrist", child: ["rightHand"] },
  { bone: "leftUpperLeg", from: "leftHip", to: "leftKnee", child: ["leftLowerLeg"] },
  { bone: "leftLowerLeg", from: "leftKnee", to: "leftAnkle", child: ["leftFoot"] },
  { bone: "rightUpperLeg", from: "rightHip", to: "rightKnee", child: ["rightLowerLeg"] },
  { bone: "rightLowerLeg", from: "rightKnee", to: "rightAnkle", child: ["rightFoot"] },
];

export interface CharacterBundle {
  scene: THREE.Group;
  name: string;
  applyPose: (
    joints: Record<JointName, Vec3>,
    rotations: Record<RotatableName, Vec3>
  ) => void;
  update: (delta: number) => void; // springbone(髪揺れ)等
  dispose: () => void;
}

function eulerQuat(deg: Vec3): THREE.Quaternion {
  const e = new THREE.Euler(deg[0] * DEG, deg[1] * DEG, deg[2] * DEG, "XYZ");
  return new THREE.Quaternion().setFromEuler(e);
}

export async function loadCharacter(
  data: ArrayBuffer,
  fileName: string
): Promise<CharacterBundle> {
  console.log("[loadCharacter] 読込開始:", fileName);
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  const gltf = await loader.parseAsync(data, "");
  const loadedVrm = gltf.userData.vrm as VRM | undefined;
  if (!loadedVrm || !loadedVrm.humanoid) {
    throw new Error(
      "ヒューマノイドVRMとして読めませんでした（VRM形式を推奨。VRoid等で書き出してください）"
    );
  }
  // 以降は非Optionalで扱う（クロージャ内の絞り込み維持のため）
  const vrm: VRM = loadedVrm;

  // VRM0 は後ろ向き → 前(+Z)向きへ。不要ノード整理。
  VRMUtils.rotateVRM0(vrm);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  vrm.scene.traverse((o) => (o.frustumCulled = false));

  const getBone = (n: string): THREE.Object3D | null =>
    vrm.humanoid.getRawBoneNode(n as never) ?? null;

  // --- rest(バインドポーズ)の世界変換を記録（scene=identity, scale=1） ---
  vrm.scene.position.set(0, 0, 0);
  vrm.scene.quaternion.identity();
  vrm.scene.scale.setScalar(1);
  vrm.scene.updateMatrixWorld(true);

  const restPos = new Map<string, THREE.Vector3>();
  const restQuat = new Map<string, THREE.Quaternion>();
  const allBones = new Set<string>();
  AIM.forEach((a) => {
    allBones.add(a.bone);
    a.child.forEach((c) => allBones.add(c));
  });
  ["hips", "head", "leftFoot", "rightFoot"].forEach((b) => allBones.add(b));
  allBones.forEach((n) => {
    const b = getBone(n);
    if (b) {
      restPos.set(n, b.getWorldPosition(new THREE.Vector3()));
      restQuat.set(n, b.getWorldQuaternion(new THREE.Quaternion()));
    }
  });

  const hips = getBone("hips");
  const head = getBone("head");
  if (!hips) throw new Error("hips ボーンが見つかりません");

  // モデル全高（頭〜足）と、本アプリの想定全高(≈1.6)から拡大率
  const headTop = restPos.get("head")?.y ?? 1.5;
  const footY = Math.min(
    restPos.get("leftFoot")?.y ?? 0,
    restPos.get("rightFoot")?.y ?? 0
  );
  const modelHeight = Math.max(0.1, headTop - footY);
  const scaleFactor = 1.6 / modelHeight;

  // 作業用
  const tmpV = new THREE.Vector3();
  const restDirV = new THREE.Vector3();
  const targetDirV = new THREE.Vector3();
  const qDelta = new THREE.Quaternion();
  const desiredWorld = new THREE.Quaternion();
  const parentWorldQ = new THREE.Quaternion();
  const v = (a: Vec3) => new THREE.Vector3(a[0], a[1], a[2]);

  function applyPose(
    joints: Record<JointName, Vec3>,
    rotations: Record<RotatableName, Vec3>
  ): void {
    // --- ルート配置: 拡大 → 腰の向き → hips を pelvis に合わせて平行移動 ---
    vrm.scene.scale.setScalar(scaleFactor);
    if (hips) hips.quaternion.copy(eulerQuat(rotations.pelvis));
    vrm.scene.position.set(0, 0, 0);
    vrm.scene.updateMatrixWorld(true);
    const hw = hips!.getWorldPosition(tmpV);
    const pel = joints.pelvis;
    vrm.scene.position.set(pel[0] - hw.x, pel[1] - hw.y, pel[2] - hw.z);
    vrm.scene.updateMatrixWorld(true);

    // --- 各ボーンを対応関節ベクトルの向きへ回す（親→子の順） ---
    for (const a of AIM) {
      const bone = getBone(a.bone);
      if (!bone) continue;
      const childName = a.child.find((c) => restPos.has(c));
      if (!childName) continue;
      restDirV
        .copy(restPos.get(childName)!)
        .sub(restPos.get(a.bone)!);
      if (restDirV.lengthSq() < 1e-8) continue;
      restDirV.normalize();
      targetDirV.copy(v(joints[a.to])).sub(v(joints[a.from]));
      if (targetDirV.lengthSq() < 1e-8) continue;
      targetDirV.normalize();

      qDelta.setFromUnitVectors(restDirV, targetDirV);
      desiredWorld.copy(qDelta).multiply(restQuat.get(a.bone)!);
      bone.parent?.getWorldQuaternion(parentWorldQ);
      bone.quaternion.copy(parentWorldQ.invert().multiply(desiredWorld));
      bone.updateWorldMatrix(false, false);
    }

    // 頭の回転は首に対するローカル回転として適用（MVP）
    if (head) head.quaternion.copy(eulerQuat(rotations.head));
    vrm.scene.updateMatrixWorld(true);
  }

  function update(delta: number): void {
    vrm.update(delta);
  }

  function dispose(): void {
    VRMUtils.deepDispose(vrm.scene);
  }

  console.log("[loadCharacter] 読込完了。拡大率:", scaleFactor.toFixed(3));
  return { scene: vrm.scene, name: fileName, applyPose, update, dispose };
}
