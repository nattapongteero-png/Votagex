import { useState } from 'react';
import { formatISODate } from '../../utils/dates';
import useModalClose from '../../hooks/useModalClose';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

// Month view for picking the day shown on the home page.
// tripStart/tripEnd (YYYY-MM-DD) shade the trip; activityCounts marks days that have activities.
export default function MonthPickerSheet({ selectedDate, tripStart, tripEnd, activityCounts = {}, onPick, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const init = new Date(selectedDate);
  const [year, setYear] = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth());

  const todayStr = formatISODate(new Date());

  const handlePrev = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  };
  const handleNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const handlePick = (dateStr) => {
    onPick(dateStr);
    handleClose();
  };

  // 6 weeks starting on Monday
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, 1 - lead + i);
    return { date, dateStr: formatISODate(date), isOtherMonth: date.getMonth() !== month, col: i % 7 };
  });

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet calendar-sheet">
        <div className="calendar-widget">
          <div className="cal-header">
            <button className="cal-nav-btn" aria-label="เดือนก่อน" onClick={handlePrev}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="cal-title">
              <span className="cal-month">{THAI_MONTHS[month]}</span>
              <span className="cal-year">{year}</span>
            </div>
            <button className="cal-nav-btn" aria-label="เดือนถัดไป" onClick={handleNext}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
            </button>
          </div>

          <div className="cal-weekdays">
            <span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span><span>อา.</span>
          </div>

          <div className="cal-grid">
            {cells.map(cell => {
              const inTrip = tripStart && tripEnd && cell.dateStr >= tripStart && cell.dateStr <= tripEnd;
              const isTripStart = inTrip && cell.dateStr === tripStart;
              const isTripEnd = inTrip && cell.dateStr === tripEnd;

              const cellClasses = ['cal-cell'];
              if (inTrip && !isTripStart && !isTripEnd) cellClasses.push('in-range');
              if (isTripStart && tripStart !== tripEnd) cellClasses.push('range-start');
              if (isTripEnd && tripStart !== tripEnd) cellClasses.push('range-end');
              if (inTrip && cell.col === 0) cellClasses.push('row-start');
              if (inTrip && cell.col === 6) cellClasses.push('row-end');

              const dayClasses = ['cal-day'];
              if (cell.isOtherMonth) dayClasses.push('other-month');
              if (cell.dateStr === todayStr) dayClasses.push('today');
              if (cell.dateStr === selectedDate) dayClasses.push('selected');

              return (
                <div key={cell.dateStr} className={cellClasses.join(' ')}>
                  <div className={dayClasses.join(' ')} onClick={() => handlePick(cell.dateStr)} style={{ cursor: 'pointer' }}>
                    {cell.date.getDate()}
                    {activityCounts[cell.dateStr] > 0 && <span className="cal-day-dot" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
