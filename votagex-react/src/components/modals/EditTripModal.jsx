import { useState, useRef } from 'react';
import { formatNumberComma, stripCommas } from '../../utils/numbers';
import { formatDateThai } from '../../utils/dates';
import { uploadCoverImage, DEFAULT_TRIP_DESCRIPTION } from '../../services/storage';
import useModalClose from '../../hooks/useModalClose';
import CalendarModal from './CalendarModal';

export default function EditTripModal({ trip, onClose, onSave }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [name, setName] = useState(trip.name || '');
  const [description, setDescription] = useState(trip.description || '');
  const [budget, setBudget] = useState(trip.budget || '');
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [profileName, setProfileName] = useState(trip.profileName || '');
  const [memberCount, setMemberCount] = useState(trip.memberCount || 1);
  const [coverImage, setCoverImage] = useState(trip.coverImage || null);
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const coverFileRef = useRef(null);

  const budgetDisplay = budget ? formatNumberComma(budget) : '';

  const handleBudgetChange = (e) => {
    const raw = stripCommas(e.target.value).replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    if (raw === '') { setBudget(''); return; }
    setBudget(raw);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadCoverImage(file).then(url => setCoverImage(url));
    }
  };

  const handleDatesConfirm = (start, end) => {
    setStartDate(start);
    setEndDate(end);
    setShowCalendar(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || DEFAULT_TRIP_DESCRIPTION,
        budget: stripCommas(budget),
        startDate,
        endDate,
        profileName: profileName.trim(),
        memberCount,
        coverImage
      });
      onClose();
    } catch (err) {
      console.error('Error updating trip:', err);
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
      setSaving(false);
    }
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet edit-modal-sheet">
        <h3>แก้ไขทริป</h3>
        <div className="edit-modal-body">

          {/* Cover Image */}
          <div className="edit-field">
            <label className="edit-field-label">ภาพปกทริป</label>
            <div className="edit-cover-area" onClick={() => coverFileRef.current?.click()}>
              {coverImage ? (
                <>
                  <img src={coverImage} alt="" />
                  <button
                    className="edit-cover-remove"
                    onClick={(e) => { e.stopPropagation(); setCoverImage(null); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </>
              ) : (
                <div className="edit-cover-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span>เพิ่มภาพปก</span>
                </div>
              )}
            </div>
            <input type="file" ref={coverFileRef} accept="image/*" style={{ display: 'none' }} onChange={handleCoverChange} />
          </div>

          {/* Trip Name */}
          <div className="edit-field">
            <label className="edit-field-label">ชื่อทริป</label>
            <input type="text" className="input-pill" placeholder="ชื่อทริป" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="edit-field">
            <label className="edit-field-label">คำอธิบาย</label>
            <input type="text" className="input-pill" placeholder="คำอธิบายทริป" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Budget */}
          <div className="edit-field">
            <label className="edit-field-label">งบประมาณ (บาท)</label>
            <input type="text" className="input-pill" placeholder="0" inputMode="decimal" value={budgetDisplay} onChange={handleBudgetChange} />
          </div>

          {/* Dates - using CalendarModal */}
          <div className="edit-date-row">
            <div className="edit-date-field" onClick={() => setShowCalendar(true)} style={{ cursor: 'pointer' }}>
              <label className="edit-field-label">ขาไป</label>
              <div className="input-pill edit-date-display">
                {startDate ? formatDateThai(startDate) : <span className="edit-date-placeholder">เลือกวัน</span>}
              </div>
            </div>
            <div className="edit-date-field" onClick={() => setShowCalendar(true)} style={{ cursor: 'pointer' }}>
              <label className="edit-field-label">ขากลับ</label>
              <div className="input-pill edit-date-display">
                {endDate ? formatDateThai(endDate) : <span className="edit-date-placeholder">เลือกวัน</span>}
              </div>
            </div>
          </div>

          {/* Owner Name */}
          <div className="edit-field">
            <label className="edit-field-label">ชื่อเจ้าของทริป</label>
            <input type="text" className="input-pill" placeholder="ชื่อเจ้าของ" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          </div>

          {/* Member Count */}
          <div className="edit-field">
            <label className="edit-field-label">จำนวนสมาชิก</label>
            <div className="edit-member-row">
              <input type="range" min="1" max="20" value={memberCount} onChange={(e) => setMemberCount(parseInt(e.target.value))} />
              <span>{memberCount}</span>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-outline" onClick={handleClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>

      {showCalendar && (
        <CalendarModal
          startDate={startDate}
          endDate={endDate}
          onConfirm={handleDatesConfirm}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
