import useModalClose from '../../hooks/useModalClose';

const ICONS = {
  delete: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M5 6h14v10a4 4 0 01-4 4H9a4 4 0 01-4-4V6z" fill="#E62E05" fillOpacity="0.15"/>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v5M14 11v5" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 6h14v10a4 4 0 01-4 4H9a4 4 0 01-4-4V6z" stroke="#E62E05" strokeWidth="1.5"/>
    </svg>
  ),
  logout: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="16 17 21 12 16 7" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="21" y1="12" x2="9" y2="12" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  leave: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <path d="M15 3H7a2 2 0 00-2 2v14a2 2 0 002 2h8" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 12H9M19 12l-3-3M19 12l-3 3" stroke="#E62E05" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

export default function ConfirmModal({ icon = 'delete', message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', onConfirm, onCancel }) {
  const { isClosing, handleClose } = useModalClose(onCancel);

  return (
    <div className={`modal-overlay confirm-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="confirm-modal">
        <div className="confirm-icon">
          {ICONS[icon] || ICONS.delete}
        </div>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={handleClose}>{cancelText}</button>
          <button className="confirm-btn-ok" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
