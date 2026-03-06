import { CATEGORY_CONFIG } from '../../constants/categories';
import { formatSpend, getActivityAmountForDay } from '../../utils/numbers';
import { getHotelNights } from '../../utils/dates';

export default function ActivityCard({ activity, showRemove, onRemove, onClick }) {
  const cfg = CATEGORY_CONFIG[activity.category] || CATEGORY_CONFIG.other;
  const cat = activity.category || 'other';
  const hasExpense = activity.amount > 0;

  // Format THB amount with - prefix when has expense
  const showAmount = (amt) => {
    const formatted = formatSpend(amt);
    return (parseFloat(amt) > 0) ? `-${formatted}` : formatted;
  };

  let infoContent;
  if (cat === 'hotel') {
    const dateStr = (activity.checkIn && activity.checkOut)
      ? `${activity.checkIn.slice(5).replace('-', '/')} - ${activity.checkOut.slice(5).replace('-', '/')}`
      : (activity.time || '--:--');
    const hotelDayAmt = getActivityAmountForDay(activity);
    const nights = getHotelNights(activity);

    infoContent = (
      <>
        <div className="act-card-info-col">
          <span className="act-card-info-value">{dateStr}</span>
          <span className="act-card-info-label">วันเข้าพัก</span>
        </div>
        <div className="act-card-info-col">
          <span className="act-card-info-value spend">{showAmount(hotelDayAmt)}</span>
          <span className="act-card-info-label">{nights > 0 ? `ต่อคืน (${nights} คืน)` : 'เงินที่ใช้ไป'}</span>
        </div>
      </>
    );
  } else if (['place', 'food', 'shopping'].includes(cat)) {
    infoContent = (
      <>
        <div className="act-card-info-col">
          <span className="act-card-info-value">{activity.time || '00:00'}</span>
          <span className="act-card-info-label">เวลา</span>
        </div>
        <div className="act-card-info-col">
          <span className="act-card-info-value spend">{showAmount(activity.amount)}</span>
          <span className="act-card-info-label">เงินที่ใช้ไป</span>
        </div>
      </>
    );
  } else {
    infoContent = (
      <div className="act-card-info-col">
        <span className="act-card-info-value spend">{showAmount(activity.amount)}</span>
        <span className="act-card-info-label">เงินที่ใช้ไป</span>
      </div>
    );
  }

  return (
    <div
      className={`act-card${hasExpense ? ' has-expense' : ''}`}
      style={onClick ? { cursor: 'pointer' } : undefined}
      onClick={onClick}
    >
      {showRemove && (
        <button className="act-card-remove" onClick={(e) => { e.stopPropagation(); onRemove?.(); }}>&times;</button>
      )}
      <div className="act-card-header">
        <span className="act-card-name">{activity.name}</span>
        <span className="act-card-icon" dangerouslySetInnerHTML={{ __html: cfg.icon }} />
      </div>
      <div className="act-card-body">
        <div className="act-card-info">{infoContent}</div>
      </div>
    </div>
  );
}
