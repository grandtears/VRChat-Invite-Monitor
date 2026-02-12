import { contextBridge, ipcRenderer } from 'electron';
import { InviteNotification, Settings } from '../src/types';

// セキュアにAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // ログディレクトリ選択
  selectLogDirectory: () => ipcRenderer.invoke('select-log-directory'),

  // 設定を取得
  getSettings: () => ipcRenderer.invoke('get-settings'),

  // ログディレクトリを保存
  saveLogDirectory: (directory: string) => ipcRenderer.invoke('save-log-directory', directory),

  // 新しい通知を受け取る
  onNewNotification: (callback: (notification: InviteNotification) => void) => {
    ipcRenderer.on('new-notification', (_, notification) => callback(notification));
  },

  // 現在のログファイル情報を受け取る
  onCurrentLogFile: (callback: (filePath: string) => void) => {
    ipcRenderer.on('current-log-file', (_, filePath) => callback(filePath));
  },

  // ログファイル切り替え通知を受け取る
  onLogFileSwitched: (callback: (filePath: string) => void) => {
    ipcRenderer.on('log-file-switched', (_, filePath) => callback(filePath));
  },

  // ワールドURLを開く
  openWorldUrl: (worldId: string) => {
    ipcRenderer.send('open-world-url', worldId);
  },

  // インスタンスURLを開く
  openInstanceUrl: (worldId: string, instanceId: string) => {
    ipcRenderer.send('open-instance-url', worldId, instanceId);
  }
});
