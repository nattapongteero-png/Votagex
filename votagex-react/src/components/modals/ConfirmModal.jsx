import useModalClose from '../../hooks/useModalClose';

const ICONS = {
  delete: (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M8 10h24v16.667A6.667 6.667 0 0 1 25.333 33H14.667A6.667 6.667 0 0 1 8 26.667V10Z" stroke="#B42828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10h30M15 10V7a3.333 3.333 0 0 1 3.333-3.333h3.334A3.333 3.333 0 0 1 25 7v3" stroke="#B42828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.667 18.333v8.334M23.333 18.333v8.334" stroke="#B42828" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  logout: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path d="M21.791 12.1207H9.75" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.8643 9.20471L21.7923 12.1207L18.8643 15.0367" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path opacity="0.4" d="M16.3597 7.62991C16.0297 4.04991 14.6897 2.74991 9.35974 2.74991C2.25874 2.74991 2.25874 5.05991 2.25874 11.9999C2.25874 18.9399 2.25874 21.2499 9.35974 21.2499C14.6897 21.2499 16.0297 19.9499 16.3597 16.3699" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  leave: (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
      <path d="M21.791 12.1207H9.75" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.8643 9.20471L21.7923 12.1207L18.8643 15.0367" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path opacity="0.4" d="M16.3597 7.62991C16.0297 4.04991 14.6897 2.74991 9.35974 2.74991C2.25874 2.74991 2.25874 5.05991 2.25874 11.9999C2.25874 18.9399 2.25874 21.2499 9.35974 21.2499C14.6897 21.2499 16.0297 19.9499 16.3597 16.3699" stroke="#B42828" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
