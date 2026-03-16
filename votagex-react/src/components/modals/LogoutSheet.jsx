import { useAuth } from '../../contexts/AuthContext';
import useModalClose from '../../hooks/useModalClose';

export default function LogoutSheet({ onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const { authUser, userImage, signOut } = useAuth();

  const handleLogout = async () => {
    onClose();
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <>
      <div className={`logout-backdrop active${isClosing ? ' closing' : ''}`} onClick={handleClose}></div>
      <div className={`logout-sheet active${isClosing ? ' closing' : ''}`}>
        <div className="logout-sheet-handle"></div>
        <div className="logout-sheet-profile">
          <div className="logout-sheet-avatar">
            {userImage && <img src={userImage} alt="" />}
          </div>
          <div className="logout-sheet-info">
            <span className="logout-sheet-name">{authUser?.displayName || ''}</span>
            <span className="logout-sheet-email">{authUser?.email || ''}</span>
          </div>
        </div>
        <button className="logout-sheet-btn" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M15 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H15" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 12H9M19 12L16 9M19 12L16 15" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );
}
