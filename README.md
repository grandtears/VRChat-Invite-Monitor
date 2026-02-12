
# VRChat Invite Monitor

VRChatのログファイルをリアルタイムで監視し、受信した **Invite（招待）** や **Request Invite（招待リクエスト）** を検知して一覧表示するWindows用デスクトップアプリケーションです。
ポータブルアプリケーションとして設計されており、インストール不要で `.exe` ファイル単体で動作します。

![Screenshot](docs/screenshot.png)

## 使い方

1. [Releases](https://github.com/Sonoty/VRChatInviteMonitor/releases) ページから最新の `.exe` をダウンロードします。
2. ダウンロードしたファイルを実行します。
3. VRChatをプレイすると、自動的に通知が検知・表示されます。
   （初回起動時にログフォルダを自動検出します）

## 技術仕様 (Technical Specifications)

本アプリケーションは、ElectronとWeb技術をベースにしたモダンなデスクトップアプリケーションとして開発されています。

### アーキテクチャ構成
- **Frontend**: React, TypeScript, Vite
- **Backend (Electron Main)**: Electron, Node.js (fs, chokidar)
- **API Server**: Hono (VRChat APIとの通信用プロキシ)

アプリ内でHonoサーバーを立ち上げ、VRChat APIへのリクエストをプロキシすることで、CORS問題を回避しつつ安全に通信を行います。

## 開発者向け (Development)

ソースコードからビルドする場合の手順です。

### ビルド方法

```bash
# 依存関係インストール
npm install

# 開発モード起動
npm run dev

# アプリケーションのビルド
npm run build
```

ビルド成果物は `dist/\win-unpacked` フォルダ（ポータブル実行ファイル）またはインストーラーとして出力されます。

## ライセンス (License)

本ソフトウェアは [MIT License](LICENSE) の下で公開されています。

Copyright (c) 2026 Sonoty
