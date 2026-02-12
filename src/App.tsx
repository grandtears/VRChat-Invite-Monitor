import { useState, useEffect } from 'react';
import { InviteNotification, Settings } from './types';
import { SettingsModal } from './SettingsModal';
import { CreditModal } from './CreditModal';
import './App.css';

function App() {
  const [notifications, setNotifications] = useState<InviteNotification[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [showSwitchNotification, setShowSwitchNotification] = useState(false);
  const [settings, setSettings] = useState<Settings>({ logDirectory: null });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreditOpen, setIsCreditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 起動時に設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electronAPI) {
        console.warn('electronAPI is not available. Running outside of Electron?');
        setIsLoading(false);
        return;
      }

      try {
        const loadedSettings = await window.electronAPI.getSettings();
        setSettings(loadedSettings);

        // 設定がない場合はモーダルを表示
        if (!loadedSettings.logDirectory) {
          setIsSettingsOpen(true);
        } else {
          setSelectedFile(loadedSettings.logDirectory);
          setIsMonitoring(true);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // IPCリスナーを設定
  useEffect(() => {
    if (!window.electronAPI) return;

    // 新しい通知を受け取るリスナーを設定
    window.electronAPI.onNewNotification((notification) => {
      setNotifications((prev) => {
        // IDによる重複チェック（既に同じIDの通知があれば追加しない）
        if (prev.some(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });
      setIsMonitoring(true);
    });

    // 現在のログファイル情報を受け取る
    window.electronAPI.onCurrentLogFile((filePath) => {
      setSelectedFile(filePath);
      setIsMonitoring(true);
    });

    // ログファイル切り替え通知を受け取る
    window.electronAPI.onLogFileSwitched((filePath) => {
      setSelectedFile(filePath);
      setShowSwitchNotification(true);

      setTimeout(() => {
        setShowSwitchNotification(false);
      }, 3000);
    });

    // デバッグログを受け取る
    window.electronAPI.onDebugLog((message) => {
      console.log(`[Main] ${message}`);
    });
  }, []);

  // ワールド名クリック
  const handleWorldClick = (worldId?: string) => {
    if (worldId && window.electronAPI) {
      window.electronAPI.openWorldUrl(worldId);
    }
  };

  // インスタンスIDクリック
  const handleInstanceClick = (worldId?: string, instanceId?: string) => {
    if (worldId && instanceId && window.electronAPI) {
      window.electronAPI.openInstanceUrl(worldId, instanceId);
    }
  };

  // 通知をクリア
  const handleClearNotifications = () => {
    if (window.confirm(`${notifications.length}件の通知をすべて削除しますか？\n\nこの操作は取り消せません。`)) {
      setNotifications([]);
    }
  };

  // 設定を保存
  const handleSaveSettings = async (directory: string) => {
    if (!window.electronAPI) return;

    const success = await window.electronAPI.saveLogDirectory(directory);
    if (success) {
      setSettings({ logDirectory: directory });
      setSelectedFile(directory);
      setIsMonitoring(true);
      setIsSettingsOpen(false);
    }
  };

  // ローディング中
  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-state">
          <p>⏳ 読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>VRChat Invite Monitor</h1>
        <div className="header-controls">
          {notifications.length > 0 && (
            <button onClick={handleClearNotifications} className="btn-secondary">
              🗑️ クリア
            </button>
          )}
          <button onClick={() => setIsSettingsOpen(true)} className="btn-header-item">
            <span className="icon">⚙️</span> 設定
          </button>
          <button onClick={() => setIsCreditOpen(true)} className="btn-header-item">
            <span className="icon">ℹ️</span> クレジット
          </button>
        </div>
      </header>

      <div className="status-bar">
        {selectedFile ? (
          <>
            <span className="status-label">監視中:</span>
            <span className="file-path">{selectedFile}</span>
            {isMonitoring && <span className="status-indicator">🟢</span>}
          </>
        ) : (
          <span className="status-message">設定からログフォルダを選択してください</span>
        )}
      </div>

      {showSwitchNotification && (
        <div className="switch-notification">
          🔄 新しいログファイルに切り替えました
        </div>
      )}

      <div className="content">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <p>� 通知はまだありません</p>
            <p className="help-text">
              VRChatでInviteやRequestInviteを受け取ると、ここに表示されます。
              <br />
              通知はアプリを閉じるまで保持されます。
            </p>
          </div>
        ) : (
          <div className="notifications-list">
            <div className="list-header">
              <span className="col-time">日時</span>
              <span className="col-username">ユーザー名</span>
              <span className="col-type">種類</span>
              <span className="col-world">ワールド名</span>
              <span className="col-instance">インスタンスID</span>
              <span className="col-actions">アクション</span>
            </div>
            {notifications.map((notification) => (
              <div key={notification.id} className="notification-item">
                <span className="col-time">{notification.timestamp}</span>
                <span className="col-username">{notification.username}</span>
                <span className={`col-type badge ${notification.type}`}>
                  {notification.type === 'invite' ? '📨 Invite' : '📧Request'}
                </span>
                <span className="col-world">
                  {notification.worldName ? (
                    <button
                      className="link-button"
                      onClick={() => handleWorldClick(notification.worldId)}
                      title="ワールドページを開く"
                    >
                      {notification.worldName}
                    </button>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </span>
                <span className="col-instance">
                  {notification.instanceId ? (
                    <span>{notification.instanceId.split('~')[0]}</span>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </span>
                <span className="col-actions">
                  {notification.worldId && (
                    <button
                      className="btn-action"
                      onClick={() => handleWorldClick(notification.worldId)}
                      title="ワールドページを開く"
                    >
                      🌐 World
                    </button>
                  )}
                  {notification.worldId && notification.instanceId && (
                    <button
                      className="btn-action"
                      onClick={() => handleInstanceClick(notification.worldId, notification.instanceId)}
                      title="インスタンスに参加"
                    >
                      🚀 Join
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="footer">
        <span>通知数: {notifications.length}</span>
        <span className="footer-hint">💡 通知はアプリを閉じるまで保持されます</span>
      </footer>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      <CreditModal
        isOpen={isCreditOpen}
        onClose={() => setIsCreditOpen(false)}
      />
    </div>
  );
}

export default App;
