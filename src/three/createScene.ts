import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraSettings } from "../pose/poseTypes";

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  grid: THREE.GridHelper;
  resize: () => void;
  setAspect: (aspect: number) => void;
  setGridVisible: (visible: boolean) => void;
  dispose: () => void;
}

/**
 * シーン・カメラ・ライト・床グリッドを作る（設計書 §14.2, CP1）。
 * 描画ループは持たない（ループは ThreeViewport が回す・§6.3）。
 */
export function createScene(
  container: HTMLElement,
  cameraSettings: CameraSettings
): SceneBundle {
  console.log("[createScene] 初期化");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202833);

  // --- カメラ ---
  const camera = new THREE.PerspectiveCamera(
    cameraSettings.fov,
    container.clientWidth / Math.max(1, container.clientHeight),
    0.1,
    100
  );
  camera.position.set(...cameraSettings.position);

  // --- レンダラ（devicePixelRatio は上限2にクランプ・§6.3） ---
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: true, // PNG 出力(CP4)で canvas を読むため
    alpha: true, // 透過背景の PNG 出力に対応
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // 構図フレーム＝アスペクト枠。canvas をコンテナ内に中央配置しレターボックス表示
  renderer.domElement.style.position = "absolute";
  container.appendChild(renderer.domElement);

  // --- ライト ---
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 0.9);
  dir.position.set(2, 5, 3);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  // --- 床グリッド（Y=0） ---
  const grid = new THREE.GridHelper(6, 24, 0x4b5563, 0x374151);
  scene.add(grid);

  // --- カメラ操作（タッチ対応の OrbitControls・§8.5） ---
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.target.set(...cameraSettings.target);
  controls.minDistance = 1.2;
  controls.maxDistance = 12;
  controls.update();

  // 構図フレームのアスペクト（W/H）。setAspect で切替え（既定 4:5）
  let currentAspect = 4 / 5;

  // コンテナ内にアスペクト比のキャンバスをフィット（レターボックス）
  const resize = () => {
    const cw = container.clientWidth;
    const ch = Math.max(1, container.clientHeight);
    let w = cw;
    let h = cw / currentAspect;
    if (h > ch) {
      h = ch;
      w = ch * currentAspect;
    }
    w = Math.max(1, Math.floor(w));
    h = Math.max(1, Math.floor(h));
    camera.aspect = currentAspect;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    const el = renderer.domElement;
    el.style.left = `${Math.floor((cw - w) / 2)}px`;
    el.style.top = `${Math.floor((ch - h) / 2)}px`;
  };

  const setAspect = (aspect: number) => {
    currentAspect = aspect;
    resize();
  };

  const setGridVisible = (visible: boolean) => {
    grid.visible = visible;
  };

  resize(); // 初期サイズを確定

  const dispose = () => {
    console.log("[createScene] dispose");
    controls.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    scene,
    camera,
    renderer,
    controls,
    grid,
    resize,
    setAspect,
    setGridVisible,
    dispose,
  };
}
