import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as chokidar from 'chokidar';
import { spawn, ChildProcess, execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ESモジュール用の__dirname定義
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let logWatcher: chokidar.FSWatcher | null = null;
let directoryWatcher: chokidar.FSWatcher | null = null;
let currentLogFile: string | null = null;
let lastFileSize = 0;
let honoServerProcess: ChildProcess | null = null;

const HONO_SERVER_PORT = 3737;
// ログファイル名のパターン（より柔軟にマッチさせる）
const VRC_LOG_PATTERN = /^output_log_.*\.txt$/;

// 設定関連
interface Settings {
  logDirectory: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  logDirectory: null,
};

function getSettingsPath(): string {
  // exeと同じディレクトリに設定ファイルを保存（ポータブル対応）
  const exeDir = app.isPackaged
    ? path.dirname(app.getPath('exe'))
    : app.getAppPath();
  return path.join(exeDir, 'settings.json');
}

function loadSettings(): Settings {
  try {
    const settingsPath = getSettingsPath();
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: Settings): boolean {
  try {
    const settingsPath = getSettingsPath();
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('Settings saved to:', settingsPath);
    return true;
  } catch (error) {
    console.error('Failed to save settings:', error);
    return false;
  }
}

let currentSettings: Settings = DEFAULT_SETTINGS;

// ディレクトリ内の最新ログファイルを取得
function getLatestLogFile(directory: string): string | null {
  try {
    const files = fs.readdirSync(directory);

    // デバッグ: ファイル名とマッチ結果を確認（最初の3件）

    const logFiles = files
      .filter(file => VRC_LOG_PATTERN.test(file))
      .map(file => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);
        return {
          path: filePath,
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // 新しい順にソート

    if (logFiles.length > 0) {
      sendDebugLog(`Latest log file found: ${logFiles[0].path}`);
      return logFiles[0].path;
    } else {
      sendDebugLog('No matching log files found.');
    }

    return null;
  } catch (error) {
    console.error('Error reading log directory:', error);
    sendDebugLog(`Error reading log directory: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

// Honoサーバーを起動
function startHonoServer() {
  return new Promise<void>((resolve, reject) => {
    console.log('Starting Hono server...');

    // 開発環境と本番環境で異なるサーバーパスを使用
    const serverPath = process.env.NODE_ENV === 'development'
      ? path.join(__dirname, '../server/index.ts')
      : path.join(__dirname, '../server/index.js');

    // コマンドの決定
    let command = 'node';
    let args = [serverPath];

    if (process.env.NODE_ENV === 'development') {
      // Windows環境でのtsxのパス解決
      command = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
      args = [serverPath];
    }

    console.log(`Spawning server with command: ${command} ${args.join(' ')}`);

    honoServerProcess = spawn(command, args, {
      shell: true,
      env: { ...process.env, PORT: HONO_SERVER_PORT.toString() }
      // stdio: 'inherit' は削除し、デフォルトのpipeを使用
    });

    if (honoServerProcess.stdout) {
      honoServerProcess.stdout.on('data', (data) => {
        console.log(`[Hono] ${data.toString().trim()}`);
      });
    }

    if (honoServerProcess.stderr) {
      honoServerProcess.stderr.on('data', (data) => {
        console.error(`[Hono Error] ${data.toString().trim()}`);
      });
    }

    honoServerProcess.on('error', (error) => {
      console.error('Failed to start Hono server:', error);
    });

    // サーバーが起動するまで少し待つ
    setTimeout(() => {
      console.log(`Hono server startup wait finished. Assuming running on http://localhost:${HONO_SERVER_PORT}`);
      resolve();
    }, 2000);
  });
}

// Honoサーバーを停止
function stopHonoServer() {
  if (honoServerProcess && honoServerProcess.pid) {
    console.log('Stopping Hono server...');
    try {
      if (process.platform === 'win32') {
        // Windowsの場合はtaskkillでプロセスツリーごと強制終了
        execSync(`taskkill /pid ${honoServerProcess.pid} /T /F`);
      } else {
        honoServerProcess.kill();
      }
    } catch (e) {
      console.log('Failed to kill Hono server (maybe already dead):', e);
    }
    honoServerProcess = null;
  }
}

// プロセス終了時のクリーンアップ
app.on('will-quit', stopHonoServer);

process.on('SIGINT', () => {
  stopHonoServer();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopHonoServer();
  process.exit(0);
});

// ログファイルからInvite/RequestInviteをパースする関数
async function parseNotification(logLine: string) {
  // 正規表現でログ行を解析
  const notificationMatch = logLine.match(
    /^(\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}:\d{2}).*Received Notification:.*username:([^,]+).*user id:([^,\s]+).*type:\s*(invite|requestInvite).*id:\s*([^,\s]+).*created at: ([^,]+).*details:\s*\{\{(.*?)\}\}/
  );

  if (!notificationMatch) {
    // デバッグ用
    if (logLine.includes('Received Notification') && (logLine.includes('type: invite') || logLine.includes('type: requestInvite'))) {
      console.log('Failed to match log line:', logLine);
    }
    return null;
  }

  const [, timestamp, username, userId, type, notificationId, createdAt, details] = notificationMatch;

  // ワールド情報を抽出（inviteの場合のみ）
  let worldName: string | undefined;
  let worldId: string | undefined;
  let instanceId: string | undefined;

  if (type === 'invite' && details) {
    const worldIdMatch = details.match(/worldId=([^:,]+)/);
    const instanceMatch = details.match(/worldId=[^:]+:([^,]+)/);
    const worldNameMatch = details.match(/worldName=([^}]+)/);

    if (worldIdMatch) worldId = worldIdMatch[1];
    if (instanceMatch) instanceId = instanceMatch[1];
    if (worldNameMatch) {
      worldName = worldNameMatch[1];
    } else if (worldId) {
      // ワールド名がログにない場合、Honoサーバー経由でVRChat APIから取得
      try {
        const response = await fetch(`http://localhost:${HONO_SERVER_PORT}/api/world/${worldId}`);
        if (response.ok) {
          const worldInfo = await response.json();
          worldName = worldInfo.name;
          console.log(`Fetched world name from API: ${worldName}`);
        }
      } catch (error) {
        console.error('Failed to fetch world name from API:', error);
        // フォールバック: ワールドIDをそのまま表示
        worldName = worldId;
      }
    }
  }

  return {
    id: notificationId,
    timestamp,
    username,
    userId,
    type: type as 'invite' | 'requestInvite',
    worldName,
    worldId,
    instanceId,
    message: ''
  };
}

// デバッグログを送信するヘルパー関数
function sendDebugLog(message: string) {
  console.log(message);
  if (mainWindow) {
    mainWindow.webContents.send('debug-log', message);
  }
}

// ログファイルを監視する関数
function watchLogFile(filePath: string) {
  // 既存のWatcherがあれば停止
  if (logWatcher) {
    logWatcher.close();
  }

  // 現在のログファイルを更新
  currentLogFile = filePath;

  // ファイルの現在のサイズを取得
  try {
    const stats = fs.statSync(filePath);
    lastFileSize = stats.size;
    sendDebugLog(`Watching log file: ${filePath} (Size: ${lastFileSize})`);
  } catch (e) {
    console.error('Failed to stat log file:', e);
  }

  // UIに現在のファイルを通知
  if (mainWindow) {
    mainWindow.webContents.send('current-log-file', filePath);
  }

  // chokidarでファイル変更を監視
  logWatcher = chokidar.watch(filePath, {
    persistent: true,
    usePolling: true,  // Windowsでの安定性のため
    interval: 1000     // 1秒ごとにチェック
  });

  logWatcher.on('change', () => {
    try {
      const currentStats = fs.statSync(filePath);
      const currentSize = currentStats.size;

      // ファイルサイズが増えている場合のみ処理
      if (currentSize > lastFileSize) {
        // 新しく追加された部分だけを読み込む
        const stream = fs.createReadStream(filePath, {
          start: lastFileSize,
          end: currentSize,
          encoding: 'utf-8'
        });

        let buffer = '';
        stream.on('data', async (chunk) => {
          buffer += chunk;
          const lines = buffer.split('\n');

          // 最後の行は不完全な可能性があるので保持
          buffer = lines.pop() || '';

          // 各行を処理
          for (const line of lines) {
            if (line.includes('Received Notification')) {
              sendDebugLog(`Found notification line: ${line}`);
            }

            if (line.includes('Received Notification') &&
              (line.includes('type: invite') || line.includes('type: requestInvite'))) {
              const notification = await parseNotification(line);
              if (notification && mainWindow) {
                sendDebugLog(`Sending notification to renderer: ${JSON.stringify(notification)}`);
                // レンダラープロセスに通知を送信
                mainWindow.webContents.send('new-notification', notification);
              } else if (!notification) {
                sendDebugLog('Notification parsed but returned null (match failed?)');
              }
            }
          }
        });

        stream.on('end', () => {
          lastFileSize = currentSize;
        });
      }
    } catch (error) {
      console.error('Error reading log file:', error);
      sendDebugLog(`Error reading log file: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}

// ディレクトリ全体を監視して、新しいログファイルが作成されたら自動切り替え
function watchLogDirectory(directory: string) {
  // 既存のディレクトリWatcherがあれば停止
  if (directoryWatcher) {
    directoryWatcher.close();
  }

  console.log(`Watching log directory: ${directory}`);

  // 最初に最新のログファイルを監視開始
  const latestFile = getLatestLogFile(directory);
  if (latestFile) {
    watchLogFile(latestFile);
  }

  // ディレクトリ内の新規ファイル作成を監視
  directoryWatcher = chokidar.watch(path.join(directory, 'output_log_*.txt'), {
    persistent: true,
    usePolling: true,
    interval: 2000,  // 2秒ごとにチェック
    ignoreInitial: true  // 既存ファイルは無視
  });

  directoryWatcher.on('add', (filePath) => {
    console.log(`New log file detected: ${filePath}`);

    // 新しいファイルが作成されたら、そちらに切り替え
    if (VRC_LOG_PATTERN.test(path.basename(filePath))) {
      console.log(`Switching to new log file: ${filePath}`);
      watchLogFile(filePath);

      // UIに通知
      if (mainWindow) {
        mainWindow.webContents.send('log-file-switched', filePath);
      }
    }
  });
}

// メインウィンドウを作成
function createWindow() {
  const preloadPath = path.join(__dirname, '../electron/preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (logWatcher) {
      logWatcher.close();
    }
    if (directoryWatcher) {
      directoryWatcher.close();
    }
    stopHonoServer();
  });

  // 右クリックコンテキストメニュー
  mainWindow.webContents.on('context-menu', (_, params) => {
    const menu = Menu.buildFromTemplate([
      { role: 'undo', label: '元に戻す' },
      { role: 'redo', label: 'やり直し' },
      { type: 'separator' },
      { role: 'cut', label: '切り取り' },
      { role: 'copy', label: 'コピー' },
      { role: 'paste', label: '貼り付け' },
      { type: 'separator' },
      { role: 'selectAll', label: 'すべて選択' }
    ]);
    menu.popup();
  });
}

// アプリケーション起動
app.whenReady().then(async () => {
  // 設定を読み込み
  currentSettings = loadSettings();
  console.log('Settings loaded:', currentSettings);

  // Honoサーバーを起動
  try {
    await startHonoServer();
    console.log('Hono server startup sequence completed');
  } catch (error) {
    console.error('Failed to start Hono server, continuing without it:', error);
  }

  createWindow();

  // 保存されたログディレクトリがあれば自動監視開始
  console.log('Checking log directory configuration...');
  if (currentSettings.logDirectory) {
    const exists = fs.existsSync(currentSettings.logDirectory);
    console.log(`Log directory path: "${currentSettings.logDirectory}"`);
    console.log(`Directory exists: ${exists}`);

    if (exists) {
      console.log('Auto-starting log monitoring for:', currentSettings.logDirectory);
      watchLogDirectory(currentSettings.logDirectory);
    } else {
      console.error('Log directory does not exist or is not accessible.');
    }
  } else {
    console.log('No log directory configured.');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Honoサーバーを停止
  stopHonoServer();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC通信: ログファイル選択ダイアログ
ipcMain.handle('select-log-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Log Files', extensions: ['txt', 'log'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'VRChatログファイルを選択',
    defaultPath: path.join(
      app.getPath('home'),
      'AppData/LocalLow/VRChat/VRChat'
    )
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    const directory = path.dirname(filePath);

    // ディレクトリ全体を監視（新しいファイルも自動追跡）
    watchLogDirectory(directory);

    return filePath;
  }

  return null;
});

// IPC通信: ディレクトリ選択（推奨）
ipcMain.handle('select-log-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'VRChatログフォルダを選択',
    defaultPath: path.join(
      app.getPath('home'),
      'AppData/LocalLow/VRChat/VRChat'
    )
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const directory = result.filePaths[0];

    // ディレクトリ全体を監視
    watchLogDirectory(directory);

    return directory;
  }

  return null;
});

// IPC通信: ワールドURLを開く
ipcMain.on('open-world-url', (_, worldId: string) => {
  shell.openExternal(`https://vrchat.com/home/world/${worldId}`);
});

// IPC通信: インスタンスURLを開く
ipcMain.on('open-instance-url', (_, worldId: string, instanceId: string) => {
  shell.openExternal(`https://vrchat.com/home/launch?worldId=${worldId}&instanceId=${instanceId}`);
});

// IPC通信: 外部URLを開く
ipcMain.on('open-external', (_, url: string) => {
  shell.openExternal(url);
});

// IPC通信: 設定を取得
ipcMain.handle('get-settings', () => {
  return currentSettings;
});

// IPC通信: ログディレクトリを保存して監視開始
ipcMain.handle('save-log-directory', async (_, directory: string) => {
  currentSettings.logDirectory = directory;
  const success = saveSettings(currentSettings);

  if (success && fs.existsSync(directory)) {
    watchLogDirectory(directory);
  }

  return success;
});
