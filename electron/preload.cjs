const { contextBridge, ipcRenderer } = require('electron');

// セキュアにAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
    // ログディレクトリ選択
    selectLogDirectory: () => ipcRenderer.invoke('select-log-directory'),

    // 設定を取得
    getSettings: () => ipcRenderer.invoke('get-settings'),

    // ログディレクトリを保存
    saveLogDirectory: (directory) => ipcRenderer.invoke('save-log-directory', directory),

    // 新しい通知を受け取る
    onNewNotification: (callback) => {
        ipcRenderer.on('new-notification', (_, notification) => callback(notification));
    },

    // 現在のログファイル情報を受け取る
    onCurrentLogFile: (callback) => {
        ipcRenderer.on('current-log-file', (_, filePath) => callback(filePath));
    },

    // ログファイル切り替え通知を受け取る
    onLogFileSwitched: (callback) => {
        ipcRenderer.on('log-file-switched', (_, filePath) => callback(filePath));
    },

    // ワールドURLを開く
    openWorldUrl: (worldId) => {
        ipcRenderer.send('open-world-url', worldId);
    },

    // インスタンスURLを開く
    openInstanceUrl: (worldId, instanceId) => {
        ipcRenderer.send('open-instance-url', worldId, instanceId);
    },

    // 外部URLを開く
    openExternal: (url) => {
        ipcRenderer.send('open-external', url);
    },

    // デバッグログを受け取る
    onDebugLog: (callback) => {
        ipcRenderer.on('debug-log', (_, message) => callback(message));
    },

    // テスト通知を送信する
    sendTestNotification: () => {
        ipcRenderer.send('debug-test-notification');
    }
});
