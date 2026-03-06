import { useState, useRef, useEffect, useCallback } from 'react';
import useModalClose from '../../hooks/useModalClose';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ITEM_HEIGHT = 44;

function WheelColumn({ items, selected, onChange }) {
  const ref = useRef(null);
  const isScrolling = useRef(false);

  const selectedIdx = items.indexOf(selected);

  useEffect(() => {
    if (ref.current && !isScrolling.current) {
      ref.current.scrollTop = selectedIdx * ITEM_HEIGHT;
    }
  }, [selectedIdx]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    clearTimeout(ref.current._scrollTimer);
    ref.current._scrollTimer = setTimeout(() => {
      const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));
      ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(items[clamped]);
      isScrolling.current = false;
    }, 80);
  }, [items, onChange]);

  return (
    <div className="time-wheel" ref={ref} onScroll={handleScroll}>
      <div style={{ height: ITEM_HEIGHT * 2 }} />
      {items.map((item) => (
        <div
          key={item}
          className={`time-wheel-item${item === selected ? ' active' : ''}`}
          onClick={() => {
            const idx = items.indexOf(item);
            ref.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
            onChange(item);
          }}
        >
          {item}
        </div>
      ))}
      <div style={{ height: ITEM_HEIGHT * 2 }} />
    </div>
  );
}

export default function TimePickerModal({ value, onConfirm, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [hour, setHour] = useState(() => {
    if (value) return value.split(':')[0] || '09';
    return '09';
  });
  const [minute, setMinute] = useState(() => {
    if (value) return value.split(':')[1] || '00';
    return '00';
  });

  const handleConfirm = () => {
    onConfirm(`${hour}:${minute}`);
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} style={{ zIndex: 1200 }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet time-picker-sheet">
        <div className="time-picker-header">
          <h3 className="time-picker-title">เลือกเวลา</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg viewBox="0 0 32 32" fill="none" width="24" height="24">
              <path d="M19.1921 12.793L12.8027 19.1823" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="time-picker-display">
          <span className="time-picker-value">{hour}</span>
          <span className="time-picker-colon">:</span>
          <span className="time-picker-value">{minute}</span>
        </div>

        <div className="time-picker-wheels">
          <div className="time-picker-col">
            <span className="time-picker-label">ชั่วโมง</span>
            <WheelColumn items={HOURS} selected={hour} onChange={setHour} />
          </div>
          <div className="time-picker-separator">:</div>
          <div className="time-picker-col">
            <span className="time-picker-label">นาที</span>
            <WheelColumn items={MINUTES} selected={minute} onChange={setMinute} />
          </div>
        </div>

        <button className="btn-gradient time-picker-confirm" onClick={handleConfirm}>ยืนยัน</button>
      </div>
    </div>
  );
}
