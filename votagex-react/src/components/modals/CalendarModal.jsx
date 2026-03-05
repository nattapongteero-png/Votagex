import { useState, useEffect, useCallback } from 'react';
import { useTrips } from '../../contexts/TripContext';
import { formatDateThaiShort, formatISODate } from '../../utils/dates';
import useModalClose from '../../hooks/useModalClose';

const CAL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarModal({ startDate, endDate, onConfirm, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const { trips, tripForm } = useTrips();

  const now = new Date();
  const initDate = startDate ? new Date(startDate) : now;

  const [year, setYear] = useState(initDate.getFullYear());
  const [month, setMonth] = useState(initDate.getMonth());
  const [selStart, setSelStart] = useState(() => {
    if (startDate) {
      const d = new Date(startDate);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return null;
  });
  const [selEnd, setSelEnd] = useState(() => {
    if (endDate) {
      const d = new Date(endDate);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
    return null;
  });
  const [warning, setWarning] = useState('');

  // Build blocked date ranges from user's other trips
  const [blockedRanges, setBlockedRanges] = useState([]);
  useEffect(() => {
    const userName = tripForm.profileName || '';
    const ranges = [];
    trips.forEach(t => {
      if (!t.startDate || !t.endDate) return;
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      if (!isCreator && !isMember) return;
      const s = new Date(t.startDate); s.setHours(0, 0, 0, 0);
      const e = new Date(t.endDate); e.setHours(0, 0, 0, 0);
      ranges.push({ start: s, end: e, name: t.name || '' });
    });
    setBlockedRanges(ranges);
  }, [trips, tripForm.profileName]);

  const isDateBlocked = useCallback((dateNorm) => {
    return blockedRanges.some(r => dateNorm >= r.start.getTime() && dateNorm <= r.end.getTime());
  }, [blockedRanges]);

  const doesRangeOverlapBlocked = useCallback((s, e) => {
    const sT = s.getTime();
    const eT = e.getTime();
    return blockedRanges.find(r => sT <= r.end.getTime() && eT >= r.start.getTime());
  }, [blockedRanges]);

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleDayClick = (date) => {
    const clickedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (!selStart || (selStart && selEnd)) {
      // First click or reset
      setSelStart(clickedDate);
      setSelEnd(null);
      setWarning('');
    } else {
      // Second click
      let newStart = selStart;
      let newEnd = clickedDate;
      if (clickedDate.getTime() < selStart.getTime()) {
        newStart = clickedDate;
        newEnd = selStart;
      }

      const overlap = doesRangeOverlapBlocked(newStart, newEnd);
      if (overlap) {
        setWarning(`คุณมีทริป "${overlap.name}" อยู่แล้ว ไม่สามารถสร้างทริปที่วันทับกันได้`);
        setSelStart(null);
        setSelEnd(null);
        return;
      }

      setWarning('');
      if (clickedDate.getTime() >= selStart.getTime()) {
        setSelEnd(clickedDate);
      } else {
        setSelStart(clickedDate);
      }
    }
  };

  const handleConfirm = () => {
    if (selStart && selEnd) {
      onConfirm(formatISODate(selStart), formatISODate(selEnd));
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const daysInMonth = lastDay.getDate();
  const prevLastDay = new Date(year, month, 0).getDate();

  const todayNorm = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startT = selStart ? selStart.getTime() : null;
  const endT = selEnd ? selEnd.getTime() : null;

  const cells = [];
  let colIndex = 0;

  // Previous month trailing days
  for (let i = startDow - 1; i >= 0; i--) {
    const dayNum = prevLastDay - i;
    const date = new Date(year, month - 1, dayNum);
    cells.push({ dayNum, date, isOtherMonth: true, col: colIndex % 7 });
    colIndex++;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    cells.push({ dayNum: d, date, isOtherMonth: false, col: colIndex % 7 });
    colIndex++;
  }

  // Fill to 42 cells
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    cells.push({ dayNum: d, date, isOtherMonth: true, col: colIndex % 7 });
    colIndex++;
  }

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={handleOverlayClick}>
      <div className="modal-sheet calendar-sheet">
        <div className="calendar-widget">
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={handlePrev}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 1L1 6.5L7 12" stroke="#222B45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="cal-title">
              <span className="cal-month">{CAL_MONTHS[month]}</span>
              <span className="cal-year">{year}</span>
            </div>
            <button className="cal-nav-btn" onClick={handleNext}>
              <svg width="8" height="13" viewBox="0 0 8 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L7 6.5L1 12" stroke="#222B45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="cal-weekdays">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="cal-grid">
            {cells.map((cell, idx) => {
              const dateNorm = new Date(cell.date.getFullYear(), cell.date.getMonth(), cell.date.getDate()).getTime();
              const blocked = isDateBlocked(dateNorm);
              const isToday = dateNorm === todayNorm;
              const isStart = startT !== null && dateNorm === startT;
              const isEnd = endT !== null && dateNorm === endT;
              const isInRange = startT !== null && endT !== null && dateNorm > startT && dateNorm < endT;
              const hasRange = startT !== null && endT !== null && startT !== endT;

              const cellClasses = ['cal-cell'];
              if (blocked) cellClasses.push('blocked-range');
              if (isStart && hasRange) cellClasses.push('range-start');
              if (isEnd && hasRange) cellClasses.push('range-end');
              if (isInRange) cellClasses.push('in-range');
              if (isInRange && cell.col === 0) cellClasses.push('row-start');
              if (isInRange && cell.col === 6) cellClasses.push('row-end');

              const dayClasses = ['cal-day'];
              if (cell.isOtherMonth) dayClasses.push('other-month');
              if (isToday) dayClasses.push('today');
              if (blocked) dayClasses.push('blocked');
              if (isStart || isEnd) dayClasses.push('selected');

              return (
                <div key={idx} className={cellClasses.join(' ')}>
                  <div
                    className={dayClasses.join(' ')}
                    onClick={blocked ? undefined : () => handleDayClick(cell.date)}
                    style={blocked ? undefined : { cursor: 'pointer' }}
                  >
                    {cell.dayNum}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cal-summary">
          <div className="cal-summary-card">
            <span className="cal-summary-label">ขาไป</span>
            <span className="cal-summary-value">{selStart ? formatDateThaiShort(selStart) : '--'}</span>
          </div>
          <div className="cal-summary-card">
            <span className="cal-summary-label">ขากลับ</span>
            <span className="cal-summary-value">{selEnd ? formatDateThaiShort(selEnd) : '--'}</span>
          </div>
        </div>

        {warning && (
          <div className="cal-overlap-warning">{warning}</div>
        )}

        <button className="btn-gradient cal-confirm-btn" disabled={!(selStart && selEnd)} onClick={handleConfirm}>
          ยืนยัน
        </button>
      </div>
    </div>
  );
}
