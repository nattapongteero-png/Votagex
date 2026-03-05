import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfileImage } from '../services/storage';
import TripCard from '../components/common/TripCard';
import JoinConfirmModal from '../components/modals/JoinConfirmModal';

export default function JoinScreen() {
  const navigate = useNavigate();
  const { trips, loadTrips, joinExistingTrip, setCurrentTrip } = useTrips();
  const { username, userImage } = useAuth();

  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [confirmTrip, setConfirmTrip] = useState(null);
  const [joining, setJoining] = useState(false);
  const fileInputRef = useRef(null);

  // Pre-fill from auth
  useEffect(() => {
    const savedName = localStorage.getItem('votagex_username') || username || '';
    const savedImage = localStorage.getItem('votagex_userimage') || userImage || '';
    setName(savedName);
    if (savedImage) setImage(savedImage);
  }, [username, userImage]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadProfileImage(file).then(url => setImage(url));
    }
  };

  const handleNext = () => {
    if (!name.trim()) return;
    setPage(2);
  };

  const handleJoinDirect = async (trip) => {
    setJoining(true);
    try {
      await joinExistingTrip(trip.id, { name: name.trim(), image });
      if (name.trim()) localStorage.setItem('votagex_username', name.trim());
      if (image) localStorage.setItem('votagex_userimage', image);
      setCurrentTrip({ ...trip, profileName: name.trim(), profileImage: image });
      navigate('/home');
    } catch (err) {
      console.error('Error joining trip:', err);
      setJoining(false);
    }
  };

  const handleJoinConfirm = async () => {
    if (!confirmTrip) return;
    setJoining(true);
    try {
      await joinExistingTrip(confirmTrip.id, { name: name.trim(), image });
      if (name.trim()) localStorage.setItem('votagex_username', name.trim());
      if (image) localStorage.setItem('votagex_userimage', image);
      setCurrentTrip({ ...confirmTrip, profileName: name.trim(), profileImage: image });
      setConfirmTrip(null);
      navigate('/home');
    } catch (err) {
      console.error('Error joining trip:', err);
      setJoining(false);
    }
  };

  const userName = name.trim() || username || '';

  // Split trips into joined vs available
  const { joinedTrips, availableTrips } = (() => {
    const joined = [];
    const available = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    [...trips].reverse().forEach(trip => {
      const isCreator = trip.profileName && trip.profileName === userName;
      const isMember = (trip.members || []).some(m => m.name === userName);
      if (isCreator || isMember) {
        joined.push(trip);
      } else {
        available.push(trip);
      }
    });

    // Sort available: joinable first
    available.sort((a, b) => {
      const aExpired = a.endDate ? new Date(a.endDate) < today : false;
      const aFull = (a.members || []).length >= (a.memberCount || 1);
      const bExpired = b.endDate ? new Date(b.endDate) < today : false;
      const bFull = (b.members || []).length >= (b.memberCount || 1);
      return (aExpired || aFull ? 1 : 0) - (bExpired || bFull ? 1 : 0);
    });

    return { joinedTrips: joined, availableTrips: available };
  })();

  const handleGoToTrip = (trip) => {
    setCurrentTrip(trip);
    navigate('/home');
  };

  return (
    <div className="join-screen active">
      <div className="join-container">
        {/* Page 1: Profile */}
        {page === 1 && (
          <div className="join-page active">
            <div className="page4-layout">
              <div className="join-topbar">
                <button className="btn-back-pill" onClick={() => navigate('/')}>ย้อนกลับ</button>
                <div className="join-dots">
                  <span className="jdot active"></span>
                  <span className="jdot"></span>
                </div>
              </div>

              <h2 className="page2-title">ผู้ร่วม Trip</h2>
              <p className="page2-subtitle">" กรอกชื่อของคุณเพื่อเดินทาง "</p>

              <div className="profile-upload-circle" onClick={() => fileInputRef.current?.click()}>
                {image ? (
                  <img src={image} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
                    <path d="M20 30.3333H12C4.75996 30.3333 1.66663 27.24 1.66663 20V12C1.66663 4.75996 4.75996 1.66663 12 1.66663H20C27.24 1.66663 30.3333 4.75996 30.3333 12V20C30.3333 27.24 27.24 30.3333 20 30.3333ZM12 3.66663C5.85329 3.66663 3.66663 5.85329 3.66663 12V20C3.66663 26.1466 5.85329 28.3333 12 28.3333H20C26.1466 28.3333 28.3333 26.1466 28.3333 20V12C28.3333 5.85329 26.1466 3.66663 20 3.66663H12Z" fill="#747474" />
                    <path d="M12 14.3333C9.97337 14.3333 8.33337 12.6933 8.33337 10.6667C8.33337 8.64 9.97337 7 12 7C14.0267 7 15.6667 8.64 15.6667 10.6667C15.6667 12.6933 14.0267 14.3333 12 14.3333ZM12 9C11.08 9 10.3334 9.74667 10.3334 10.6667C10.3334 11.5867 11.08 12.3333 12 12.3333C12.92 12.3333 13.6667 11.5867 13.6667 10.6667C13.6667 9.74667 12.92 9 12 9Z" fill="#747474" />
                  </svg>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <p className="profile-upload-label">เพิ่มภาพโปรไฟล์</p>

              <div className="page2-form">
                <input type="text" className="input-pill" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="spacer"></div>

              <div className="page2-bottom-fade">
                <button className="btn-gradient" disabled={!name.trim()} onClick={handleNext}>ถัดไป</button>
              </div>
            </div>
          </div>
        )}

        {/* Page 2: Trip Cards */}
        {page === 2 && (
          <div className="join-page active">
            <div className="join-cards-layout">
              <div className="join-topbar">
                <button className="btn-back-pill" onClick={() => setPage(1)}>ย้อนกลับ</button>
                <div className="join-dots">
                  <span className="jdot"></span>
                  <span className="jdot active"></span>
                </div>
              </div>
              {/* Joined Trips */}
              {joinedTrips.length > 0 && (
                <>
                  <span className="itrip-section-title" style={{ padding: '0 0px 16px' }}>My Trips</span>
                  <div className="hp-other-trip-grid">
                    {joinedTrips.map(trip => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        showEditButton={false}
                        onView={(t) => handleGoToTrip(t)}
                        onCardClick={() => handleGoToTrip(trip)}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Available Trips */}
              <span className="itrip-section-title" style={{ padding: joinedTrips.length > 0 ? '16px 0 16px' : '0 4px 8px' }}>Other Trips</span>
              <div className="hp-other-trip-grid">
                {availableTrips.length > 0 ? (
                  availableTrips.map(trip => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      onJoin={(t) => handleJoinDirect(t)}
                      onView={(t) => handleGoToTrip(t)}
                      onCardClick={() => setConfirmTrip(trip)}
                    />
                  ))
                ) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#a3a3a3', fontSize: 13, padding: 24 }}>
                    ยังไม่มีทริปที่เปิดรับสมาชิก
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {confirmTrip && (
        <JoinConfirmModal
          trip={confirmTrip}
          userName={name.trim()}
          trips={trips}
          joining={joining}
          onConfirm={handleJoinConfirm}
          onClose={() => { setConfirmTrip(null); setJoining(false); }}
        />
      )}
    </div>
  );
}
