import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import TabBar from '../components/common/TabBar';
import TripCard from '../components/common/TripCard';

export default function ITripPage() {
  const navigate = useNavigate();
  const { trips, loadTrips, resetTripForm, setCurrentTrip } = useTrips();
  const { username, authUser } = useAuth();

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const displayName = authUser?.displayName || username || 'User';

  const { myTrips, otherTrips } = useMemo(() => {
    const userName = username || '';
    const my = [];
    const other = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    trips.forEach(trip => {
      const isCreator = trip.profileName && trip.profileName === userName;
      const isMember = (trip.members || []).some(m => m.name === userName);
      if (isCreator || isMember) {
        my.push(trip);
      } else {
        other.push(trip);
      }
    });

    // Reverse for newest first
    my.reverse();

    // Sort other trips: joinable first
    other.reverse();
    other.sort((a, b) => {
      const aExpired = a.endDate ? new Date(a.endDate) < today : false;
      const aFull = (a.members || []).length >= (a.memberCount || 1);
      const bExpired = b.endDate ? new Date(b.endDate) < today : false;
      const bFull = (b.members || []).length >= (b.memberCount || 1);
      return (aExpired || aFull ? 1 : 0) - (bExpired || bFull ? 1 : 0);
    });

    return { myTrips: my, otherTrips: other };
  }, [trips, username]);

  const handleAddTrip = () => {
    resetTripForm();
    navigate('/create');
  };

  const handleTripClick = (trip) => {
    setCurrentTrip(trip);
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div className="itrip-page" style={{ display: 'flex' }}>
      {/* Header */}
      <div className="itrip-header">
        <div className="itrip-header-bg">
          <img src="/assets/header-bg.png" alt="" />
        </div>
        <div className="itrip-header-top">
          <div>
            <span className="itrip-title">iTrip</span>
            <span className="itrip-welcome">Welcome , {displayName}</span>
          </div>
        </div>
        <button className="itrip-add-btn" onClick={handleAddTrip}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          เพิ่ม Trip
        </button>
      </div>

      {/* Content */}
      <div className="itrip-content">
        {/* My Trips */}
        <div className="itrip-section">
          <span className="itrip-section-title">My Trip</span>
          <div className="hp-other-trip-grid">
            {myTrips.length > 0 ? (
              myTrips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onCardClick={() => handleTripClick(trip)}
                  onEdit={(t) => navigate(`/trip/${t.id}`)}
                />
              ))
            ) : (
              <div className="itrip-empty">ยังไม่มีทริปของคุณ</div>
            )}
          </div>
        </div>

        {/* Other Trips */}
        {otherTrips.length > 0 && (
          <div className="itrip-section" style={{ display: 'flex' }}>
            <span className="itrip-section-title">Other Trip</span>
            <div className="hp-other-trip-grid">
              {otherTrips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  showEditButton={false}
                  onJoin={() => navigate('/join')}
                  onView={(t) => navigate(`/trip/${t.id}`)}
                  onCardClick={() => handleTripClick(trip)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
