# 💑 家族めも

夫婦・家族で共有できる、**リアルタイム同期メモアプリ**です。
片方が書いたメモがもう片方の画面にすぐ反映され、相手の追加はブラウザ通知で知らせます。ディズニー風のキラキラしたUIが特徴の PWA（ホーム画面に追加可能）です。

🔗 公開URL: [memo0901-7138a.web.app](https://memo0901-7138a.web.app)
📦 リポジトリ: [github.com/junia2009/family-memo](https://github.com/junia2009/family-memo)

---

## ✨ 主な機能

### メモ管理

- 📝 **作成・編集・削除** … タイトル・本文を自由に記録
- 📌 **ピン留め** … 大事なメモを一覧の上部に固定表示
- 🎨 **カラーラベル** … 6色（ピンク/レッド/オレンジ/グリーン/ブルー/なし）で色分け
- 📷 **画像添付** … 写真を1枚添付可能。アップロード前にブラウザ側で自動圧縮（最大1280px / JPEG品質75%）

### 表示・絞り込み・並び替え

- 🔍 **検索** … タイトル・本文をキーワードで絞り込み
- 🎨 **カラーフィルター** … 色ごとに表示/非表示をトグル。「なし」（色未設定）も対象。検索と併用可
- ↕️ **並び替え** … 「作成順（新しい順 ↔ 古い順をタップで切替）」と「カラー別」の2種類。フィルターと併用可

### ふたりで使うための機能

- 🔄 **リアルタイム同期** … Firestore の購読で、相手の変更が即座に反映
- 🔔 **ブラウザ通知** … 相手が新しいメモを追加すると通知（自分の端末の追加では通知しない）
- ✅ **既読管理** … 相手のメモを開くと既読に。ふたりとも既読で ✅、未読は赤バッジ＋ドットで表示
- 👩👨 **投稿者表示** … 「あや」「りょう」をアイコン付きで識別

### その他

- 🔑 **2通りのログイン** … 共有パスコード（匿名認証）または Google ログイン
- 📱 **PWA対応** … ホーム画面に追加してアプリのように起動・オフラインキャッシュ
- 🎀 **演出** … キラキラの浮遊アニメーション、空状態のアニメーションなど

---

## 🛠 技術構成

| 区分 | 使用技術 |
| --- | --- |
| フロントエンド | React 18 + Vite 5 |
| バックエンド | Firebase（Firestore / Authentication / Storage） |
| ホスティング | Firebase Hosting |
| PWA | vite-plugin-pwa + Workbox |

### ディレクトリ構成

```
memo-app/
├── src/
│   ├── App.jsx                 … 認証状態の管理・画面の出し分け
│   ├── firebase.js             … Firebase 初期化
│   ├── sw.js                   … Service Worker（PWA / キャッシュ）
│   └── components/
│       ├── Login.jsx           … ログイン画面（パスコード / Google）
│       ├── UserSelect.jsx      … あや / りょう の選択
│       ├── MemoList.jsx        … メモ一覧・リアルタイム購読・通知・既読（中核）
│       ├── MemoItem.jsx        … 一覧の各メモカード
│       ├── MemoForm.jsx        … メモ作成・編集フォーム（画像圧縮含む）
│       └── MemoDetail.jsx      … メモ詳細表示
├── firebase.json               … Hosting / Firestore / Storage の設定
├── firestore.rules             … Firestore セキュリティルール
├── storage.rules               … Storage セキュリティルール
└── vite.config.js              … Vite + PWA 設定
```

### 画面フロー

```
ログイン（パスコード or Google）
   ↓
ユーザー選択（あや / りょう）   ※Googleは初回のみ。以降は記憶
   ↓
メモ一覧（作成・編集・検索・リアルタイム同期）
```

### データモデル（Firestore）

- `memos/{memoId}` … メモ本体
  - `title`, `content`, `pinned`, `color`, `imageUrls`（添付画像URLの配列）
  - `author`（投稿者名）, `deviceId`（通知の自己判定用）
  - `readBy`（既読ユーザー名の配列）
  - `createdAt`, `updatedAt`
- `userProfiles/{uid}` … Google ログインユーザーの表示名

画像は Storage の `memos/{memoId}/images/{imageId}` に保存されます（1メモに複数枚添付可能）。
旧形式の単一画像（`imageUrl` フィールド / `memos/{memoId}/image`）も表示時に自動で読み込まれます。

---

## 🚀 セットアップ

### 1. Firebase プロジェクトを準備

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. **Firestore Database** を有効化（本番モード / asia-northeast1 推奨）
3. **Authentication** で「匿名」と「Google」を有効化
4. **Storage** を有効化（画像添付に必要）
5. 「プロジェクトの設定」→ Webアプリを追加し、`firebaseConfig` の値を控える

### 2. 環境変数を設定

`.env.example` を `.env.local` にコピーして値を入力します。

```bash
copy .env.example .env.local   # Windows
```

```
VITE_APP_PASSCODE=家族で決めたパスコード

VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxxxxxxxx
```

> ⚠️ `.env.local` はパスコードを含むため `.gitignore` で除外されています。リポジトリにはコミットされません。

### 3. 依存をインストールして起動

```bash
npm install
npm run dev
```

ブラウザで [localhost:5173](http://localhost:5173) を開くと使えます。

---

## 📦 ビルドとデプロイ

```bash
# 1. 本番用にビルド（src/ → dist/）
npm run build

# 2. Firebase へデプロイ（Hosting + Firestore/Storage ルール）
firebase deploy
```

デプロイ後の URL（例: `https://your-project.web.app`）を開けば、どの端末からでも利用できます。

### 一部だけ反映したい場合

```bash
firebase deploy --only hosting     # アプリ本体だけ
firebase deploy --only firestore   # Firestore ルールだけ
firebase deploy --only storage     # Storage ルールだけ
```

---

## 🔐 セキュリティについて

- メモ（`memos`）はログイン済みであれば読み書き可能なルールです。**全ログインユーザーで1つのメモ空間を共有**する設計のため、家族・ペア単位での利用を想定しています。
- パスコードはビルド後の JavaScript に含まれます。家族間の利用を前提とした割り切りであり、厳格なセキュリティが必要な場合は Firebase Authentication（メール/パスワード）への切り替えを検討してください。
- ブラウザ通知はブラウザの通知許可が必要です（初回アクセス時に確認されます）。

---

## 💻 スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動（ホットリロード） |
| `npm run build` | 本番ビルド（`dist/` を生成） |
| `npm run preview` | ビルド結果をローカルで確認 |
| `firebase deploy` | Firebase へデプロイ |
