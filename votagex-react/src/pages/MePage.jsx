import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../services/firebase';
import { uploadProfileImage } from '../services/storage';
import TabBar from '../components/common/TabBar';

export default function MePage() {
  const navigate = useNavigate();
  const { username, userImage, authUser, signOut, user, updateUserImage } = useAuth();
  const fileInputRef = useRef(null);

  const displayName = authUser?.displayName || username || 'User';
  const displayPhoto = userImage || authUser?.photoURL;
  const showLogout = isFirebaseConfigured() && !!user;

  const handleLogout = async () => {
    if (!confirm('ต้องการออกจากระบบหรือไม่?')) return;
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadProfileImage(file).then(url => {
        updateUserImage(url);
      });
    }
  };

  return (
    <div className="me-page" style={{ display: 'flex' }}>
      {/* Header */}
      <div className="me-header">
        <div className="me-header-bg">
          <img src="/assets/header-bg.png" alt="" />
        </div>
        <div className="me-header-top">
          <div>
            <span className="me-title">ME</span>
            <span className="me-welcome">Welcome</span>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Content */}
      <div className="me-content">
        <button className="me-menu-item" onClick={() => fileInputRef.current?.click()}>
          <span className="me-menu-icon" style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', flexShrink: 0 }}>
            {displayPhoto ? (
              <img src={displayPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="#999" width="20" height="20">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="me-menu-label">{displayName}</span>
            <span style={{ fontSize: 11, color: '#999' }}>แตะเพื่อเปลี่ยนรูปโปรไฟล์</span>
          </div>
        </button>

        <div className="me-divider"></div>

        <div className="me-email-row">
          {authUser?.email && (
            <span className="me-user-email">{authUser.email}</span>
          )}
          {showLogout && (
            <span className="me-logout-text" onClick={handleLogout}>ออกจากระบบ</span>
          )}
        </div>
      </div>

      <TabBar />
    </div>
  );
}
