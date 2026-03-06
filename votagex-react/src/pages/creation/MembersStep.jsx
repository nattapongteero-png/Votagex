import { useState, useMemo, useRef } from 'react';
import { useTrips } from '../../contexts/TripContext';
import PageHeader from '../../components/common/PageHeader';

// 8 characters arranged front-to-back. Index 0 = front center (always first).
// Display order: front row → middle row → back row
const MEMBER_IMAGES = [
  // Front row (frame: 393×338)
  { src: '/assets/member-1.png', style: { left: '5%', top: '29%', width: '94%', height: '91%', zIndex: 8 } },
  { src: '/assets/member-2.png', style: { left: '-24%', top: '29%', width: '77%', height: '71%', zIndex: 7 } },
  { src: '/assets/member-3.png', style: { left: '45%', top: '29%', width: '77%', height: '75%', zIndex: 6 } },
  // Middle row
  { src: '/assets/member-4.png', style: { left: '-4%', top: '13%', width: '72%', height: '69%', zIndex: 5 } },
  { src: '/assets/member-5.png', style: { left: '30%', top: '15%', width: '81%', height: '74%', zIndex: 4 } },
  // Back row
  { src: '/assets/member-6.png', style: { left: '-22%', top: '0%', width: '69%', height: '67%', zIndex: 3 } },
  { src: '/assets/member-7.png', style: { left: '17%', top: '-3%', width: '68%', height: '66%', zIndex: 2 } },
  { src: '/assets/member-8.png', style: { left: '46%', top: '2%', width: '81%', height: '74%', zIndex: 1 } },
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
          {MEMBER_IMAGES.map((char, i) => (
            <img
              key={i}
              src={char.src}
              alt=""
              className={`member-char${visibleSet.has(i) ? ' visible' : ''}`}
              style={char.style}
            />
          ))}
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
