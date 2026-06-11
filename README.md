# 💑 ふたりのメモ

夫婦で共有できるリアルタイム同期メモアプリです。

## 機能

- 📝 メモの作成・編集・削除
- 🔄 リアルタイム同期（片方が書いたらもう片方の画面にすぐ反映）
- 🔔 相手がメモを追加したらブラウザ通知
- 📌 ピン留め機能
- 🔑 共有パスコードでログイン

## セットアップ手順

### 1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを作成」をクリック、プロジェクト名を入力
3. Google アナリティクスは不要なのでオフでOK

### 2. Firestore Database を有効化

1. 左メニュー「Firestore Database」をクリック
2. 「データベースの作成」→「本番環境モードで開始」→「asia-northeast1（東京）」を選択
3. 作成後、「ルール」タブを開き、以下のルールをコピー&ペーストして「公開」

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /memos/{memoId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. 匿名認証を有効化

1. 左メニュー「Authentication」をクリック
2. 「始める」→「ログイン方法」タブ
3. 「匿名」を有効化して保存

### 4. Web アプリを追加して設定をコピー

1. Firebase Console の「プロジェクトの設定」（歯車アイコン）を開く
2. 「マイアプリ」セクションの「</>」（Webアプリ）をクリック
3. アプリ名を入力して「アプリを登録」
4. 表示される `firebaseConfig` の各値をメモしておく

### 5. 環境変数を設定

`.env.example` を `.env.local` としてコピーし、値を入力：

```bash
# Windows の場合
copy .env.example .env.local
```

`.env.local` を以下のように編集：

```
VITE_APP_PASSCODE=夫婦で決めたパスコード（例: 1234）

VITE_FIREBASE_API_KEY=xxxxxxxxxxxxxxx
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:xxxxxxxxx
```

### 6. 起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開くと使えます。

## 2台の端末で使う方法

### ローカル（同じ Wi-Fi）で使う場合

```bash
# ネットワーク上のIPアドレスを確認
ipconfig
# 例: 192.168.1.10

# Vite を --host オプションで起動
npm run dev -- --host
```

もう一台の端末から `http://192.168.1.10:5173` にアクセスすれば使えます。

### インターネット越しで使う場合（Firebaseホスティング）

```bash
npm run build
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

デプロイ完了後に表示される URL（例: https://your-project.web.app）を2台で開けばどこからでも使えます。

## 注意事項

- パスコードはビルドされたJavaScriptに含まれます。家族間の使用を想定しており、セキュリティが重要な場合はFirebase Authentication（メール/パスワード）への切り替えを検討してください。
- ブラウザ通知はブラウザの通知許可が必要です（初回アクセス時に許可を求めます）。
