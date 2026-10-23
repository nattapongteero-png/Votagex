import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_AVATAR } from '../constants/avatars';
import { useTrips } from '../contexts/TripContext';
import { isFirebaseConfigured } from '../services/firebase';
import { uploadProfileImage } from '../services/storage';
import ConfirmModal from '../components/modals/ConfirmModal';

export default function MePage() {
  const navigate = useNavigate();
  const { username, userImage, authUser, signOut, user, updateUserImage } = useAuth();
  const { trips } = useTrips();
  const fileInputRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Trip counts for the stat tiles
  const tripStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const mine = trips.filter(t => (t.profileName && t.profileName === username) || (t.members || []).some(m => m.name === username));
    const past = mine.filter(t => t.endDate && new Date(t.endDate) < today).length;
    const upcoming = mine.filter(t => t.startDate && new Date(t.startDate) > today).length;
    return { total: mine.length, upcoming, past };
  }, [trips, username]);

  const displayName = authUser?.displayName || username || 'User';
  const displayPhoto = userImage || authUser?.photoURL;
  const showLogout = isFirebaseConfigured() && !!user;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
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
        <div className="me-header-top">
          <span className="me-title">ME</span>
        </div>
      </div>

      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Content */}
      <div className="me-content">
        <button className="me-panel me-profile" onClick={() => fileInputRef.current?.click()}>
          <span className="me-profile-avatar">
            <img src={displayPhoto || DEFAULT_AVATAR} alt="" />
          </span>
          <span className="me-profile-text">
            <span className="me-menu-label">{displayName}</span>
          </span>
          <svg className="me-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
        </button>

        <div className="me-stats">
          <div className="me-stat">
            <span className="me-stat-label">ทริปทั้งหมด</span>
            <span className="me-stat-value">{tripStats.total}</span>
            <span className="me-stat-unit">ทริป</span>
          </div>
          <div className="me-stat">
            <span className="me-stat-label">กำลังจะถึง</span>
            <span className="me-stat-value">{tripStats.upcoming}</span>
            <span className="me-stat-unit">ทริป</span>
          </div>
          <div className="me-stat">
            <span className="me-stat-label">ผ่านมาแล้ว</span>
            <span className="me-stat-value">{tripStats.past}</span>
            <span className="me-stat-unit">ทริป</span>
          </div>
        </div>

        {(authUser?.email || showLogout) && (
          <div className="me-panel">
            <div className="me-panel-title">บัญชี</div>
            {authUser?.email && (
              <div className="me-row">
                <span className="me-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>
                </span>
                <span className="me-user-email">{authUser.email}</span>
              </div>
            )}
            {showLogout && (
              <button className="me-row danger" onClick={handleLogout}>
                <span className="me-row-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></svg>
                </span>
                <span className="me-logout-text">ออกจากระบบ</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showLogoutConfirm && (
        <ConfirmModal
          icon="logout"
          message="ต้องการออกจากระบบหรือไม่ ?"
          confirmText="ออกจากระบบ"
          onConfirm={confirmLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}
