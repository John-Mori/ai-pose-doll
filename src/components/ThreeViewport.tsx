import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createScene } from "../three/createScene";
import { createDoll } from "../three/createDoll";
import { createControlPoints } from "../three/createControlPoints";
import { applyViewPreset, ASPECT_VALUE } from "../three/cameraPresets";
import { exportPNG } from "../three/exportCanvas";
import { viewportApi } from "../three/viewportApi";
import { usePoseStore } from "../pose/poseStore";
import type { ControlPointName } from "../pose/poseTypes";

/**
 * Three.js 描画を担うコンポーネント。
 * 設計書 §6.3 の鉄則を守る:
 *  - 描画ループ(requestAnimationFrame)は React の再レンダリングの外で回す
 *  - レンダラ/シーン/人形は useRef 保持、マウント時1回だけ初期化
 *  - 状態は Zustand を subscribe して命令的に反映（3DオブジェクトをReact stateに入れない）
 */
export default function ThreeViewport() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    console.log("[ThreeViewport] mount");

    const initial = usePoseStore.getState();
    const sceneBundle = createScene(container, initial.pose.camera);
    const doll = createDoll(initial.displayJoints);
    const cp = createControlPoints();
    sceneBundle.scene.add(doll.group);
    sceneBundle.scene.add(cp.group);
    sceneBundle.setGridVisible(initial.showGrid);
    sceneBundle.setAspect(ASPECT_VALUE[initial.pose.aspectRatio]);
    cp.update(initial.displayJoints, initial.pose.poles);
    cp.setVisible(initial.showControlPoints);
    cp.setSelected(initial.selectedJoint);

    // --- 命令ブリッジ登録（カメラ視点・PNG書き出し）---
    viewportApi.applyCameraView = (name) => {
      applyViewPreset(sceneBundle.camera, sceneBundle.controls, name);
      updateCameraBasis();
    };
    viewportApi.exportPNG = (opts) => exportPNG(sceneBundle, cp.group, opts);
    viewportApi.getCameraState = () => {
      const c = sceneBundle.camera;
      const t = sceneBundle.controls.target;
      return {
        position: [c.position.x, c.position.y, c.position.z],
        target: [t.x, t.y, t.z],
        fov: c.fov,
        zoom: c.zoom,
      };
    };
    viewportApi.setCameraState = (cam) => {
      const c = sceneBundle.camera;
      c.position.set(...cam.position);
      sceneBundle.controls.target.set(...cam.target);
      c.fov = cam.fov;
      c.zoom = cam.zoom ?? 1;
      c.updateProjectionMatrix();
      sceneBundle.controls.update();
      updateCameraBasis();
    };

    // --- カメラ基準ベクトルをストアへ供給（移動はカメラ相対・§8.3） ---
    const worldUp = new THREE.Vector3(0, 1, 0);
    const fwd = new THREE.Vector3();
    const right = new THREE.Vector3();
    const updateCameraBasis = () => {
      // 水平前方（Yを除く）。Up/Down は常にワールド上下にする
      fwd
        .copy(sceneBundle.controls.target)
        .sub(sceneBundle.camera.position);
      fwd.y = 0;
      if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
      fwd.normalize();
      right.crossVectors(fwd, worldUp).normalize();
      usePoseStore.getState().setCameraBasis({
        right: [right.x, right.y, right.z],
        up: [0, 1, 0],
        forward: [fwd.x, fwd.y, fwd.z],
      });
    };
    sceneBundle.controls.addEventListener("change", updateCameraBasis);
    updateCameraBasis();

    // --- Zustand 購読: 人形・操作点・グリッドを命令的に更新 ---
    let lastDisplay = initial.displayJoints;
    let lastPoles = initial.pose.poles;
    let lastShowGrid = initial.showGrid;
    let lastShowCP = initial.showControlPoints;
    let lastSelected = initial.selectedJoint;
    let lastAspect = initial.pose.aspectRatio;
    const unsubscribe = usePoseStore.subscribe((state) => {
      if (state.pose.aspectRatio !== lastAspect) {
        lastAspect = state.pose.aspectRatio;
        sceneBundle.setAspect(ASPECT_VALUE[lastAspect]);
      }
      if (state.displayJoints !== lastDisplay) {
        lastDisplay = state.displayJoints;
        doll.update(lastDisplay);
        cp.update(lastDisplay, state.pose.poles);
      }
      if (state.pose.poles !== lastPoles) {
        lastPoles = state.pose.poles;
        cp.update(state.displayJoints, lastPoles);
      }
      if (state.selectedJoint !== lastSelected) {
        lastSelected = state.selectedJoint;
        cp.setSelected(lastSelected);
      }
      if (state.showGrid !== lastShowGrid) {
        lastShowGrid = state.showGrid;
        sceneBundle.setGridVisible(lastShowGrid);
      }
      if (state.showControlPoints !== lastShowCP) {
        lastShowCP = state.showControlPoints;
        cp.setVisible(lastShowCP);
      }
    });

    // --- タップで操作点を選択（ドラッグはカメラ操作なので除外） ---
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let downT = 0;
    const onPointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = e.timeStamp;
    };
    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      const dt = e.timeStamp - downT;
      if (moved > 8 || dt > 500) return; // ドラッグ/長押しはカメラ操作

      const rect = sceneBundle.renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, sceneBundle.camera);
      const hits = raycaster.intersectObjects(cp.meshes, false);
      if (hits.length > 0) {
        const name = hits[0].object.userData.cpName as ControlPointName;
        usePoseStore.getState().selectJoint(name);
      } else {
        usePoseStore.getState().selectJoint(null);
      }
    };
    const canvas = sceneBundle.renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

    // --- リサイズ対応 ---
    const resizeObserver = new ResizeObserver(() => sceneBundle.resize());
    resizeObserver.observe(container);

    // --- 描画ループ（React外） ---
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      sceneBundle.controls.update();
      sceneBundle.renderer.render(sceneBundle.scene, sceneBundle.camera);
    };
    animate();

    return () => {
      console.log("[ThreeViewport] unmount");
      cancelAnimationFrame(raf);
      unsubscribe();
      resizeObserver.disconnect();
      sceneBundle.controls.removeEventListener("change", updateCameraBasis);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      delete viewportApi.applyCameraView;
      delete viewportApi.exportPNG;
      delete viewportApi.getCameraState;
      delete viewportApi.setCameraState;
      cp.dispose();
      doll.dispose();
      sceneBundle.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0" />;
}
