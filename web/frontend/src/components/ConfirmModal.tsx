import "./Modal.css";

export interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  danger?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ config }: { config: ConfirmConfig }) {
  if (!config.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={config.onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className={`modal-icon ${config.danger !== false ? "error" : "success"}`}>
            {config.danger !== false ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </div>
          <h3 className="modal-title">{config.title}</h3>
        </div>
        <div className="modal-body">
          {config.message}
        </div>
        <div className="modal-footer">
          <button className="btn btn--ghost" onClick={config.onCancel} style={{ marginRight: "8px" }}>
            {config.cancelText || "Hủy"}
          </button>
          <button 
            className={`btn ${config.danger !== false ? "btn--danger" : "btn--primary"}`} 
            onClick={() => {
              config.onConfirm();
              config.onCancel(); // auto close
            }}
          >
            {config.confirmText || "Xác nhận"}
          </button>
        </div>
      </div>
    </div>
  );
}
