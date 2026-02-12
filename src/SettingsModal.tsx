import { useState } from 'react';
import { Settings } from './types';

interface SettingsModalProps {
    isOpen: boolean;
    settings: Settings;
    onClose: () => void;
    onSave: (directory: string) => void;
}

export function SettingsModal({ isOpen, settings, onClose, onSave }: SettingsModalProps) {
    const [selectedDirectory, setSelectedDirectory] = useState<string | null>(settings.logDirectory);
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSelectDirectory = async () => {
        if (!window.electronAPI) return;

        try {
            const directory = await window.electronAPI.selectLogDirectory();
            if (directory) {
                setSelectedDirectory(directory);
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedDirectory) return;

        setIsSaving(true);
        try {
            onSave(selectedDirectory);
        } finally {
            setIsSaving(false);
        }
    };

    const canClose = settings.logDirectory !== null;
    const canSave = selectedDirectory !== null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>⚙️ 設定</h2>
                    {canClose && (
                        <button className="modal-close" onClick={onClose}>×</button>
                    )}
                </div>

                <div className="modal-body">
                    <div className="setting-item">
                        <label>VRChatログフォルダ</label>
                        <p className="setting-description">
                            VRChatのログファイルが保存されているフォルダを選択してください。
                            <br />
                            通常は <code>%USERPROFILE%\AppData\LocalLow\VRChat\VRChat</code> です。
                        </p>

                        <div className="setting-input-group">
                            <input
                                type="text"
                                value={selectedDirectory || ''}
                                onChange={(e) => setSelectedDirectory(e.target.value)}
                                placeholder="フォルダを選択してください"
                                className="setting-input"
                            />
                            <button
                                onClick={handleSelectDirectory}
                                className="btn-primary"
                            >
                                📁 選択
                            </button>
                        </div>
                    </div>

                    {!settings.logDirectory && (
                        <div className="setting-notice">
                            ⚠️ ログフォルダを設定するまでアプリを使用できません。
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {canClose && (
                        <button className="btn-secondary" onClick={onClose}>
                            キャンセル
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                    >
                        {isSaving ? '保存中...' : '💾 保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}
