import { useRef } from 'react';
import { useTrips } from '../../contexts/TripContext';
import { useAuth } from '../../contexts/AuthContext';
import { uploadProfileImage } from '../../services/storage';
import PageHeader from '../../components/common/PageHeader';
import TravelCard from '../../components/common/TravelCard';

export default function ProfileStep({ onNext, onBack }) {
  const { tripForm, updateTripForm } = useTrips();
  const { username, userImage } = useAuth();
  const fileInputRef = useRef(null);

  // Pre-fill from auth if form is empty
  const displayName = tripForm.profileName || username;
  const displayImage = tripForm.profileImage || userImage;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadProfileImage(file).then(url => {
        updateTripForm('profileImage', url);
      });
    }
  };

  const handleNext = () => {
    if (!displayName.trim()) return;
    updateTripForm('profileName', displayName.trim());
    if (displayImage && !tripForm.profileImage) {
      updateTripForm('profileImage', displayImage);
    }
    onNext();
  };

  return (
    <div className="slide" style={{ width: '100%' }}>
      <div className="page4-layout">
        <PageHeader onBack={onBack} />
        <TravelCard />

        <h2 className="page2-title">เจ้าของ Trip</h2>
        <p className="page2-subtitle">" กรอกชื่อของคุณเพื่อเดินทาง "</p>

        <div className="cover-upload-wrapper">
          <div className="profile-upload-circle" onClick={() => fileInputRef.current?.click()}>
            {displayImage ? (
              <img src={displayImage} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
            ) : (
              <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
                <path d="M20 30.3333H12C4.75996 30.3333 1.66663 27.24 1.66663 20V12C1.66663 4.75996 4.75996 1.66663 12 1.66663H20C27.24 1.66663 30.3333 4.75996 30.3333 12V20C30.3333 27.24 27.24 30.3333 20 30.3333ZM12 3.66663C5.85329 3.66663 3.66663 5.85329 3.66663 12V20C3.66663 26.1466 5.85329 28.3333 12 28.3333H20C26.1466 28.3333 28.3333 26.1466 28.3333 20V12C28.3333 5.85329 26.1466 3.66663 20 3.66663H12Z" fill="#747474" />
                <path d="M12 14.3333C9.97337 14.3333 8.33337 12.6933 8.33337 10.6667C8.33337 8.64 9.97337 7 12 7C14.0267 7 15.6667 8.64 15.6667 10.6667C15.6667 12.6933 14.0267 14.3333 12 14.3333ZM12 9C11.08 9 10.3334 9.74667 10.3334 10.6667C10.3334 11.5867 11.08 12.3333 12 12.3333C12.92 12.3333 13.6667 11.5867 13.6667 10.6667C13.6667 9.74667 12.92 9 12 9Z" fill="#747474" />
              </svg>
            )}
          </div>
          {displayImage && (
            <button
              className="cover-remove-btn"
              onClick={() => updateTripForm('profileImage', null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <p className="profile-upload-label">เพิ่มภาพโปรไฟล์</p>

        <div className="page2-form">
          <input
            type="text"
            className="input-pill"
            placeholder="Username"
            value={displayName}
            onChange={(e) => updateTripForm('profileName', e.target.value)}
          />
        </div>

        <div className="spacer"></div>

        <div className="page2-bottom-fade">
          <button className="btn-gradient" disabled={!displayName.trim()} onClick={handleNext}>ถัดไป</button>
        </div>
      </div>
    </div>
  );
}
