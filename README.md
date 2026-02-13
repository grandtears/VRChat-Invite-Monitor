
# VRChat Invite Monitor

VRChatのログファイルをリアルタイムで監視し、受信した **Invite（招待）** や **Request Invite（招待リクエスト）** を検知して一覧表示するWindows用デスクトップアプリケーションです。
ポータブルアプリケーションとして設計されており、インストール不要で `.exe` ファイル単体で動作します。

![Screenshot](docs/screenshot.png)

## 主な機能

- 📨 **Invite / Request Invite の自動検知** — VRChatログファイルをリアルタイム監視
- 🌐 **ワールド情報の表示** — VRChat APIと連携してワールド名を自動取得
- 🚀 **ワンクリック参加** — ワールドページを開く・インスタンスに直接参加
- 🔄 **ログファイル自動切替** — VRChat再起動時に新しいログへ自動追従
- ⚙️ **設定の永続化** — ログフォルダの設定を自動保存

## 使い方

1. [Releases](https://github.com/Sonoty/VRChatInviteMonitor/releases) ページから最新の `.exe` をダウンロードします。
2. ダウンロードしたファイルを実行します。
3. 初回起動時にVRChatのログフォルダを選択します。
4. VRChatをプレイすると、自動的に通知が検知・表示されます。

> **Note**: インストール不要です。`.exe` ファイルをそのまま実行してください。

## 技術仕様

### アーキテクチャ構成
- **Frontend**: React, TypeScript, Vite
- **Backend (Electron Main)**: Electron, Node.js (fs, chokidar)
- **API Server**: Hono (VRChat APIとの通信用プロキシ)

アプリ内でHonoサーバーを起動し、VRChat APIへのリクエストをプロキシすることで、CORS問題を回避しつつ安全に通信を行います。

### ビルド構成

- **Electron Main Process**: `vite-plugin-electron` によりバンドル（依存関係を含む）
- **API Server**: `esbuild` により単一ファイルにバンドル
- **パッケージング**: `electron-builder` でポータブル `.exe` として出力

## 開発者向け

ソースコードからビルドする場合の手順です。

### 前提条件

- Node.js v20+
- npm

### セットアップ

```bash
# 依存関係インストール
npm install

# 開発モード起動
npm run dev

# ビルド & パッケージング（exe生成）
npm run package
```

ビルド成果物は `release/` フォルダにポータブル実行ファイルとして出力されます。

## ライセンス

本ソフトウェアは [MIT License](LICENSE) の下で公開されています。

Copyright (c) 2026 Sonoty
