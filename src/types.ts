// VRChatの通知情報を格納する型
export interface InviteNotification {
  id: string;                    // 通知のID
  timestamp: string;             // 日時 (例: 2026.02.08 23:09:18)
  username: string;              // ユーザー名
  userId: string;                // ユーザーID
  type: 'invite' | 'requestInvite';  // 種類
  worldName?: string;            // ワールド名 (inviteの場合のみ)
  worldId?: string;              // ワールドID
  instanceId?: string;           // インスタンスID
  message: string;               // メッセージ
}

// 設定の型
export interface Settings {
  logDirectory: string | null;
}

// Electron APIの型定義
export interface ElectronAPI {
  selectLogDirectory: () => Promise<string | null>;
  getSettings: () => Promise<Settings>;
  saveLogDirectory: (directory: string) => Promise<boolean>;
  onNewNotification: (callback: (notification: InviteNotification) => void) => void;
  onCurrentLogFile: (callback: (filePath: string) => void) => void;
  onLogFileSwitched: (callback: (filePath: string) => void) => void;
  openWorldUrl: (worldId: string) => void;
  openInstanceUrl: (worldId: string, instanceId: string) => void;
  openExternal: (url: string) => void;
  openExternal: (url: string) => void;
  onDebugLog: (callback: (message: string) => void) => void;
  sendTestNotification: () => void;
}

// windowオブジェクトにelectronAPIを追加
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
