# AI Pose Doll Mobile

スマホ優先の AI画像生成用 3Dポーズ人形ツール。
スマホ上で 3D人形を動かしてポーズ・構図を作り、画像生成AI に渡す **PNG** と再編集用の **`.pose.json`** を出力する Webアプリです。

> 設計の正本は [`AI_Pose_Doll_Mobile_設計書_ClaudeCode版_v2.md`](AI_Pose_Doll_Mobile_設計書_ClaudeCode版_v2.md)。
> 進捗は [`STATUS.md`](STATUS.md) を参照（チェックポイント CP1〜CP5）。

## 技術構成

Vite + React + TypeScript + Three.js + Zustand + Tailwind CSS（設計書 §6）。

## セットアップ

Node.js 18 以上（推奨 20+）が必要です。

```bash
npm install
```

## 起動（PCブラウザ）

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開きます。

## スマホ実機で確認する（同一 Wi-Fi）

1. PC とスマホを同じ Wi-Fi に接続する。
2. LAN 配信で起動する:

   ```bash
   npm run host
   ```

3. ターミナルに表示される `Network: http://<PCのIP>:5173/` をスマホのブラウザで開く。
   - Windows で IP が分からない場合は `ipconfig` の IPv4 アドレスを確認。
   - 繋がらない場合は PC のファイアウォールで Node / 5173 番ポートを許可する。

## ビルド

```bash
npm run build
npm run preview   # ビルド結果を確認（--host 付き）
```

## PC不要で使う（無料ネット公開）

PC やローカルサーバーなしで、**スマホからURLでいつでも開ける**ようにする方法。
本アプリはバックエンド不要の静的サイトなので、`dist` を無料の静的ホスティングに置くだけで公開できます。

> 画面つきの手順書: [`ネット公開手順.png`](ネット公開手順.png)（`scripts/make-deploy-guide.ps1` で再生成可）

### いちばん簡単（Netlify Drop・Gitもコマンドも不要）

1. `npm run build` で `dist` フォルダを作る。
2. PCのブラウザで <https://app.netlify.com/drop> を開く（無料登録/ログイン）。
3. `dist` フォルダをページにドラッグ&ドロップ → 数十秒で `https://〇〇〇.netlify.app` が発行。
4. その URL をスマホのブラウザで開く。以後 **PC・自宅Wi-Fi は不要**。
5. （任意）スマホでホーム画面に追加 → アプリ風起動・2回目以降はオフライン可（PWA）。
6. 更新時は再度 `npm run build` → 対象サイトの **Deploys** に `dist` を再ドロップ（URLそのまま）。

`netlify.toml`（ビルド設定＋SPAフォールバック）と `public/_redirects` を同梱済み。
Git 連携でデプロイする場合は publish=`dist` / build=`npm run build` が自動適用されます。

### GitHub Pages で公開する場合（push で自動デプロイ）

> 画面つきの手順書: [`GitHub公開手順.png`](GitHub公開手順.png)（`scripts/make-github-guide.ps1` で再生成可）

ビルドは相対パス（`base: './'`、`vite.config.ts`）なので、**サブパス配信の
プロジェクトサイト `https://<user>.github.io/<repo>/` でも `base` 変更なしで動きます**。

1. GitHub で新規リポジトリを作成（Public 推奨：無料で Pages が使える）。
2. このフォルダを push する:

   ```bash
   git init
   git add .
   git commit -m "first"
   git branch -M main
   git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
   git push -u origin main
   ```

3. リポジトリの **Settings → Pages → Source** を **「GitHub Actions」** に設定。
4. `main` に push すると同梱の [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) が
   自動でビルド＆デプロイ。**Actions** タブで成功を確認。
5. `https://<ユーザー名>.github.io/<リポジトリ名>/` をスマホで開く。以後 PC・Wi-Fi 不要。
6. 更新はコードを直して `git push` するだけ（自動で再デプロイ・URLそのまま）。

> 注: 無料プランの Pages は **Public リポジトリ**が対象。Private は有料プランが必要。

### その他のホスティング

Netlify / Cloudflare Pages / Vercel もルート配信で `base` 変更なしに動きます
（`netlify.toml` と `public/_redirects` 同梱）。

## 操作の方針（設計書 §8）

スマホでの 3D 直接ドラッグは難しいため、**操作点をタップ選択 → 下部パネルのボタンで移動** を基本にします（CP2 以降）。
カメラは画面のドラッグ／ピンチで回転・ズームできます。

## 現在の状態（MVP 一通り実装済み・CP1〜CP5）

- 床グリッド上にプリミティブ人形を表示、カメラ回転・ズーム（OrbitControls）
- 操作点をタップ選択 →（Move）カメラ相対の6方向ボタンで移動、移動量 小中大
- 手首/足首を動かすと簡易2ボーンIKで腕脚が追従、Poleで曲げ方向を制御
- リーチ/逆曲げ/床貫通の制限、重心などの警告（Check）
- 回転（Rotate: 頭/胸/腰/手首/足首の Pitch/Yaw/Roll）
- 構図（Camera: 4:5 / 9:16 / 16:9 / 1:1 と 全身〜バストアップ等の視点）
- 出力（Export: PNG / 再編集用 .pose.json 保存・読込 / プロンプトTXT 保存・コピー）
- PWA（ホーム画面追加・最小オフライン対応）

### 操作タブ

`Pose`（リセット・表示切替）/ `Move` / `Rotate` / `Camera` / `Export` / `Check`

### まだ無い / 後回し（設計書 §23）

Pose プリセット（T-Pose 等）、OpenPose風出力、写真からのポーズ抽出、複数キャラ、GLB/VRM。

> 実機（スマホ）での体感・発熱は未確認。`npm run host` で確認してください。

## pose.json の回転仕様（設計書 §13.6）

- `rotations` は各操作点（head / chest / pelvis / 手首 / 足首）のオイラー角。
- **単位は度**、順序は **XYZ 固定**（`[pitch(x), yaw(y), roll(z)]`、R = Rz·Ry·Rx で X を最初に適用）。
- 真実は無回転の関節座標＋この回転＋Pole＋体型＋カメラ。読込時に従属点を IK で再計算し、回転は表示用に重ねる（座標へは焼き込まない）。
- 旧版 `0.1.0`（rotations 無し）は全回転 0 として読み込む（migration）。

## ディレクトリ構成

設計書 §20 に準拠（`components/` `three/` `pose/` `utils/`）。1ファイル1責務・300行目安。
