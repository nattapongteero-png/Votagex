import { useState } from 'react';
import { useTrips } from '../../contexts/TripContext';
import { formatDateThai } from '../../utils/dates';
import PageHeader from '../../components/common/PageHeader';
import TravelCard from '../../components/common/TravelCard';
import CalendarModal from '../../components/modals/CalendarModal';

export default function DatesStep({ onNext, onBack }) {
  const { tripForm, updateTripForm } = useTrips();
  const [showCalendar, setShowCalendar] = useState(false);

  const handleDatesConfirm = (startDate, endDate) => {
    updateTripForm('startDate', startDate);
    updateTripForm('endDate', endDate);
    setShowCalendar(false);
  };

  const hasDates = tripForm.startDate && tripForm.endDate;

  return (
    <div className="slide" style={{ width: '100%' }}>
      <div className="page3-layout">
        <PageHeader onBack={onBack} />
        <TravelCard />

        <h2 className="page2-title">เดินทางไป - กลับ</h2>
        <p className="page2-subtitle">" เลือกวันที่เดินทางไป-กลับ "</p>

        <div className="date-cards">
          <div className="date-card" onClick={() => setShowCalendar(true)} style={{ cursor: 'pointer' }}>
            <span className="date-card-label">ขาไป</span>
            <span className="date-card-value">{formatDateThai(tripForm.startDate)}</span>
            <button className="date-card-btn">เลือกวัน</button>
          </div>
          <div className="date-card" onClick={() => setShowCalendar(true)} style={{ cursor: 'pointer' }}>
            <span className="date-card-label">ขากลับ</span>
            <span className="date-card-value">{formatDateThai(tripForm.endDate)}</span>
            <button className="date-card-btn">เลือกวัน</button>
          </div>
        </div>

        <div className="spacer"></div>

        <div className="page2-bottom-fade">
          <button className="btn-gradient" disabled={!hasDates} onClick={onNext}>ถัดไป</button>
        </div>
      </div>

      {showCalendar && (
        <CalendarModal
          startDate={tripForm.startDate}
          endDate={tripForm.endDate}
          onConfirm={handleDatesConfirm}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
