import { useTrips } from '../../contexts/TripContext';
import { formatDateThai } from '../../utils/dates';

export default function TravelCard() {
  const { tripForm } = useTrips();

  const title = tripForm.name || 'Trip';
  const desc = tripForm.description || 'Description';
  const dateText = (tripForm.startDate && tripForm.endDate)
    ? `${formatDateThai(tripForm.startDate)} - ${formatDateThai(tripForm.endDate)}`
    : '';
  const owner = tripForm.profileName || '';

  return (
    <div className="banner-image">
      <div className="travel-card">
        <img className="travel-card-left" src="/assets/ticket-left.png" alt="" />
        <img className="travel-card-right" src="/assets/ticket-right.png" alt="" />
        <div className="travel-card-inner">
          <div className="travel-card-texture"></div>
          <div className="travel-card-header"></div>
          <span className="travel-card-owner">{owner}</span>
          <h3 className="travel-card-title">{title}</h3>
          <p className="travel-card-desc">{desc}</p>
          <p className="travel-card-dates">{dateText}</p>
        </div>
      </div>
    </div>
  );
}
