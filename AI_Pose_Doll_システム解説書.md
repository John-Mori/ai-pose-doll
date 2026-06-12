# AI Pose Doll Mobile — システム解説書（ChatGPT 取り込み用）

> **このドキュメントの目的**
> 本ツール「AI Pose Doll Mobile」の全体像・設計・実装・制約を、外部のAI（ChatGPT等）が
> **前提知識なしで理解し、機能ブラッシュアップ案を設計・突合できる**ように自己完結でまとめたもの。
> 元の設計書 `AI_Pose_Doll_Mobile_設計書_ClaudeCode版_v2.md` は「作る前の仕様」、本書は
> 「**実際に作られた後の実装の真実**（2026-06 時点・CP1〜CP5 完了）」を記述する。両者が食い違う場合は本書を優先。

- リポジトリ: https://github.com/John-Mori/ai-pose-doll （Public）
- 公開URL: https://john-mori.github.io/ai-pose-doll/
- 版: v2 実装完了時点

---

## 0. ChatGPT への依頼の仕方（この文書の使い方）

この文書を読んだうえで、以下のような検討に使うことを想定している。

- 「現状の制約（§9）を踏まえて、◯◯（例: 直接ドラッグ操作）を追加する設計案を出して」
- 「他プロジェクトの要望リストと、§8 の機能・§10 のブラッシュアップ候補を突合し、優先度を付けて」
- 「§11 の“守るべき不変条件”を壊さない範囲で、データモデル（§5）を拡張する案を出して」

**提案時に必ず尊重してほしい前提**は §11「設計上の不変条件」にまとめてある。

---

## 1. これは何か（概要）

**スマホで3Dの“デッサン人形”を動かして、AI画像生成に渡すポーズ／構図の参考を作るWebアプリ。**

- 文章だけでは伝えにくい「キャラのポーズ・体の向き・カメラ構図」を、3D人形を操作して指定する。
- 出力は **PNG（AIに添付する視覚参照）** と **`.pose.json`（後で再編集するデータ）** と **プロンプト補助文（TXT）**。
- スマホ最優先。3D空間の直接ドラッグは難しいので、**「操作点をタップ選択 → ボタンで動かす」** 方式が基本。
- バックエンド無し・ログイン無し・完全クライアントサイド。データはローカル（ダウンロード/将来IndexedDB）。
- PWA対応（ホーム画面追加・オフライン起動）。

**やらないこと（現時点）**: 写真からのポーズ自動抽出 / 物理シミュレーション / 指の細かい操作 / 複数キャラ /
完全なOpenPose出力 / 服・髪 / キャラ画像生成そのもの / クラウド保存。

---

## 2. 用語集

| 用語 | 意味 |
|---|---|
| 関節 (joint) | 人形を構成する16点（head〜rightAnkle）。メッシュ描画に使う。 |
| 操作点 (control point) | ユーザーが直接動かせる11点（後述）。タップで選択して移動・回転する。 |
| Pole / Pole Target | 肘・膝の「曲がる向き」を決める補助点。4個（左右の肘・膝）。 |
| ソース (source) | 保存・復元の真実となるデータ。操作点の位置・回転＋Pole＋体型＋カメラ＋アスペクト。 |
| 従属点 (dependent) | IKや固定オフセットで計算される点（肩・肘・膝・股・首）。保存しても読込時に再計算。 |
| displayJoints | 表示用に「ソース解決＋回転」を重ねた派生関節。描画・検査・出力はこれを使う（§4）。 |
| IK | Inverse Kinematics。手首/足首の位置から肘/膝を逆算する簡易2ボーンIK。 |
| カメラ相対移動 | 上下左右前後ボタンを「画面に対して」効かせる方式（§6.4）。 |

---

## 3. 技術スタック

- **Vite 5** + **React 18** + **TypeScript 5**
- **Three.js 0.169**（WebGL 3D描画。OrbitControlsでカメラ操作）
- **Zustand 5**（状態管理）
- **Tailwind CSS 3**（UI）
- **PWA**（manifest + 最小Service Worker、ランタイムキャッシュ）
- ビルドは `base: './'`（相対パス）→ ルート配信(Netlify)もサブパス配信(GitHub Pages `/repo/`)も同一成果物で動く。
- デプロイ: GitHub Actions（`.github/workflows/deploy.yml`）で push→自動ビルド&公開。Netlify Drop も可。

依存は最小（`react`, `react-dom`, `three`, `zustand`）。外部APIゼロ。バンドルは約665KB（大半がthree）。

---

## 4. アーキテクチャの要（最重要）

### 4.1 React と Three.js の分離

- **描画ループ（requestAnimationFrame）は React の外**で回す。`ThreeViewport.tsx` が `useEffect`（マウント時1回）で
  シーン・人形・操作点を生成し、`store.subscribe` で差分を受け取り命令的に更新する。3DオブジェクトはReact stateに入れない。
- UI（ボタン）→ **Zustand 更新** → Three 側が subscribe で反映、という一方向。
- React→Three への「命令」（カメラ視点適用・PNG書き出し・カメラ状態の取得/設定）だけは、薄い橋
  `three/viewportApi.ts`（モジュール単一オブジェクト）経由で行う。データはZustand、命令はviewportApi、と役割分担。

### 4.2 「ソースの真実」と「表示用派生」の分離 ★システムの肝

回転を**位置に焼き込まない**ために、状態を2層に分けている。

- **`pose.joints`（無回転の真実）**: ソース操作点の位置＋IKで解いた従属点。**回転は含まない**。保存対象。
- **`displayJoints`（表示用派生）**: `pose.joints` に回転をポスト変換で重ねたもの。**保存しない**。描画・検査・プロンプト・PNGはこれを使う。

理由: 過去に「回転を計算結果（pose.joints）へ書き戻す」実装にしたら、操作・読込のたびに回転が
**二重適用**され、JSON往復で座標が崩れた。`pose.joints`を常に無回転に保ち、表示時だけ回転を重ねることで解決した。
→ **ブラッシュアップ時もこの分離を壊さないこと**（§11）。

### 4.3 処理パイプライン（操作のたびに実行）

`poseStore.ts` の `finalize(pose)` が以下を一括実行する（設計の §11.5 準拠）。

```
1. 入力      操作点の位置 or 回転 or Pole を更新（カメラ相対 → World へ変換済み）
2. リーチ/床 制限   手首/足首が腕/脚の最大長を超えない・足が床下に沈まないようクランプ
3. IK 解決   肩→肘→手首 / 股→膝→足首 の中間関節を計算（Poleで曲げ方向決定）
              → ここまでが pose.joints（無回転の真実）
4. 回転      head/chest/pelvis の回転を displayJoints にポスト変換で適用
5. 検査      displayJoints に対し warnings を更新（重心・足開き・腕貫通・床貫通）
6. 反映      pose / displayJoints / warnings を set → Three が subscribe で描画更新
```

### 4.4 データフロー図（概念）

```
[UIボタン] --action--> [Zustand store]
                          | finalize(): clamp → IK → 回転(displayへ) → validate
                          v
        pose(真実) + displayJoints(派生) + warnings
                          |
          store.subscribe |  (ThreeViewport)
                          v
   [人形メッシュ更新] [操作点更新] [警告表示]   ← 描画は displayJoints
[カメラ視点/PNG/カメラ状態] は viewportApi 経由で Three を命令的に操作
```

---

## 5. データモデル

### 5.1 座標系・単位
- X: 左右 / Y: 上下 / Z: 前後（奥が −Z 方向、Three.js 右手系）。床 Y=0。身長 約1.7（メートル風の正規化値）。

### 5.2 関節（16点・メッシュ用）
`head, neck, chest, pelvis, leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist, leftHip, leftKnee, leftAnkle, rightHip, rightKnee, rightAnkle`

### 5.3 操作点（11点・ユーザーが直接動かす）
- 位置を動かせる7点: `head, chest, pelvis, leftWrist, rightWrist, leftAnkle, rightAnkle`
- Pole 4点: `leftElbowPole, rightElbowPole, leftKneePole, rightKneePole`

### 5.4 回転を持つ点（7点）
`head, chest, pelvis, leftWrist, rightWrist, leftAnkle, rightAnkle`
- オイラー角 `[pitch(x), yaw(y), roll(z)]`、**単位は度**、順序は **XYZ 固定**（R = Rz·Ry·Rx, X を最初に適用）。

### 5.5 従属点（IK/固定オフセットで再計算・保存不要）
`leftShoulder, rightShoulder, leftHip, rightHip, neck`（親 chest/pelvis からの固定オフセット）、
`leftElbow, rightElbow, leftKnee, rightKnee`（IK）。

### 5.6 pose.json スキーマ（version 0.2.0）

```json
{
  "version": "0.2.0",
  "appName": "AI Pose Doll Mobile",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "poseName": "default_pose",
  "aspectRatio": "4:5",                       // "4:5"|"9:16"|"16:9"|"1:1"
  "camera": { "position":[0,1.3,4.5], "target":[0,1.1,0], "fov":35, "zoom":1.0 },
  "bodyScale": { "height":1.0, "headSize":1.0, "armLength":1.0, "legLength":1.0 },
  "joints":   { "head":[0,1.72,0], "...":"...全16関節..." },
  "poles":    { "leftElbowPole":[-0.5,1.2,-0.4], "...":"...4個..." },
  "rotations":{ "head":[0,0,0], "chest":[0,0,0], "pelvis":[0,0,0],
                "leftWrist":[0,0,0], "rightWrist":[0,0,0],
                "leftAnkle":[0,0,0], "rightAnkle":[0,0,0] },
  "limits": { "enabled": true, "strictness": "normal" },   // "loose"|"normal"|"strict"（現状strictnessは未使用）
  "notes": "AI image generation pose reference"
}
```

### 5.7 保存・読込の規約（§13.5 準拠）
- **保存の真実**: ソース操作点の位置・回転、4 Pole、bodyScale、camera、aspectRatio。
- **読込手順**: version確認 → migration（0.1.0 は rotations を全0で補完）→ ソース復元 → IKで従属点再計算 → 回転を表示に適用。
- 従属点も JSON に書き出すが、あくまでキャッシュ。読込時は再計算で上書きされる。

### 5.8 Zustand store（実行時の状態）
`pose: Pose`, `displayJoints`, `selectedJoint`, `moveStep`(0.01/0.05/0.10), `rotationStep`(5/10/15°),
`warnings: string[]`, `cameraBasis`(right/up/forward), `showGrid`, `showControlPoints`。
アクション: `selectJoint, moveSelectedJoint, rotateSelectedJoint, setMoveStep, setRotationStep, setCameraBasis,
setAspectRatio, toggleGrid, toggleControlPoints, checkPose, clearWarnings, resetPose, loadPose`。

---

## 6. 中核ロジックの詳細

### 6.1 簡易2ボーンIK（`pose/ikSolver.ts`）
- 解析解。root(肩/股)→target(手首/足首) の距離 d、2本の骨長 len1/len2 から余弦定理で中間関節を求める。
- 曲げ方向は **Pole を軸に直交射影**して決める（Poleが軸と平行なときは保険の直交ベクトル）。
- 肘/膝は常にPole側に曲がるため**逆曲げは構造的に起きない**。
- 骨長は**初期ポーズ（default）から導出**して固定（`pose/skeleton.ts`）。腕や脚の長さは伸縮しない。

### 6.2 関節制限（`pose/jointLimits.ts`）
- 手首が肩から、足首が股から「腕/脚の最大長（骨長合計×0.999）」を超えたら、その方向に沿ってクランプ。
- 足首は床 Y=0 より下に行かないようクランプ。
- 肩/股/首は chest/pelvis からの**固定オフセット**（default基準）。ユーザーは直接動かさない。

### 6.3 回転の適用（`pose/solvePose.ts` の `applyRotations`、ポスト変換）
- `head`: 首(neck)を支点に回す（うなずき等）。
- `chest`: 上半身（neck/head/両肩/両肘/両手首）を chest 支点に回す。
- `pelvis`: 全身（pelvis以外）を pelvis 支点に回す（＝体の向き）。
- `wrist/ankle`: **データ保持のみ。見た目には反映しない**（手・足のメッシュが無いため）。
- 適用順は head → chest → pelvis（内側から外側へ重ねる）。

### 6.4 カメラ相対移動（`ThreeViewport.tsx` → store の `cameraBasis`）
- 上下=ワールドY、左右=カメラの水平right、前後=カメラの水平forward（Y成分を除く）。
- ThreeがOrbitControlsの'change'で `cameraBasis` を store に供給 → `moveSelectedJoint` がWorld deltaを計算。
- 「スマホでカメラを回しても“左”が常に画面の左」になる。World基準トグルは未実装（設計上の将来項目）。

### 6.5 移動の伝播（§10.4 準拠）
- `pelvis` 移動 = 全身を平行移動（ルート）。Pole も一緒に動く。
- `chest` 移動 = 現状その点のみ移動（肩/股は固定オフセットなので相対位置は保たれる）。**chestの“ひねり連動”は回転のみ**。
- `手首/足首` 移動 = その腕/脚だけ IK で再計算。

### 6.6 検査（`pose/poseValidator.ts`、warnings）
簡易判定。`displayJoints` に対して:
- **重心**: 両足が床接地(y≤0.06)のとき、骨盤の水平位置が両足の支持範囲から外れたら警告。片足立ちも同様。
- **足開き**: 両足の水平距離が大きすぎたら警告。
- **腕貫通**: 手首が胴体中心を大きく越えたら警告。
- **床貫通**: 足が床下なら警告。
- 破綻を“止める”のではなく**知らせる**だけ（リーチ/床はクランプで止める）。

---

### 6.7 キャラ3Dモデル(VRM/GLB)の追従（`three/loadCharacter.ts`）
- Poseタブで **VRM(推奨)/GLB** を読み込むと、プリミティブ人形を隠し、モデルがポーズに追従する。
- 仕組み（**位置→ボーン回転のリターゲット**）:
  - 読込時にモデルの rest(バインド)ポーズで各ヒューマノイドボーンの world 位置・回転を記録。
  - `applyPose(displayJoints, rotations)` で、各ボーンを「対応する関節ベクトルの向き」へ回す（aim）。
    例: leftUpperArm を `leftShoulder→leftElbow` の向きへ。親→子の順に処理。
  - ルート(hips)は pelvis 位置へ平行移動、向きは pelvis 回転。頭は head 回転をローカル適用。
  - モデル全高を計測し、全高≈1.6 に合うよう均等スケール。spring bone(髪揺れ)は毎フレーム `vrm.update`。
- ライブラリ: `@pixiv/three-vrm`。three-vrm/GLTFLoader は **動的import で遅延ロード**（初期表示を軽く保つ・別チャンク約196KB）。
- **制約（MVP）**: ねじり(twist)は位置情報からは決まらないため rest 準拠で不定。手・足の向き、指は未対応。
  GLB は VRM 互換のヒューマノイドのみ想定（非ヒューマノイドは不可）。本人そっくりにするには
  そのキャラの VRM を別途用意（VRoid Studio 等）して読み込む。

## 7. 画面・UI 構成

- 上部バー: アプリ名 / 現フェーズ表記。
- 中央: 3Dビュー（人形・操作点・床グリッド）。**選択アスペクト比にレターボックス**（＝構図フレームを兼ねる）。
  - 警告は3Dビュー上にオーバーレイ表示（`WarningPanel`）。
- 下部: タブパネル（`BottomPanel`）。「選択中の操作点」を常時表示。

### タブ別機能（実装状況）

| タブ | 内容 | 状況 |
|---|---|---|
| **Pose** | Reset Pose / グリッドON-OFF / 操作点ON-OFF / **キャラモデル(VRM/GLB)読込・解除** | ✅（**プリセット T-Pose等は未実装**） |
| **Move** | 操作点チップ選択 + 6方向ボタン(カメラ相対) + 移動量 小中大 | ✅ |
| **Rotate** | Pitch/Yaw/Roll ± + 回転量 5/10/15°（回転可能な点のみ有効） | ✅ |
| **Camera** | アスペクト 4:5/9:16/16:9/1:1 + 視点プリセット9種 | ✅ |
| **Export** | Save PNG（背景 白/グレー/透過/現在・操作点/グリッド on-off）/ Save・Load JSON / Save・Copy プロンプト | ✅ |
| **Check** | Check Pose / Clear Warnings / 警告一覧 | ✅ |

- 操作点は3Dビューを**タップして選択**も可能（Raycaster。ドラッグ/長押しはカメラ操作として除外）。チップ選択はその代替。
- 視点プリセット: Full Body / Knee Up / Waist Up / Bust Up / Front / 45 Degree / Side / Low Angle / High Angle。

---

## 8. 入出力

### 8.1 PNG（`three/exportCanvas.ts`）
- ライブと同じ camera.aspect でレターボックス描画 → **WYSIWYG**。
- 出力解像度: 4:5→1080×1350 / 9:16→1080×1920 / 16:9→1600×900 / 1:1→1080×1080。
- 背景（白/グレー/透過/現在）・操作点表示・グリッド表示を切替えてレンダリングし、描画後は元の表示状態へ復元。

### 8.2 JSON（`pose/poseJson.ts`）
- 保存: 現在ポーズ＋**ライブカメラ**から `.pose.json` を生成（version 0.2.0）。
- 読込: パース→migration→`loadPose`（finalizeで従属点再計算＋表示反映）→カメラ・アスペクトも復元。

### 8.3 プロンプト補助文（`pose/promptGenerator.ts`）
- `displayJoints` からヒューリスティックで日本語＋英語の説明文を生成。
- 構図（アスペクト）/ 体の向き（pelvis yaw）/ 左右腕の状態（前/上/下/横）/ 重心（左右脚）を文章化。
- TXT保存・クリップボードCopyに対応。**簡易生成**で、ユーザーが手直しする前提。

### 8.4 PWA / 配布
- `public/manifest.json`（standalone, 192/512アイコン）、`public/sw.js`（ランタイムキャッシュ・キャッシュ優先）。
- 相対パス化済みでルート/サブパス両対応。GitHub Actions or Netlify Drop で公開。

---

## 9. ディレクトリ構成（ファイル責務）

```
src/
  main.tsx              起動・SW登録(本番のみ)・dev時 devDebug 動的ロード
  App.tsx / components/Layout.tsx   画面骨格
  components/
    ThreeViewport.tsx   ★Three初期化・store購読・タップ選択・カメラ基準供給・viewportApi登録
    BottomPanel.tsx     タブ切替
    JointSelector / MoveControls / RotateControls / CameraControls / ExportPanel / WarningPanel
  three/
    createScene.ts      シーン/カメラ/ライト/グリッド/レターボックス/PNG用の素材, setAspect
    createDoll.ts       プリミティブ人形（球/円柱）生成と update(joints)
    createControlPoints.ts  11操作点の球生成・update・選択ハイライト・表示切替
    cameraPresets.ts    アスペクト値/PNG解像度/視点プリセット
    exportCanvas.ts     PNG書き出し（状態退避→描画→復元）
    viewportApi.ts      React→Three 命令ブリッジ（applyCameraView/exportPNG/get・setCameraState）
  pose/
    poseTypes.ts        型定義（Pose/JointName/ControlPointName 等）
    defaultPose.ts      初期ポーズ
    poseStore.ts        ★Zustand。アクション・finalize（パイプライン）
    solvePose.ts        ★solveDependents（IK＋制限） / computeDisplayJoints（+回転）
    ikSolver.ts         2ボーンIK
    jointLimits.ts      リーチ/床クランプ
    skeleton.ts         default由来の骨長・オフセット
    poseValidator.ts    検査（warnings）
    poseJson.ts         保存/読込/migration
    promptGenerator.ts  日英プロンプト生成
  utils/
    math3d.ts           Vec3演算＋オイラー回転（THREE非依存）
    downloadFile.ts / dateFormat.ts
  styles/globals.css
public/  manifest.json / sw.js / icons / _redirects
.github/workflows/deploy.yml   GitHub Pages 自動デプロイ
netlify.toml / vite.config.ts(base:'./') / scripts/(アイコン・手順書生成)
```

> 設計書 §20 では `updateDollGeometry.ts` `frameGuide.ts` を別ファイルとしていたが、実装では
> 人形更新は `createDoll` の `update()` に、構図フレームは `createScene` のレターボックスに統合した。

---

## 10. ブラッシュアップ候補（拡張ポイント）

> 効果(体験向上) / コスト(実装規模) はあくまで目安。`◎>○>△`。

### A. 操作性
| 案 | 内容 | 効果 | コスト | メモ |
|---|---|---|---|---|
| ポーズプリセット | T-Pose/Standing/Walking/Sitting等を即適用 | ◎ | ○ | データを用意して loadPose するだけ。設計書 §14.4 に名称あり |
| Undo/Redo | 操作履歴 | ◎ | ○ | poseのスナップショットを積む。Zustandで実装容易 |
| 直接ドラッグ/ギズモ | 操作点をドラッグ移動 | ○ | ◎ | スマホでは難。PC補助として。平面拘束ドラッグが現実的 |
| World基準トグル | 移動をワールド軸基準に切替 | △ | △ | cameraBasis を固定軸に差し替えるだけ |
| 体型スケールUI | bodyScale(身長/頭/腕/脚)を編集 | ○ | ○ | データは既にあるがUI・反映が未実装。骨長再計算が要 |

### B. 表現・精度
| 案 | 内容 | 効果 | コスト | メモ |
|---|---|---|---|---|
| 手/足メッシュ＋向き反映 | wrist/ankle回転を見た目に | ○ | ○ | 現在は回転データ保持のみ。手のひら/足の向きが出る |
| **VRM/GLBキャラ読込（実装済）** | 本人モデルをポーズに追従 | ◎ | ◎ | `three/loadCharacter.ts`。`@pixiv/three-vrm`で位置→ボーン回転リターゲット。詳細は §6.7 |
| chestのひねり連動強化 | 上半身の自然な追従 | ○ | ○ | 現状chest移動は平行移動。回転は実装済み |
| 重心/バランスの高度化 | より実用的な警告・自動補正 | ○ | ◎ | 現状は簡易。接地判定の閾値も要調整 |
| 関節角度制限の精緻化 | 首振りすぎ等を角度で制限 | ○ | ○ | 現状はリーチ/床/逆曲げのみ |

### C. 出力・連携（AI画像生成ワークフロー）
| 案 | 内容 | 効果 | コスト | メモ |
|---|---|---|---|---|
| OpenPose風PNG出力 | 骨格線画像をComfyUI/ControlNetへ | ◎ | ○ | 3D→2D投影してCanvasに線描画。設計書 §17 |
| 深度/法線マップ出力 | ControlNet depth/normal用 | ○ | ○ | レンダーターゲット切替で可能 |
| プロンプト生成の高度化 | より正確な姿勢記述・テンプレ選択 | ○ | ○ | 現状はヒューリスティック。角度ベースに拡張余地 |
| 複数アングル一括書き出し | 同一ポーズを複数視点でPNG | ○ | ○ | 視点プリセットをループ |

### D. データ・運用
| 案 | 内容 | 効果 | コスト | メモ |
|---|---|---|---|---|
| ポーズギャラリー(IndexedDB) | アプリ内に複数保存・一覧・サムネ | ◎ | ○ | 設計でLocalStorage/IndexedDB想定済み。未実装 |
| 共有リンク | URLにポーズを埋めて共有 | ○ | ○ | pose.jsonをbase64でクエリ化 |
| posepack.zip | PNG+JSON+TXTを一括保存 | △ | ○ | 設計書 §4.1 |
| 多言語UI | 日/英切替 | △ | ○ | 現状UIは日本語主体 |

### E. 写真→ポーズ（将来）
| 案 | 内容 | 効果 | コスト | メモ |
|---|---|---|---|---|
| MediaPipe Pose で抽出 | 写真から関節推定→人形へ | ◎ | ◎ | 設計書 §18。誤差調整UIが要。2D→3D化が課題 |

---

## 11. 設計上の不変条件（ブラッシュアップ時に守ること）

1. **回転を `pose.joints` に焼き込まない。** ソース(無回転)＋回転を分け、表示は `displayJoints` で重ねる（§4.2）。
   破ると保存/読込やUndoでズレやJSON往復破綻が再発する。
2. **処理は finalize の順序を守る**: 入力→リーチ/床制限→IK→回転(表示)→検査→反映（§4.3）。
   制限とIKの順序を入れ替えると競合する。
3. **描画ループはReact外・状態はZustand橋渡し・命令はviewportApi**（§4.1）。3DオブジェクトをReact stateに入れない。
4. **保存の真実はソースのみ**（操作点位置・回転・Pole・bodyScale・camera・aspect）。従属点は再計算（§5.7）。
   pose.json を拡張するときは version を上げ、migration を追加する。
5. **相対パス（base:'./'）を維持**。`/`始まりの絶対パスを足すとサブパス配信(GitHub Pages)で壊れる。
6. **スマホ最優先**。新操作は「タップ＋ボタン」で完結する代替を必ず用意（直接ドラッグだけに依存しない）。
7. **1ファイル1責務・目安300行**。重い処理は該当チェーンのみ再計算（スマホ性能）。
8. 骨長は固定（default由来）。腕脚を伸縮させる機能は別途リーチ制限の見直しが必要。

---

## 12. 既知の制約・割り切り（現状）

- 回転中の Move は「無回転フレームのソース」を編集するため、体を大きく回した状態だと画面上の方向と
  移動方向が一致しないことがある（割り切り）。Pole マーカーも無回転位置で表示。
- 手首/足首の回転は JSON 保持のみ（見た目反映なし）。
- 重心警告は足が床接地(y≤0.06)時のみ作動。直立デフォルトは脚がほぼ最大伸長で、横移動するとreach clampで
  足が浮き、警告対象外になることがある（簡易判定の仕様）。
- Pose プリセット（T-Pose 等）・OpenPose出力・写真抽出・複数キャラ・GLB/VRM は未実装。
- 人形はプリミティブ（球/円柱）。頭は対称な球で、頭の回転は見た目に出にくい。
- バンドル: メイン約720KB（three同梱、gzip約195KB）。VRM/GLTF(約196KB)は動的importで別チャンク。
- VRMリターゲットは位置ベースのため、ねじり・指・手足の細かな向きは未反映（§6.7）。本人モデルが必要。
- `limits.strictness` はデータ上あるが挙動に未反映。

---

## 13. 公開・運用情報

- GitHub: https://github.com/John-Mori/ai-pose-doll （Public）
- 公開URL: https://john-mori.github.io/ai-pose-doll/
- 更新: `main` へ push すると GitHub Actions が自動ビルド&再デプロイ。
- ローカル開発: `npm install` → `npm run dev`（PC）/ `npm run host`（スマホ同一Wi-Fi）/ `npm run build`（本番）。
- 設計の正本（作る前の仕様）: `AI_Pose_Doll_Mobile_設計書_ClaudeCode版_v2.md`、進捗: `STATUS.md`。

---

## 付録: 代表的な操作シナリオ（理解の助け）

1. 右手首の操作点をタップ → Moveタブで「前」を数回 → 腕が前に伸び、肘がIKで自然に曲がる。
2. Poleタブ相当（rightElbowPoleを選択しMove）で肘の向きを調整。
3. pelvisを選択しRotateのYawで体ごと右へ向ける（体の向き）。
4. Cameraタブで 4:5 + 45 Degree を選ぶ → 構図フレーム（レターボックス）が縦長に。
5. Exportタブで背景=白・操作点=なしにして Save PNG → ChatGPTに添付。
6. Save JSON で保存 → 後日 Load JSON で回転含め完全復元して再編集。
