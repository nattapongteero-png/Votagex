import { useState } from 'react';
import { useTrips } from '../../contexts/TripContext';
import PageHeader from '../../components/common/PageHeader';
import TravelCard from '../../components/common/TravelCard';

export default function MembersStep({ onBack, onSave }) {
  const { tripForm, updateTripForm } = useTrips();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      console.error('Error saving trip:', err);
      alert('เกิดข้อผิดพลาด กรุณาลองอีกครั้ง');
      setSaving(false);
    }
  };

  return (
    <div className="slide" style={{ width: '100%' }}>
      <div className="page6-layout">
        <PageHeader onBack={onBack} />
        <TravelCard />

        <h2 className="page2-title">จำนวนสมาชิก</h2>
        <p className="page2-subtitle">" เลือกจำนวนคนที่ไปด้วย "</p>

        <div className="slider-container">
          <input
            type="range"
            className="slider"
            min="1"
            max="20"
            value={tripForm.memberCount}
            onChange={(e) => updateTripForm('memberCount', parseInt(e.target.value))}
          />
          <span className="slider-value">{tripForm.memberCount} คน</span>
        </div>

        <div className="spacer"></div>

        <div className="page2-bottom-fade">
          <button className="btn-gradient" disabled={saving} onClick={handleSave}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
