import { useRef } from 'react';
import { useTrips } from '../../contexts/TripContext';
import { uploadCoverImage } from '../../services/storage';
import PageHeader from '../../components/common/PageHeader';
import TravelCard from '../../components/common/TravelCard';
import { formatNumberComma, stripCommas } from '../../utils/numbers';

export default function TripNameStep({ onNext, onBack }) {
  const { tripForm, updateTripForm } = useTrips();
  const coverFileRef = useRef(null);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadCoverImage(file).then(url => {
        updateTripForm('coverImage', url);
      });
    }
  };

  const handleBudgetChange = (e) => {
    const raw = stripCommas(e.target.value).replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (raw === '') {
      updateTripForm('budget', '');
      return;
    }
    updateTripForm('budget', raw);
  };

  const budgetDisplay = tripForm.budget ? formatNumberComma(tripForm.budget) : '';

  return (
    <div className="slide" style={{ width: '100%' }}>
      <div className="page2-layout">
        <PageHeader onBack={onBack} />
        <TravelCard />

        <h2 className="page2-title">ชื่อการท่องเที่ยว</h2>
        <p className="page2-subtitle">" กรอกชื่อทริปการเดินทาง "</p>

        <div className="cover-upload-wrapper">
          <div className="cover-upload-area" onClick={() => coverFileRef.current?.click()}>
            {tripForm.coverImage ? (
              <img src={tripForm.coverImage} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
            ) : (
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path d="M20 30.3333H12C4.75996 30.3333 1.66663 27.24 1.66663 20V12C1.66663 4.75996 4.75996 1.66663 12 1.66663H20C27.24 1.66663 30.3333 4.75996 30.3333 12V20C30.3333 27.24 27.24 30.3333 20 30.3333ZM12 3.66663C5.85329 3.66663 3.66663 5.85329 3.66663 12V20C3.66663 26.1466 5.85329 28.3333 12 28.3333H20C26.1466 28.3333 28.3333 26.1466 28.3333 20V12C28.3333 5.85329 26.1466 3.66663 20 3.66663H12Z" fill="#747474" />
              </svg>
            )}
          </div>
          {tripForm.coverImage && (
            <button
              className="cover-remove-btn"
              onClick={() => updateTripForm('coverImage', null)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
        <span className="cover-upload-label">เพิ่มภาพประกอบ</span>
        <input type="file" ref={coverFileRef} accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />

        <div className="page2-form">
          <input
            type="text"
            className="input-pill"
            placeholder="ชื่อทริป"
            value={tripForm.name}
            onChange={(e) => updateTripForm('name', e.target.value)}
          />
          <input
            type="text"
            className="input-pill"
            placeholder="Description"
            value={tripForm.description}
            onChange={(e) => updateTripForm('description', e.target.value)}
          />
          <input
            type="text"
            className="input-pill"
            placeholder="งบประมาณทั้งหมด (บาท)"
            inputMode="decimal"
            value={budgetDisplay}
            onChange={handleBudgetChange}
          />
        </div>

        <div className="spacer"></div>

        <div className="page2-bottom-fade">
          <button className="btn-gradient" disabled={!tripForm.name.trim()} onClick={onNext}>ถัดไป</button>
        </div>
      </div>
    </div>
  );
}
