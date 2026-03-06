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
        <svg className="travel-card-left" viewBox="0 0 22 172" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="11.5" cy="161.5" r="10.5" fill="white"/><circle cx="10.5" cy="136.5" r="10.5" fill="white"/><circle cx="10.5" cy="111.5" r="10.5" fill="white"/><circle cx="10.5" cy="86.5" r="10.5" fill="white"/><circle cx="10.5" cy="61.5" r="10.5" fill="white"/><circle cx="10.5" cy="35.5" r="10.5" fill="white"/><circle cx="10.5" cy="10.5" r="10.5" fill="white"/>
        </svg>
        <svg className="travel-card-right" viewBox="0 0 21 172" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10.5" cy="161.5" r="10.5" fill="white"/><circle cx="10.5" cy="136.5" r="10.5" fill="white"/><circle cx="10.5" cy="111.5" r="10.5" fill="white"/><circle cx="10.5" cy="86.5" r="10.5" fill="white"/><circle cx="10.5" cy="61.5" r="10.5" fill="white"/><circle cx="10.5" cy="35.5" r="10.5" fill="white"/><circle cx="10.5" cy="10.5" r="10.5" fill="white"/>
        </svg>
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
