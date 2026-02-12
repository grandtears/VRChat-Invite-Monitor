import React from 'react';
import './CreditModal.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const CreditModal: React.FC<Props> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const handleOpenLink = (url: string) => {
        if (window.electronAPI) {
            window.electronAPI.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content credit-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-body credit-body">
                    <h2 className="app-title">VRChat Invite Monitor</h2>
                    <p className="app-version">Version 1.0.0</p>

                    <div className="credit-section">
                        <p>Circle: Last Memories</p>
                        <p>Developer: Sonoty</p>
                    </div>

                    <div className="social-links">
                        <button
                            className="link-button twitter"
                            onClick={() => handleOpenLink('https://x.com/SonotyHearts')}
                        >
                            X (Twitter)
                        </button>
                        <span className="separator">|</span>
                        <button
                            className="link-button vrchat"
                            onClick={() => handleOpenLink('https://vrchat.com/home/user/usr_668cf573-47de-4418-85fe-95e319e2c413')}
                        >
                            VRChat
                        </button>
                    </div>

                    <div className="credit-footer">
                        <button onClick={onClose} className="btn-close-modal">
                            閉じる
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
