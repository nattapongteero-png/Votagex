import useModalClose from '../../hooks/useModalClose';

const ICONS = {
  delete: (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M8 10h24v16.667A6.667 6.667 0 0 1 25.333 33H14.667A6.667 6.667 0 0 1 8 26.667V10Z" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10h30M15 10V7a3.333 3.333 0 0 1 3.333-3.333h3.334A3.333 3.333 0 0 1 25 7v3" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.667 18.333v8.334M23.333 18.333v8.334" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  logout: (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path opacity="0.4" d="M15 33.333H8.333A3.333 3.333 0 0 1 5 30V10a3.333 3.333 0 0 1 3.333-3.333H15" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26.667 28.333 35 20l-8.333-8.333" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M35 20H15" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  leave: (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path opacity="0.4" d="M25 33.333H31.667A3.333 3.333 0 0 0 35 30V10a3.333 3.333 0 0 0-3.333-3.333H25" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.333 28.333 5 20l8.333-8.333" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 20h20" stroke="#D92D20" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

export default function ConfirmModal({ icon = 'delete', message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', onConfirm, onCancel }) {
  const { isClosing, handleClose } = useModalClose(onCancel);

  return (
    <div className={`jcm-overlay${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="jcm-card">
        <div className="jcm-icon-wrap danger">
          {ICONS[icon] || ICONS.delete}
        </div>
        <div className="jcm-title">ยืนยันการดำเนินการ</div>
        <div className="jcm-body">{message}</div>
        <div className="jcm-actions two">
          <button className="jcm-btn cancel" onClick={handleClose}>{cancelText}</button>
          <button className="jcm-btn danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
