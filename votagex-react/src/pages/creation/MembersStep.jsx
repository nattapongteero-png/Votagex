import { useState, useMemo, useRef } from 'react';
import { useTrips } from '../../contexts/TripContext';
import PageHeader from '../../components/common/PageHeader';

// 8 ThaiWell avatars (Notionists by Zoish via DiceBear, CC0) arranged as a group, front to back.
// Index 0 = front center (always first). Positions are % of the stage; size in px.
const MEMBER_AVATARS = [
  // Front row
  { src: '/assets/avatars/avatar-male.svg', left: 50, top: 66, size: 104 },
  { src: '/assets/avatars/p5.svg', left: 24, top: 60, size: 84 },
  { src: '/assets/avatars/p4.svg', left: 76, top: 60, size: 84 },
  // Middle row
  { src: '/assets/avatars/p9.svg', left: 36, top: 32, size: 72 },
  { src: '/assets/avatars/avatar-female.svg', left: 64, top: 32, size: 72 },
  // Back row
  { src: '/assets/avatars/p6.svg', left: 12, top: 30, size: 60 },
  { src: '/assets/avatars/p7.svg', left: 50, top: 11, size: 60 },
  { src: '/assets/avatars/p3.svg', left: 88, top: 30, size: 60 },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MembersStep({ onBack, onSave }) {
  const { tripForm, updateTripForm } = useTrips();
  const [saving, setSaving] = useState(false);

  // Display order: front sides [1,2] shuffled, middle [3,4] shuffled, back [5,6,7] shuffled
  const sideOrderRef = useRef([
    ...shuffleArray([1, 2]),
    ...shuffleArray([3, 4]),
    ...shuffleArray([5, 6, 7]),
  ]);

  // Build visible set: index 0 always first, then front→middle→back
  const visibleSet = useMemo(() => {
    const count = Math.min(tripForm.memberCount, 8);
    if (count === 0) return new Set();
    const set = new Set([0]);
    for (let i = 0; i < count - 1 && i < sideOrderRef.current.length; i++) {
      set.add(sideOrderRef.current[i]);
    }
    return set;
  }, [tripForm.memberCount]);

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

        <div className="members-characters">
          {MEMBER_AVATARS.map((m, i) => (
            <span
              key={i}
              className={`member-char${visibleSet.has(i) ? ' visible' : ''}`}
              style={{ left: `${m.left}%`, top: `${m.top}%`, width: m.size, height: m.size, marginLeft: -m.size / 2, marginTop: -m.size / 2, zIndex: 8 - i }}
            >
              <img src={m.src} alt="" />
            </span>
          ))}
          {tripForm.memberCount > MEMBER_AVATARS.length && (
            <span className="member-more">+{tripForm.memberCount - MEMBER_AVATARS.length}</span>
          )}
        </div>

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
