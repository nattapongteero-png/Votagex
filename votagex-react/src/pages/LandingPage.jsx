import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTrips } from '../contexts/TripContext';
import { useState } from 'react';
import LogoutSheet from '../components/modals/LogoutSheet';

export default function LandingPage() {
  const { isAuthenticated, username, userImage, signIn, loading } = useAuth();
  const { resetTripForm } = useTrips();
  const navigate = useNavigate();
  const [signingIn, setSigningIn] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        alert('ป๊อปอัพถูกบล็อก กรุณาอนุญาตป๊อปอัพสำหรับเว็บไซต์นี้');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        alert('เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleCreate = () => {
    resetTripForm();
    navigate('/create');
  };

  if (loading) {
    return <div className="loading-screen">กำลังโหลด...</div>;
  }

  return (
    <div className="app-container">
      <div className="landing-page">
        {/* Polaroid Photo Collage */}
        <div className="polaroid-collage">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className={`polaroid polaroid-${n}`}>
              <div className="polaroid-frame">
                <div className="polaroid-photo">
                  <img src={`/assets/photo${n}.jpg`} alt="" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Content Section */}
        <div className="landing-content">
          <h1 className="app-title-gradient">VOTAGEX</h1>
          <p className="app-tagline">" Traveling together builds more than memories "</p>

          {/* Account pill (shown when logged in) */}
          {isAuthenticated && username && (
            <div className="landing-account-pill" onClick={() => setShowLogout(true)}>
              <div className="landing-account-avatar">
                {userImage && <img src={userImage} alt="" />}
              </div>
              <span className="landing-account-name">{username}</span>
            </div>
          )}

          {/* Create/Join buttons (shown when logged in) */}
          {isAuthenticated && (
            <div className="landing-buttons">
              <button className="btn-primary-blue" onClick={handleCreate}>Create Journey</button>
              <button className="btn-outline-blue" onClick={() => navigate('/join')}>Join Trip</button>
            </div>
          )}

          {/* Google Sign-in (shown when not logged in) */}
          {!isAuthenticated && (
            <div className="landing-buttons" style={{ marginTop: '24px' }}>
              <button
                className={`btn-google-signin-landing ${signingIn ? 'loading' : ''}`}
                onClick={handleSignIn}
                disabled={signingIn}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </button>
              <p className="landing-login-hint">เข้าสู่ระบบเพื่อเริ่มวางแผนทริป</p>
            </div>
          )}
        </div>
      </div>

      {showLogout && <LogoutSheet onClose={() => setShowLogout(false)} />}
    </div>
  );
}
