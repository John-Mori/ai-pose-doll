# STATUS — AI Pose Doll Mobile

> Claude Code の各セッション冒頭で本ファイルと設計書(v2.0)を読み込ませること。
> チェックポイント(CP)完了ごとに状態と「次にやること」を更新する（ドリフト対策・設計書§28）。

## 現在の状態

- **全チェックポイント完了（CP1〜CP5 done）/ MVP 一通り実装・PCプレビュー検証済み**
- 残: スマホ実機での体感・発熱確認（§29）、任意で Pose プリセット(§14.4)・OpenPose出力など後回し項目
- 最終更新: 2026-06-06

## チェックポイント進捗

| CP | 内容 | 含むStep | 状態 |
|----|------|---------|------|
| CP1 | 基盤（表示できる） | 1, 2, 3 | ☑ done |
| CP2 | 操作（選んで動かせる） | 4, 5 | ☑ done |
| CP3 | IK & 制限（自然に曲がる） | 6, 7 | ☑ done |
| CP4 | 構図 & 画像（撮って保存） | 8, 9 | ☑ done |
| CP5 | データ & 配布（再編集・補助文・PWA） | 10, 11, 12 | ☑ done |

記法: ☐ todo / ◐ in-progress / ☑ done

## 直近で完成したもの（CP1）

- Vite + React + TS + Three.js + Zustand + Tailwind のプロジェクト一式（§20 構成）
- `three/createScene.ts`: シーン・カメラ(fov35)・ライト・床グリッド・OrbitControls、devicePixelRatio 上限2（§6.3）
- `three/createDoll.ts`: Sphere/Cylinder のプリミティブ人形を関節座標から生成、命令的 `update()` 付き
- `pose/poseTypes.ts` `pose/defaultPose.ts`（§13.1 準拠）`pose/poseStore.ts`（Zustand）
- `components/ThreeViewport.tsx`: 描画ループ React 外・状態は store.subscribe で橋渡し（§6.3）
- `Layout.tsx` / `BottomPanel.tsx`（§14.3 のタブ枠、グリッド ON/OFF・Reset Pose）
- README に セットアップ / `npm run host` でのスマホ実機手順（§29）
- 動作確認: `npm run build` 型エラーなし、ブラウザで人形+グリッド表示・カメラ操作 OK

## CP2 で完成したもの

- `three/createControlPoints.ts`: 11操作点を球表示（depthTest off で人形に隠れても選択可）、Raycast 用 meshes 公開
- `components/ThreeViewport.tsx`: タップ選択(Raycaster, ドラッグ/長押しはカメラ操作として除外) + カメラ基準ベクトルを store へ供給(§8.3)
- `pose/poseStore.ts`: `moveSelectedJoint`(カメラ相対) / pelvis=全身平行移動(§10.4) / Pole移動 / `cameraBasis`
- `components/MoveControls.tsx`(6方向+移動量小中大) / `JointSelector.tsx`(操作点チップ選択)
- `BottomPanel.tsx`: タブ切替（Pose/Move を有効化）
- dev時 `window.__poseStore` でストア公開（本番は import.meta.env.DEV ガードで除外）
- 動作確認: build 型エラーなし。eval で 選択→6方向移動・pelvis全身移動・Pole移動・Reset すべて期待通り。
  WebGL健全(glLost:false)・操作点ボタン26個。※視覚スクショ/実タップは preview窓が hidden で rAF停止のため未取得（アプリ不具合ではない）。

## CP3 で完成したもの

- `utils/math3d.ts`: Vec3 タプルのベクトル演算（THREE 非依存）
- `pose/skeleton.ts`: default から肩/股/首オフセット・骨長を導出（§10.4 固定子, §11.4）
- `pose/ikSolver.ts`: 解析的2ボーンIK（余弦定理＋Pole射影、逆曲げ構造的に不可）
- `pose/jointLimits.ts`: 手首/足首リーチ制限・床貫通クランプ（§11.4, §12.2）
- `pose/poseValidator.ts`: 重心・足開き・腕貫通・床貫通の warnings（§12.2）
- `pose/solvePose.ts`: 従属点(neck/肩/股/肘/膝)を再計算するパイプライン本体（§13.5）
- `poseStore`: moveSelectedJoint に §11.5 の順序を組込み、checkPose / clearWarnings 追加、初期/Reset も solve
- `components/WarningPanel.tsx`(3Dビュー上の警告) / BottomPanel に Check タブ
- 動作確認(eval): 骨長保存・リーチ0.617≤0.618・Poleで肘移動・床 y≥0・重心警告 ON/OFF すべて期待通り

## CP4 で完成したもの

- `three/cameraPresets.ts`: アスペクト値・PNG解像度(§15.2)・視点プリセット9種(§14.7)
- `three/createScene.ts`: canvas をアスペクト比でレターボックス表示（＝構図フレーム）、setAspect、alpha対応
- `three/exportCanvas.ts`: 指定解像度で PNG 書き出し（背景 白/グレー/透過/現在・操作点/グリッド on/off）、描画後は必ず復元
- `three/viewportApi.ts`: React→Three の命令ブリッジ（applyCameraView / exportPNG）
- `components/CameraControls.tsx`(アスペクト+視点) / `ExportPanel.tsx`(PNG保存) / BottomPanel に Camera/Export タブ
- `utils/downloadFile.ts` / `utils/dateFormat.ts`
- 動作確認(eval): 4アスペクトのレターボックス一致、視点適用、PNG 1080×1350/1600×900/1080×1080 各背景で生成・寸法一致・書き出し後ライブ復元 すべてOK

## CP5 で完成したもの

- 回転: `math3d` に euler(XYZ)回転、`solvePose` に **無回転の真実(pose.joints)** と **表示用(displayJoints=回転ポスト変換)** を分離（§13.6）
- `poseStore`: rotateSelectedJoint / rotationStep / loadPose、finalize が pose+displayJoints+warnings を返す
- `components/RotateControls.tsx`（Pitch/Yaw/Roll ±, 5/10/15°）、Rotate タブ有効化
- `pose/poseJson.ts`: 保存(buildPoseJson, 現在カメラ反映)・読込(parsePoseJson, 0.1.0→0.2.0 migration)
- `pose/promptGenerator.ts`: 日英プロンプト（構図/体向き/腕/重心のヒューリスティック, §16）
- `ExportPanel`: JSON保存/読込・TXT保存/Copy、`viewportApi` に getCameraState/setCameraState
- PWA: `public/manifest.json` + `sw.js`(最小ランタイムキャッシュ) + 生成アイコン(192/512) + index.html link + 本番のみ SW 登録
- 動作確認(eval+視覚): pelvis yaw で体が回り骨長保存／head pitch で頷き／**JSON 保存→読込で完全復元(回転含む) maxDiff=0**／回転後の移動で二重適用ドリフトなし／migration 0.1.0→0.2.0／PWA資産配信OK／dist に PWA一式

### CP5 で見つけて直したバグ
- 回転をポスト変換した結果を pose.joints に書き戻していたため、毎操作・読込で回転が二重適用されていた（round-trip maxDiff 0.2）。
  → pose.joints=無回転の真実、displayJoints=表示派生 に分離して解消（描画/検査/出力は displayJoints を使用）。

## 既知の課題 / メモ（実機確認前）

- バンドルが 665kB（three 同梱）。MVP では許容、必要なら後で manualChunks 検討。
- 回転(pelvis/chest/head)は表示用ポスト変換。Move は無回転フレームのソースを編集するため、体を大きく回した状態での Move は画面上の方向と一致しないことがある（MVP割り切り）。Pole マーカーも無回転位置で表示。
- 手首/足首回転は JSON 保持のみで見た目反映なし（手足メッシュ未実装）。
- 重心警告は「足が床接地(y≤0.06)」時のみ。直立デフォルトは脚ほぼ最大伸長のため、横移動すると reach clamp で足が浮き警告対象外になる（仕様通りの簡易判定）。
- Pose タブのプリセット(T-Pose/Standing 等, §14.4)・OpenPose出力・写真抽出は後回し（§23）。
- preview スクショは窓が前面(visible)のときのみ取得可（hidden だと rAF 停止で timeout）。
- 実機での発熱・カクつきは未検証（PC プレビューのみ確認済み）。

## 仕様変更ログ

- 2026-06-06 設計書 v2.0 化（回転データ追加 / ソース分離 / 移動伝播・パイプライン確定 / フェーズ計画・運用・確認を追補）
- 2026-06-06 CP1 実装完了（基盤: プロジェクト雛形・3Dビュー・プリミティブ人形）
- 2026-06-06 CP2 実装完了（操作: タップ選択・カメラ相対6方向移動・pelvis全身移動）
- 2026-06-06 CP3 実装完了（2ボーンIK・リーチ/床/逆曲げ制限・重心検査・§11.5パイプライン）
- 2026-06-06 CP4 実装完了（アスペクトレターボックス・視点9種・PNG出力）
- 2026-06-06 CP5 実装完了（回転＋表示分離・JSON保存読込/migration・プロンプト・PWA）
- 2026-06-06 ネット公開対応（PC不要）: `netlify.toml` / `public/_redirects` 追加、手順書 `ネット公開手順.png`。`npm run build`→`dist` をルート配信で 200 確認。Netlify Drop 推奨。
- 2026-06-06 ホスティング非依存化: vite `base:'./'`(build時) + index.html/manifest/SW を相対パス化。ルート/サブパス両対応。GitHub Pages 自動デプロイ `.github/workflows/deploy.yml` と手順書 `GitHub公開手順.png` を追加。dev/build とも動作確認。
- 2026-06-06 キャラ3Dモデル(VRM/GLB)読込を実装: `three/loadCharacter.ts`(@pixiv/three-vrm, 位置→ボーン回転リターゲット)、`ModelControls.tsx`(Poseタブ)、viewportApi.loadModel/removeModel。three-vrmは動的importで別チャンク化。公開サンプルVRMで読込→立ち姿リターゲット→描画を検証(シルエット縦80%/腕下ろし確認)。制約: twist/指/手足向きは未反映、要・本人VRM。
- 2026-06-06 **本番公開済み**: GitHub Pages へデプロイ完了。リポジトリ https://github.com/John-Mori/ai-pose-doll （Public）。公開URL **https://john-mori.github.io/ai-pose-doll/** 。サブパスで index/JS/CSS/manifest/icon/sw すべて 200 確認。以後は main へ push で自動更新（Actions）。
  - メモ: 初回は configure-pages の enablement 失敗 → REST API で Pages を build_type=workflow 有効化し再実行で成功。`.claude/` は公開対象外に（.gitignore）。
