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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21.791 12.1207H9.75" stroke="#D63B3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.8643 9.20471L21.7923 12.1207L18.8643 15.0367" stroke="#D63B3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path opacity="0.4" d="M16.3597 7.62991C16.0297 4.04991 14.6897 2.74991 9.35974 2.74991C2.25874 2.74991 2.25874 5.05991 2.25874 11.9999C2.25874 18.9399 2.25874 21.2499 9.35974 21.2499C14.6897 21.2499 16.0297 19.9499 16.3597 16.3699" stroke="#D63B3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </>
  );
}
