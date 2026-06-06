# スマホ優先 AI画像生成用 3Dポーズ人形ツール 設計書

> **版数: v2.0（Claude Code 実装準備版 / 2026-06-06 改訂）**
> 本版は「全部入り」設計書をベースに、Claude Code でそのまま実装着手できるよう
> 仕様のあいまい点を確定し、実装フェーズ・セッション運用・動作確認を追補したもの。
> 元の構成・方針・技術選定（React + Zustand + Tailwind + Three.js、タップ選択＋ボタン移動＋簡易IK、プリミティブ人形）は維持している。

## 0. v2.0 での主な改訂点（レビュー用サマリ）

実装前に確定させた点と追補。詳細は各セクション参照。

1. **pose.json に回転情報を追加**（§13）。head/chest/pelvis/手首/足首は位置だけでなく回転も保持する（Rotateタブの結果を保存できるようにするため）。スキーマ版数を 0.1.0 → 0.2.0 に更新。
2. **「ソースデータ」と「IKで解かれる従属点」を分離**（§13.5）。保存・復元の真実は操作点＋Pole＋体型＋ルートのみ。肩・肘・膝・股・首は読込時にIKで再計算する。
3. **操作点ごとの移動の伝播ルールを明文化**（§10.4）。pelvis＝全身ルート、chest＝上半身、手首/足首＝IKターゲット、という階層と伝播を確定。
4. **移動方向はカメラ相対を既定に**（§8.3 追記）。スマホでカメラを回しても「左」が画面の左になるようにする。
5. **処理パイプラインの順序を確定**（§11.5）。入力→リーチ制限→IK解決→関節制限→検査（警告）→反映。
6. **React × Three.js の実装上の注意を追加**（§6.3）。描画ループは React の外（imperative）で回し、状態は Zustand で橋渡しする。
7. **実装フェーズ計画・セッション運用・動作確認を追補**（§27〜§29）。12ステップを5チェックポイントに束ね、1セッション=1チェックポイント＋STATUS.md でドリフトを防ぐ。

---

## 1. プロジェクト名

AI Pose Doll Mobile

仮称：

- AI Pose Doll Mobile
- Chami Pose Doll
- Mobile Pose Puppet
- Pose Reference Maker for AI Art

---

## 2. 目的

AI画像生成において、文章だけでは伝えにくいキャラクターのポーズ・構図・カメラ角度を、スマホ上で3D人形を動かして指定できるツールを作る。

主な目的は以下。

- スマホで手軽に3D人形を動かす
- 手、足、頭、首、胴体、腰などを部位ごとに操作する
- 人体構造上、不自然すぎるポーズにならないように制限する
- X投稿用の4:5、9:16、16:9構図を作る
- 画像生成AIに渡すためのポーズ参考画像を出力する
- 作成したポーズを後で再編集できるように保存する
- 将来的にOpenPose風画像も出力できるようにする

---

## 3. 最重要方針

### 3.1 スマホ優先

このツールはスマホで使うことを最優先にする。

想定端末：

- iPhone
- iPad
- Androidスマホ
- Androidタブレット
- PCブラウザ

### 3.2 Blenderは初期版では使わない

スマホで使うことを優先するため、初期版ではBlenderアドオンとして作らない。

理由：

- Blenderは基本的にPC向け
- スマホで直接使うには向かない
- スマホで頻繁にポーズを作る用途には重い
- 自作ツールとしてはWebアプリの方が修正しやすい

### 3.3 Webアプリ / PWAとして作る

スマホブラウザで動作するWebアプリとして作る。

PWA化することで、スマホのホーム画面に追加してアプリ風に使えるようにする。

### 3.4 出力はPNG + JSONを基本にする

- PNG：画像生成AIに添付するポーズ参考画像
- JSON：後で再編集するためのポーズデータ
- TXT：ChatGPTや画像生成AIに渡すプロンプト補助文

---

## 4. JSONと画像保存の扱い

### 4.1 結論

JSONは画像ではない。

保存形式は以下を基本にする。

```text
ポーズ画像        → .png
再編集用データ    → .pose.json
プロンプト補助文  → .txt
将来的な一括保存  → .posepack.zip
```

### 4.2 PNGの役割

PNGは、画像生成AIに添付するための視覚資料。

用途：

- ChatGPT画像生成に添付する
- ComfyUIに渡す
- ポーズと構図を人間が確認する
- スマホの写真アプリやファイルアプリで確認する

### 4.3 JSONの役割

JSONは、後でポーズを再編集するためのデータ。

保存する情報：

- 関節座標
- Pole Target座標
- カメラ位置
- カメラ向き
- アスペクト比
- 表示設定
- ポーズ名
- 作成日時
- バージョン

### 4.4 なぜPNGとJSONの両方が必要か

PNGだけでは、後から3D人形を再編集できない。

JSONだけでは、人間がスマホ上で見ても直感的に分かりにくく、画像生成AIへの視覚参照として使いにくい。

そのため、初期版からPNGとJSONの両方を保存できるようにする。

### 4.5 ファイル名例

```text
pose_20260606_1749.png
pose_20260606_1749.pose.json
pose_20260606_1749_prompt.txt
```

---

## 5. 想定する使い方

### 5.1 基本フロー

```text
スマホでWebアプリを開く
↓
3D人形を表示する
↓
手・足・頭・腰などの操作点を指で選択する
↓
ボタンやスライダーでポーズを調整する
↓
4:5 / 9:16 / 16:9 の構図を選ぶ
↓
PNGとして保存する
↓
必要ならJSONも保存する
↓
画像生成AIにPNGを添付して使う
```

### 5.2 ChatGPT画像生成へ渡す場合

出力したPNGを添付して、以下のように使う。

```text
添付画像の3D人形のポーズとカメラ構図を参照してください。
キャラクターデザインは別添付のキャラクター画像を参照してください。
3D人形の灰色の見た目、背景、UI要素は反映しないでください。
ポーズ、体の向き、腕・脚の配置、カメラ距離だけを参考にしてください。
```

### 5.3 ComfyUIへ渡す場合

将来的には以下の流れにする。

```text
スマホでポーズ作成
↓
PNG / OpenPose風画像を出力
↓
ComfyUI ControlNet OpenPoseへ入力
↓
キャラ参照画像はIP-Adapter等へ入力
↓
画像生成
```

---

## 6. 技術構成

### 6.1 初期技術スタック

推奨構成：

- TypeScript
- React
- Vite
- Three.js
- Zustand
- Tailwind CSS
- PWA対応
- Canvas / WebGL
- LocalStorage
- IndexedDB

### 6.2 採用理由

#### TypeScript

ポーズデータ、関節データ、カメラ設定などの型を明確にできる。

#### React

スマホ用UIを作りやすい。

#### Vite

軽量で開発開始が早い。

#### Three.js

ブラウザ上で3D表示を行うために使う。

#### Zustand

ポーズ状態、選択中の部位、カメラ設定などを管理する。

#### Tailwind CSS

スマホ向けUIを素早く作る。

#### PWA

スマホのホーム画面に追加して、アプリ風に起動できるようにする。

### 6.3 React × Three.js の実装上の注意（重要・v2.0で追加）

React と Three.js を併用する際は以下を守る。詰まりやすい箇所のため最初から設計に織り込む。

- **Three.js の描画ループ（`requestAnimationFrame`）は React の再レンダリングの外で回す。** `ThreeViewport` 内で `useRef` にレンダラ／シーン／人形を保持し、`useEffect`（マウント時1回）でループを開始する。React の再描画ごとにシーンを作り直さない。
- **状態の橋渡しは Zustand で行う。** UI（ボタン）→ Zustand 更新 → Three 側は `store.subscribe` で差分を受け取り人形を更新する。3Dオブジェクトを React の state に入れない（重く・壊れやすい）。
- **タッチは canvas に直接 `pointerdown` 等を登録**し、`passive: false` でスクロール干渉を防ぐ（スマホで重要）。
- **`devicePixelRatio` は上限2にクランプ**し、高解像度スマホの発熱・処理落ちを防ぐ。

---

## 7. 初期MVPの範囲

### 7.1 MVPで作る機能

最初に作る機能は以下。

- スマホブラウザで3D人形を表示
- 画面上に3D人形を1体表示
- 頭、胸、腰、両手、両足に操作点を表示
- 操作点をタップして選択
- 選択した操作点をボタンまたはスライダーで動かす
- 腕と脚を簡易IKで追従させる
- 肘と膝が逆に曲がらないように制限する
- 4:5、9:16、16:9の構図フレームを表示
- PNGとして保存
- JSONとして保存
- JSONを読み込んでポーズ復元
- 簡易プロンプトTXTを保存

### 7.2 MVPでやらないこと

初期版では以下はやらない。

- 写真からのポーズ自動抽出
- 完全な人体物理シミュレーション
- 高精度な筋肉や肩甲骨の補正
- 指の細かい操作
- 複数キャラ対応
- OpenPose風画像の完全対応
- 服や髪のシミュレーション
- キャラクター画像そのものの生成
- アプリストア配信
- ログイン機能
- クラウド保存

---

## 8. スマホ操作設計

### 8.1 直接ドラッグだけに依存しない

スマホで3D空間の点を直接ドラッグする操作は難しい。

そのため、初期版では以下の操作方式を採用する。

```text
1. 操作点をタップして選択
2. 画面下の操作パネルで移動方向を選ぶ
3. 上下・左右・前後ボタンで少しずつ動かす
4. 必要に応じてスライダーで微調整する
```

### 8.2 操作モード

操作モードは以下。

- Move：位置移動
- Rotate：回転
- Camera：カメラ操作
- Pose：ポーズプリセット
- Export：出力
- Check：ポーズ検査

### 8.3 移動操作

選択中の操作点に対して以下のボタンを表示する。

```text
上
下
左
右
前
後
```

移動量は以下から選べる。

```text
小：0.01
中：0.05
大：0.10
```

#### 移動の基準軸（v2.0で確定）

Up/Down/Left/Right/Forward/Back は **既定でカメラ相対** とする。
スマホでカメラを回したとき「Left」が常に画面の左になるため直感的。

- 内部ではカメラの right / up / forward ベクトルから移動方向を求める（水平移動用に Y成分を除いた基準も用意）
- 厳密に軸を合わせたい上級者向けに「World基準」へ切り替えるトグルも用意する

### 8.4 回転操作

頭、胸、腰、手首、足首などには回転操作を用意する。

```text
Pitch：前後
Yaw：左右回転
Roll：傾き
```

### 8.5 カメラ操作

カメラ操作は以下。

- 正面
- 斜め45度
- 横
- 斜め上
- 少し低い視点
- 全身
- 膝上
- 腰上
- バストアップ
- ズームイン
- ズームアウト

---

## 9. 3D人形設計

### 9.1 初期モデル

初期版では、リアルな美少女モデルではなく、シンプルなデッサン人形を使う。

条件：

- 軽量
- 灰色または白色
- 骨格が分かりやすい
- 装飾なし
- 顔の造形は簡素
- 手足の長さが自然

### 9.2 表示方式

初期版では、Three.jsの基本形状で人体を組む。

例：

- 頭：Sphere
- 首：Cylinder
- 胴体：CapsuleまたはBox
- 腰：SphereまたはBox
- 腕：Cylinder
- 脚：Cylinder
- 関節：Sphere

### 9.3 初期方針

最初はプリミティブ人形で作る。

理由：

- スマホで軽い
- 自作しやすい
- 人体ポーズ指定という目的には十分
- ボーン名問題を避けられる
- 後からGLB/VRMに拡張できる

---

## 10. 骨格データ設計

### 10.1 関節一覧

初期版で扱う関節は以下。

```text
head
neck
chest
pelvis

leftShoulder
leftElbow
leftWrist

rightShoulder
rightElbow
rightWrist

leftHip
leftKnee
leftAnkle

rightHip
rightKnee
rightAnkle
```

### 10.2 操作対象

ユーザーが直接操作する点：

```text
head
chest
pelvis
leftWrist
rightWrist
leftAnkle
rightAnkle
leftElbowPole
rightElbowPole
leftKneePole
rightKneePole
```

### 10.3 自動追従する点

以下は直接操作ではなく、IKや補正で決まる。

```text
leftElbow
rightElbow
leftKnee
rightKnee
leftShoulder
rightShoulder
leftHip
rightHip
neck
```

### 10.4 ボーン階層と移動の伝播（v2.0で確定）

操作点は種類ごとに人形階層への効き方が異なる。実装時はこのツリーを基準にする。

```text
pelvis（ルート／全身の基準）
├── chest（上半身。spine が pelvis→chest を結ぶ）
│   ├── neck → head
│   ├── leftShoulder  →〔腕IK〕→ leftElbow → leftWrist
│   └── rightShoulder →〔腕IK〕→ rightElbow → rightWrist
├── leftHip  →〔脚IK〕→ leftKnee → leftAnkle
└── rightHip →〔脚IK〕→ rightKnee → rightAnkle
```

伝播ルール:

- **pelvis を移動 → 全身が平行移動**（ルートのため）。手首・足首はワールド位置を保ったまま追従させるか／一緒に動かすかを設定可（既定は一緒に動く）。
- **pelvis を回転 → 体の向き全体が回る。**
- **chest を移動/回転 → 上半身（首・頭・両肩・両腕）が連動**。spine セグメントが pelvis と chest を結ぶ。
- **手首・足首を移動 → その腕・脚だけ IK で再計算**（肩/股は親に固定）。
- **head を回転 → 首・頭の向きのみ。**

肩は chest に、股関節は pelvis に固定された子。ユーザーは肩・股を直接は動かさない（§10.3）。

---

## 11. IK設計

### 11.1 初期IK方針

初期版では、完全な3Dリグではなく、簡易2ボーンIKを実装する。

対象：

- 左腕
- 右腕
- 左脚
- 右脚

### 11.2 腕IK

腕は以下の3点で構成する。

```text
肩 → 肘 → 手首
```

ユーザーが手首を動かすと、肩から手首までの距離と腕の長さに応じて肘位置を計算する。

肘の曲がる方向はPole Targetで決める。

```text
shoulder
elbow
wrist
pole
```

### 11.3 脚IK

脚は以下の3点で構成する。

```text
股関節 → 膝 → 足首
```

ユーザーが足首を動かすと、股関節から足首までの距離と脚の長さに応じて膝位置を計算する。

膝の曲がる方向はPole Targetで決める。

```text
hip
knee
ankle
pole
```

### 11.4 IKの基本ルール

- 手首が腕の長さより遠くに行きすぎた場合は、最大距離に制限する
- 足首が脚の長さより遠くに行きすぎた場合は、最大距離に制限する
- 肘はPole Target側に曲げる
- 膝はPole Target側に曲げる
- 肘と膝が逆方向に折れないようにする

### 11.5 処理パイプライン（v2.0で確定）

操作のたびに、必ず以下の順で処理する。順序を守らないと制限とIKが競合する。

```text
1. 入力      操作点を移動/回転（カメラ相対 → 内部座標へ変換）
2. リーチ制限 手首/足首が腕/脚の最大長を超えないようクランプ（§11.4）
3. IK解決    肩→肘→手首 / 股→膝→足首 の中間関節を計算（Poleで曲げ方向決定）
4. 関節制限   首・胴体などの角度制限を適用（§12）
5. 検査      重心・貫通などをチェックし warnings を更新（§12.2 重心 / Checkタブ）
6. 反映      人形メッシュとUIへ反映、Zustand を更新
```

毎フレーム全部を回す必要はなく、操作のあった部位に関係するチェーンのみ再計算してよい（スマホ性能対策）。

---

## 12. 人体制限設計

### 12.1 目的

操作中に人体構造上、不自然すぎるポーズになることを減らす。

完全保証ではなく、破綻を減らすための補助とする。

### 12.2 制限する内容

#### 腕

- 手首が肩から遠くなりすぎない
- 肘が逆方向に折れない
- 左右の腕が胴体を極端に貫通しないように警告する

#### 脚

- 足首が股関節から遠くなりすぎない
- 膝が逆方向に折れない
- 足が床より下に沈みすぎない
- 両足が極端に離れすぎたら警告する

#### 首

- 前後に曲がりすぎない
- 左右に倒れすぎない
- 回転しすぎない

#### 胴体

- 胸と腰の距離が変わりすぎない
- 腰の回転が極端になりすぎない
- 胴体がねじれすぎたら警告する

#### 重心

初期版では簡易判定のみ。

- 両足が地面についている場合、骨盤が両足の間から大きく外れたら警告
- 片足立ちの場合、骨盤が支持足から大きく外れたら警告

---

## 13. pose.json仕様

### 13.1 基本構造

```json
{
  "version": "0.2.0",
  "appName": "AI Pose Doll Mobile",
  "createdAt": "2026-06-06T17:49:00+09:00",
  "updatedAt": "2026-06-06T17:49:00+09:00",
  "poseName": "sample_pose",
  "aspectRatio": "4:5",
  "camera": {
    "position": [0, 1.3, 4.5],
    "target": [0, 1.1, 0],
    "fov": 35,
    "zoom": 1.0
  },
  "bodyScale": {
    "height": 1.0,
    "headSize": 1.0,
    "armLength": 1.0,
    "legLength": 1.0
  },
  "joints": {
    "head": [0, 1.72, 0],
    "neck": [0, 1.55, 0],
    "chest": [0, 1.32, 0],
    "pelvis": [0, 0.95, 0],
    "leftShoulder": [-0.22, 1.38, 0],
    "leftElbow": [-0.45, 1.18, 0.1],
    "leftWrist": [-0.62, 1.02, 0.2],
    "rightShoulder": [0.22, 1.38, 0],
    "rightElbow": [0.5, 1.25, 0.1],
    "rightWrist": [0.75, 1.22, 0.25],
    "leftHip": [-0.13, 0.9, 0],
    "leftKnee": [-0.25, 0.48, 0.05],
    "leftAnkle": [-0.35, 0.05, 0.08],
    "rightHip": [0.13, 0.9, 0],
    "rightKnee": [0.28, 0.48, 0.05],
    "rightAnkle": [0.42, 0.05, 0.08]
  },
  "poles": {
    "leftElbowPole": [-0.5, 1.2, -0.4],
    "rightElbowPole": [0.5, 1.2, -0.4],
    "leftKneePole": [-0.25, 0.5, 0.5],
    "rightKneePole": [0.25, 0.5, 0.5]
  },
  "rotations": {
    "head":       [0, 0, 0],
    "chest":      [0, 0, 0],
    "pelvis":     [0, 0, 0],
    "leftWrist":  [0, 0, 0],
    "rightWrist": [0, 0, 0],
    "leftAnkle":  [0, 0, 0],
    "rightAnkle": [0, 0, 0]
  },
  "limits": {
    "enabled": true,
    "strictness": "normal"
  },
  "notes": "AI image generation pose reference"
}
```

### 13.2 座標系

初期版では以下の座標系にする。

```text
X：左右
Y：上下
Z：前後
```

### 13.3 単位

内部単位はメートル風の正規化値とする。

```text
身長：約1.7
床：Y = 0
```

### 13.4 バージョン管理

JSONには必ずversionを入れる。

理由：

- 後で仕様変更したときに読み込み互換性を保つため
- 古いポーズデータを変換できるようにするため

### 13.5 ソースデータと従属データの分離（v2.0で確定）

保存・復元の「真実」は、ユーザーが操作する点とその回転・Pole・体型・ルートだけにする。
肩・肘・膝・股・首など IK で求まる点は **読込時に再計算**する（保存しても良いが、あくまでキャッシュ扱い）。

- **ソース（必ず保存・復元）**: head / chest / pelvis / 各手首 / 各足首 の位置と回転、4つのPole、`bodyScale`、`camera`、`aspectRatio`
- **従属（再計算でよい）**: leftElbow / rightElbow / leftKnee / rightKnee / leftShoulder / rightShoulder / leftHip / rightHip / neck の位置

読込手順:

```text
1. version を確認（0.1.0 など旧版なら migration を通す）
2. ソースデータを復元
3. 関節制限を一度適用
4. IK を解いて従属点を再計算
5. 人形へ反映
```

### 13.6 回転データの扱い（v2.0で追加）

Rotateタブ（§14.6）で head / chest / pelvis / 手首 / 足首 を回せるため、位置だけでは姿勢を完全復元できない。
そこで `rotations` を追加し、各操作点のオイラー角（度, `[pitch, yaw, roll]`）を保持する。

- 単位は **度**、回転順序は内部で固定（例: XYZ）。実装で固定したら README に明記する。
- 旧版（0.1.0, rotations 無し）は全回転 0 として読み込む（migration）。

---

## 14. 画面設計

### 14.1 メイン画面

スマホ縦画面を基本にする。

```text
上部：
- アプリ名
- 保存
- 読込
- 出力

中央：
- 3Dビュー

下部：
- 操作パネル
```

### 14.2 3Dビュー

表示するもの：

- 3D人形
- 操作点
- 床グリッド
- 構図フレーム
- 選択中の部位名
- 警告表示

### 14.3 下部操作パネル

タブ構成：

```text
Pose
Move
Rotate
Camera
Export
Check
```

### 14.4 Poseタブ

- Reset Pose
- T-Pose
- Standing
- Walking
- Sitting
- Hand Forward
- Looking Back

### 14.5 Moveタブ

選択中の操作点を移動する。

- Up
- Down
- Left
- Right
- Forward
- Back
- Step Small
- Step Medium
- Step Large

### 14.6 Rotateタブ

選択中の部位を回転する。

- Pitch -
- Pitch +
- Yaw -
- Yaw +
- Roll -
- Roll +

### 14.7 Cameraタブ

- 4:5 Portrait
- 9:16 Vertical
- 16:9 Wide
- 1:1 Square
- Full Body
- Knee Up
- Waist Up
- Bust Up
- Front
- 45 Degree
- Side
- Low Angle
- High Angle

### 14.8 Exportタブ

- Save PNG
- Save Pose JSON
- Load Pose JSON
- Save Prompt TXT
- Copy Prompt
- Future: Save OpenPose PNG

### 14.9 Checkタブ

- Check Pose
- Show Warnings
- Clear Warnings

---

## 15. PNG出力仕様

### 15.1 出力内容

PNGには以下を含める。

- 3D人形
- ポーズ
- カメラ構図
- 必要なら構図フレーム

### 15.2 出力サイズ

初期プリセット：

```text
4:5    → 1080 x 1350
9:16   → 1080 x 1920
16:9   → 1600 x 900
1:1    → 1080 x 1080
```

### 15.3 背景

初期版では以下を選べるようにする。

- 白背景
- グレー背景
- 透過背景
- 床グリッドあり
- 床グリッドなし

### 15.4 用途別出力

#### ChatGPT添付用

```text
背景：白またはグレー
人形：灰色
操作点：非表示
床グリッド：必要に応じて表示
構図フレーム：非表示
```

#### 自分確認用

```text
背景：グレー
人形：灰色
操作点：表示
床グリッド：表示
構図フレーム：表示
```

#### ControlNet / OpenPose用

初期版では未対応。

将来的には骨格線のみ出力する。

---

## 16. プロンプト出力仕様

### 16.1 目的

作成したポーズをChatGPTや画像生成AIへ説明する補助文を出力する。

### 16.2 日本語出力例

```text
添付画像の3D人形のポーズと構図を参照してください。
キャラクターは全身が見える4:5の縦構図で、体はやや右向きです。
右腕は前方へ伸ばし、左腕は体の横に下げています。
右脚に重心を置き、左脚は軽く後ろへ引いています。
3D人形の灰色の質感や背景は反映せず、ポーズ、体の向き、腕と脚の配置、カメラ距離だけを参考にしてください。
```

### 16.3 英語出力例

```text
Use the attached 3D mannequin image as a pose and composition reference only.
The character is shown in a full-body 4:5 vertical composition, with the body slightly angled to the right.
The right arm is extended forward, while the left arm rests near the side.
The weight is on the right leg, and the left leg is slightly pulled back.
Do not copy the gray mannequin material or background. Use only the pose, body direction, limb placement, and camera distance as reference.
```

---

## 17. OpenPose風出力の将来設計

### 17.1 目的

ComfyUI / ControlNetでポーズ制御しやすくする。

### 17.2 出力内容

以下の点を2D座標に変換して線で結ぶ。

```text
nose
neck
right_shoulder
right_elbow
right_wrist
left_shoulder
left_elbow
left_wrist
right_hip
right_knee
right_ankle
left_hip
left_knee
left_ankle
right_eye
left_eye
right_ear
left_ear
```

### 17.3 実装方針

初期版では未実装。

将来的に、Three.jsの3D座標をカメラ投影して2Dスクリーン座標へ変換し、Canvasに骨格線を描画する。

---

## 18. 写真からポーズ抽出の将来設計

### 18.1 目的

参考写真から人間のポーズを抽出し、3D人形に反映する。

### 18.2 候補技術

- MediaPipe Pose Landmarker
- OpenPose系ライブラリ
- TensorFlow.js系の姿勢推定

### 18.3 初期版でやらない理由

- 実装が重くなる
- スマホ性能差の影響を受ける
- まずは手動ポーズ作成の体験を完成させるべき
- 写真からの推定は誤差が出るため、後から調整UIが必要になる

---

## 19. 状態管理設計

### 19.1 管理する状態

```text
selectedJoint
currentPose
cameraSettings
aspectRatio
showGrid
showControlPoints
showFrameGuide
moveStep
rotationStep
warnings
exportSettings
```

### 19.2 Zustand Store案

```typescript
type JointName =
  | "head"
  | "chest"
  | "pelvis"
  | "leftWrist"
  | "rightWrist"
  | "leftAnkle"
  | "rightAnkle"
  | "leftElbowPole"
  | "rightElbowPole"
  | "leftKneePole"
  | "rightKneePole";

type Vec3 = [number, number, number];

type PoseState = {
  selectedJoint: JointName | null;
  joints: Record<string, Vec3>;
  poles: Record<string, Vec3>;
  aspectRatio: "4:5" | "9:16" | "16:9" | "1:1";
  moveStep: number;
  warnings: string[];

  selectJoint: (joint: JointName) => void;
  moveSelectedJoint: (delta: Vec3) => void;
  resetPose: () => void;
  setAspectRatio: (ratio: PoseState["aspectRatio"]) => void;
  checkPose: () => void;
};
```

---

## 20. ディレクトリ構成

推奨構成：

```text
ai-pose-doll-mobile/
  package.json
  index.html
  vite.config.ts
  tsconfig.json
  README.md

  public/
    manifest.json
    icons/
      icon-192.png
      icon-512.png

  src/
    main.tsx
    App.tsx

    components/
      Layout.tsx
      ThreeViewport.tsx
      BottomPanel.tsx
      JointSelector.tsx
      MoveControls.tsx
      RotateControls.tsx
      CameraControls.tsx
      ExportPanel.tsx
      WarningPanel.tsx

    three/
      createScene.ts
      createDoll.ts
      createControlPoints.ts
      updateDollGeometry.ts
      cameraPresets.ts
      frameGuide.ts
      exportCanvas.ts

    pose/
      defaultPose.ts
      poseTypes.ts
      poseStore.ts
      ikSolver.ts
      jointLimits.ts
      poseValidator.ts
      promptGenerator.ts
      poseJson.ts

    utils/
      downloadFile.ts
      dateFormat.ts
      math3d.ts

    styles/
      globals.css
```

---

## 21. 実装ステップ

### Step 1: プロジェクト作成

目的：

- Vite + React + TypeScriptのプロジェクトを作る
- スマホで表示確認できる状態にする

完了条件：

- PCブラウザで起動できる
- スマホから同一ネットワークでアクセスできる
- 画面にアプリ名が表示される

---

### Step 2: Three.jsで3Dビューを表示

目的：

- 3D空間、カメラ、ライト、床グリッドを表示する

完了条件：

- スマホブラウザで3Dビューが表示される
- カメラ操作ができる
- 床グリッドが表示される

---

### Step 3: プリミティブ人形を表示

目的：

- Sphere / Cylinder / Capsule などで簡易人形を作る

完了条件：

- 頭、胴体、腕、脚が表示される
- 人型として認識できる
- 軽く動作する

---

### Step 4: 操作点を表示

目的：

- 主要関節に操作点を表示する

表示する操作点：

```text
head
chest
pelvis
leftWrist
rightWrist
leftAnkle
rightAnkle
leftElbowPole
rightElbowPole
leftKneePole
rightKneePole
```

完了条件：

- 操作点が丸で表示される
- タップすると選択できる
- 選択中の操作点名が画面に出る

---

### Step 5: ボタン操作で関節を動かす

目的：

- 選択中の操作点を上下左右前後に動かす

完了条件：

- Up / Down / Left / Right / Forward / Back ボタンで操作点が移動する
- 移動量を小・中・大で切り替えられる

---

### Step 6: 腕と脚の簡易IK

目的：

- 手首を動かしたら肘位置が自然に追従する
- 足首を動かしたら膝位置が自然に追従する

完了条件：

- 左右の腕が2ボーンIKで曲がる
- 左右の脚が2ボーンIKで曲がる
- 肘と膝の曲がる方向をPoleで調整できる

---

### Step 7: 関節制限

目的：

- 極端な破綻を減らす

完了条件：

- 手首が腕の最大長を超えて離れすぎない
- 足首が脚の最大長を超えて離れすぎない
- 膝と肘が逆方向に曲がりにくい
- 足が床より下に沈みすぎない

---

### Step 8: カメラプリセット

目的：

- AI画像生成やX投稿に使いやすい構図を作る

完了条件：

- 4:5
- 9:16
- 16:9
- 1:1
- 全身
- 膝上
- 腰上
- バストアップ
- 正面
- 斜め45度

を切り替えられる。

---

### Step 9: PNG保存

目的：

- 現在の3DビューをPNGとして保存する

完了条件：

- Save PNGボタンでPNGを保存できる
- スマホのファイルに保存できる
- 操作点あり/なしを切り替えられる
- グリッドあり/なしを切り替えられる

---

### Step 10: JSON保存・読込

目的：

- 作成したポーズを後で再編集できるようにする

完了条件：

- Save Pose JSONで.pose.jsonを保存できる
- Load Pose JSONで読み込める
- 読み込んだポーズが3D人形に反映される

---

### Step 11: プロンプトTXT保存

目的：

- 画像生成AIに渡す補助文を保存する

完了条件：

- Save Prompt TXTで日本語・英語の補助文を保存できる
- Copy Promptでクリップボードにコピーできる

---

### Step 12: PWA対応

目的：

- スマホのホーム画面に追加してアプリ風に使えるようにする

完了条件：

- manifest.jsonを設定
- アイコンを設定
- ホーム画面追加に対応
- オフライン起動の最低限対応

---

## 22. Codex / Claude Codeへの初回依頼文

以下をそのまま使う。

```text
あなたはTypeScript、React、Three.jsに詳しいフロントエンドエンジニアです。
スマホで使うAI画像生成用の3Dポーズ人形Webアプリを作りたいです。

目的：
文章だけでは指定しにくいキャラクターのポーズや構図を、スマホ上で3D人形を動かして作成し、画像生成AIに渡すためのPNGと、再編集用のJSONを保存できるようにしたいです。

技術構成：
- Vite
- React
- TypeScript
- Three.js
- Zustand
- Tailwind CSS
- PWA対応は後回しでよいが、将来的に対応しやすい構成にする

最初のMVP要件：
1. スマホブラウザで動くWebアプリとして作る。
2. 画面中央にThree.jsの3Dビューを表示する。
3. 3D空間に床グリッド、カメラ、ライトを表示する。
4. Sphere、Cylinder、Capsuleなどの基本形状で簡易的な人型デッサン人形を作る。
5. 人形には以下の主要点を持たせる。
   - head
   - neck
   - chest
   - pelvis
   - leftShoulder
   - leftElbow
   - leftWrist
   - rightShoulder
   - rightElbow
   - rightWrist
   - leftHip
   - leftKnee
   - leftAnkle
   - rightHip
   - rightKnee
   - rightAnkle
6. ユーザーが操作する点は以下。
   - head
   - chest
   - pelvis
   - leftWrist
   - rightWrist
   - leftAnkle
   - rightAnkle
   - leftElbowPole
   - rightElbowPole
   - leftKneePole
   - rightKneePole
7. 操作点をタップすると選択できる。
8. 画面下部に操作パネルを表示する。
9. 操作パネルには以下のボタンを置く。
   - Up
   - Down
   - Left
   - Right
   - Forward
   - Back
   - Step Small
   - Step Medium
   - Step Large
   - Reset Pose
   - Save PNG
   - Save Pose JSON
   - Load Pose JSON
10. 選択中の操作点をボタンで上下左右前後に動かせるようにする。
11. 手首を動かしたときに、肩・肘・手首の腕が自然につながるように簡易2ボーンIKを実装する。
12. 足首を動かしたときに、股関節・膝・足首の脚が自然につながるように簡易2ボーンIKを実装する。
13. 肘と膝の曲がる方向はPole Targetで調整できるようにする。
14. 手首が腕の最大長を超えて離れすぎないように制限する。
15. 足首が脚の最大長を超えて離れすぎないように制限する。
16. 足が床より下に沈みすぎないように制限する。
17. 4:5、9:16、16:9、1:1の構図プリセットを用意する。
18. Save PNGで現在の3DビューをPNG保存できるようにする。
19. Save Pose JSONで現在の関節座標、Pole座標、カメラ設定、アスペクト比を.pose.jsonとして保存できるようにする。
20. Load Pose JSONで保存した.pose.jsonを読み込んでポーズを復元できるようにする。

実装方針：
- 最初から完璧な人体モデルを目指さない。
- まずは軽量なプリミティブ人形で作る。
- 直接ドラッグ操作が難しい場合は、タップ選択 + ボタン移動方式を優先する。
- スマホ操作を最優先にする。
- 1ファイルに詰め込みすぎず、責務ごとにファイル分割する。
- 初心者でも起動できるように、セットアップ手順、起動手順、スマホ確認手順をREADMEに書く。
- エラー調査しやすいように、重要処理にはconsole.logを入れる。

まずは、プロジェクト一式の初期構成、主要ファイル、READMEを作成してください。
```

---

## 23. 優先順位

### 最優先

1. スマホで開ける
2. 3D人形が表示される
3. 操作点を選択できる
4. ボタンで手足を動かせる
5. PNG保存できる
6. JSON保存・読込できる

### 次点

7. 4:5 / 9:16 / 16:9構図
8. 簡易IK
9. 関節制限
10. プロンプト出力

### 後回し

11. PWA化
12. OpenPose風出力
13. 写真からポーズ抽出
14. 複数キャラ対応
15. VRM/GLBモデル対応

---

## 24. 開発上の注意点

### 24.1 最初からドラッグ操作を作り込まない

スマホの3Dドラッグは難しい。

最初は以下でよい。

```text
操作点をタップ
↓
ボタンで上下左右前後に動かす
```

この方が安定する。

### 24.2 最初からリアルな3Dモデルを使わない

GLBやVRMを最初から使うと、ボーン名やリグ構造で詰まりやすい。

最初はプリミティブ人形で作る。

### 24.3 PNGだけ保存では不十分

PNGは画像としては便利だが、ポーズ再編集ができない。

必ずJSON保存も作る。

### 24.4 JSONだけ保存でも不十分

JSONは再編集には便利だが、画像生成AIにそのまま添付しても視覚参照としては使いにくい。

必ずPNG保存も作る。

### 24.5 iPhoneのファイル保存に注意

スマホブラウザでは、PCと同じような自由なファイル保存ができない場合がある。

そのため、初期版では以下でよい。

- ダウンロードリンクを生成する
- ファイルアプリに保存する
- 共有シート経由で保存する
- アプリ内ではLocalStorageまたはIndexedDBにも自動保存する

---

## 25. 最初の完成イメージ

最初の完成状態は以下。

```text
iPhoneでURLを開く
↓
3D人形が表示される
↓
右手首の丸をタップ
↓
Forwardボタンを押す
↓
右腕が前に伸びる
↓
肘が自然に曲がる
↓
4:5を選ぶ
↓
Save PNGを押す
↓
ポーズ画像が保存される
↓
Save Pose JSONを押す
↓
後で再編集できるデータが保存される
```

---

## 26. この設計の結論

スマホ優先で作るなら、BlenderではなくWebアプリとして作る。

最初の構成は以下。

```text
Vite + React + TypeScript + Three.js
```

保存形式は以下。

```text
PNG        → 画像生成AIへ渡す視覚資料
.pose.json → 後で再編集するためのポーズデータ
.txt       → プロンプト補助文
```

最初はプリミティブ人形で作り、ボタン操作で関節を動かす。

いきなり完璧な人体補正やOpenPose出力を目指さず、まずは「スマホでポーズを作ってPNGとJSONで保存できる」状態を最優先にする。

---

## 27. Claude Code 実装フェーズ計画（v2.0で追加）

§21 の12ステップを、単独で動作確認できる **5つのチェックポイント（CP）** に束ねる。
各CPの完了ゲートを満たしてから次へ進む。1CP = 原則1セッション（§28）。

### CP1 — 基盤（表示できる）

- 含む: Step 1（プロジェクト作成）/ Step 2（3Dビュー）/ Step 3（プリミティブ人形）
- ゴール: スマホで開くと床グリッド上にプリミティブ人形が表示され、カメラを操作できる
- 完了ゲート: 実機で3Dビューが滑らかに表示・カメラ操作が快適／人型と認識できる
- 主要ファイル: `three/createScene.ts` `three/createDoll.ts` `components/ThreeViewport.tsx`

### CP2 — 操作（選んで動かせる）

- 含む: Step 4（操作点表示）/ Step 5（ボタン移動）
- ゴール: 操作点をタップ選択し、Up/Down/Left/Right/Forward/Back（カメラ相対, §8.3）で動かせる
- 完了ゲート: 11個の操作点を選択でき、移動量（小中大）切替が効く／選択中の名前が画面に出る
- 主要ファイル: `three/createControlPoints.ts` `components/JointSelector.tsx` `components/MoveControls.tsx` `pose/poseStore.ts`

### CP3 — IK & 制限（自然に曲がる）

- 含む: Step 6（簡易2ボーンIK）/ Step 7（関節制限）
- ゴール: 手首/足首を動かすと腕/脚が追従し、肘/膝が逆曲げしない。パイプライン（§11.5）の順で処理
- 完了ゲート: 腕脚IKが Pole で曲げ方向を制御できる／リーチ・逆曲げ・床貫通の制限が効く
- 主要ファイル: `pose/ikSolver.ts` `pose/jointLimits.ts` `pose/poseValidator.ts`

### CP4 — 構図 & 画像（撮って保存）

- 含む: Step 8（カメラプリセット）/ Step 9（PNG保存）
- ゴール: 4:5/9:16/16:9/1:1 と全身〜バストアップを切替え、PNGを保存できる
- 完了ゲート: 構図プリセットが切替わる／PNGがスマホに保存でき、操作点・グリッドの on/off が効く
- 主要ファイル: `three/cameraPresets.ts` `three/frameGuide.ts` `three/exportCanvas.ts` `components/ExportPanel.tsx`

### CP5 — データ & 配布（再編集・補助文・アプリ化）

- 含む: Step 10（JSON保存/読込）/ Step 11（プロンプトTXT）/ Step 12（PWA）
- ゴール: `.pose.json` で再編集でき、プロンプト補助文を出力、ホーム画面追加に対応
- 完了ゲート: 保存→読込でポーズが完全復元（回転含む, §13.6）／TXT出力・コピー／PWAインストール可
- 主要ファイル: `pose/poseJson.ts` `pose/promptGenerator.ts` `utils/downloadFile.ts` `public/manifest.json`

> CP5 のうち PWA（Step 12）は §23 で「後回し」に分類済み。時間がなければ CP5 を「データ」と「PWA」で2分割してもよい。

---

## 28. セッション運用とドリフト対策（v2.0で追加）

過去に単一巨大ファイルでコンテキストドリフトを起こした反省を踏まえ、以下を徹底する。

### 28.1 基本ルール

- **1セッション = 1チェックポイント。** 終わったら会話をクリアし、新セッションで次CPへ。
- **STATUS.md を毎セッション更新。** 「完成したもの／次にやること／既知の課題」を常に明文化（同梱の `STATUS.md`）。
- **既存ファイルは差分（ターゲット修正）で更新し、全面書き換えはしない。** 動いている箇所を壊さない。
- **1ファイル1責務・目安300行以内。** 超えたら分割（§20の構成を維持）。
- 秘密情報は直書きしない（本ツールは外部API不要だが原則徹底）。
- 大きな仕様変更は、まず本設計書(v2.0)へ追記してから実装する（設計書を唯一の真実に保つ）。

### 28.2 CP着手プロンプトのひな型

各CP冒頭で、設計書とSTATUS.mdを読み込ませた上で以下を使う（CP1の最初だけ §22 の初回依頼文を併用）。

```text
この設計書（…設計書_ClaudeCode版_v2.md）と STATUS.md に従って チェックポイント CPn を実装してください。
- §20 のディレクトリ構成・命名に従う
- §11.5 の処理パイプライン順を守る（入力→リーチ制限→IK→関節制限→検査→反映）
- §6.3 の React×Three.js の注意（描画ループはReact外、状態はZustand橋渡し）を守る
- 既存ファイルは差分で更新し、全面書き換えはしない
- 1ファイル300行を目安に分割し、重要処理に console.log を入れる
- CPn の「完了ゲート」(§27) を満たすこと
完了したら STATUS.md の CPn を done に更新し、実機確認手順(§29)を出力してください。
```

---

## 29. 動作確認チェックリスト（v2.0で追加）

各CP完了時、スマホ実機で確認する。Vite は `--host` で LAN 配信し、同一 Wi-Fi のスマホから `http://<PCのIP>:5173` を開く。

### 共通スモーク

- [ ] スマホで白画面・コンソールエラーなく起動する
- [ ] 縦持ちでレイアウトが崩れない（下部パネルが3Dビューに被りすぎない）
- [ ] 操作に対する体感遅延が許容範囲（発熱・カクつきが過度でない）

### CP別

- [ ] **CP1**: 人形が見える／カメラ回転・ズームが効く／床グリッド表示
- [ ] **CP2**: 11操作点をタップ選択できる／6方向ボタンで動く／移動量小中大が効く
- [ ] **CP3**: 手首/足首移動で腕脚が追従／Poleで曲げ方向が変わる／逆曲げ・リーチ超過・床貫通が抑止される
- [ ] **CP4**: 4:5/9:16/16:9/1:1 が切替わる／PNG保存ができる／操作点・グリッド on/off が反映される
- [ ] **CP5**: JSON保存→読込でポーズ（回転含む）が完全復元／TXT出力・コピー／ホーム画面追加でアプリ起動

問題が出たら、該当CPのセッション内で差分修正する（全CPをやり直さない）。
