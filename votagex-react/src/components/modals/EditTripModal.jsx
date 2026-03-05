import { useState } from 'react';
import { formatNumberComma, stripCommas } from '../../utils/numbers';
import useModalClose from '../../hooks/useModalClose';

export default function EditTripModal({ trip, onClose, onSave }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [name, setName] = useState(trip.name || '');
  const [description, setDescription] = useState(trip.description || '');
  const [budget, setBudget] = useState(trip.budget || '');
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [profileName, setProfileName] = useState(trip.profileName || '');
  const [memberCount, setMemberCount] = useState(trip.memberCount || 1);
  const [saving, setSaving] = useState(false);

  const budgetDisplay = budget ? formatNumberComma(budget) : '';

  const handleBudgetChange = (e) => {
    const raw = stripCommas(e.target.value);
    if (raw === '' || raw === '-') { setBudget(''); return; }
    const num = parseFloat(raw);
    if (!isNaN(num)) setBudget(raw);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        budget: stripCommas(budget),
        startDate,
        endDate,
        profileName: profileName.trim(),
        memberCount
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
          <input type="text" className="input-pill" placeholder="ชื่อทริป" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="text" className="input-pill" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input type="text" className="input-pill" placeholder="งบประมาณทั้งหมด (บาท)" inputMode="decimal" value={budgetDisplay} onChange={handleBudgetChange} />
          <div className="edit-date-row">
            <div className="edit-date-field">
              <label>ขาไป</label>
              <input type="date" className="input-pill" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="edit-date-field">
              <label>ขากลับ</label>
              <input type="date" className="input-pill" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <input type="text" className="input-pill" placeholder="ชื่อเจ้าของ" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
          <div className="edit-member-row">
            <label>จำนวนสมาชิก</label>
            <input type="range" min="1" max="20" value={memberCount} onChange={(e) => setMemberCount(parseInt(e.target.value))} />
            <span>{memberCount}</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={handleClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  );
}
