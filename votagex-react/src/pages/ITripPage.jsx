import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import TripCard from '../components/common/TripCard';
import TripActionSheet from '../components/modals/TripActionSheet';
import EditTripModal from '../components/modals/EditTripModal';
import JoinConfirmModal from '../components/modals/JoinConfirmModal';

export default function ITripPage() {
  const navigate = useNavigate();
  const { trips, loadTrips, resetTripForm, setCurrentTrip, updateExistingTrip, deleteExistingTrip, joinExistingTrip } = useTrips();
  const { username, authUser, userImage, updateUserImage } = useAuth();
  const [actionTrip, setActionTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [confirmTrip, setConfirmTrip] = useState(null);
  const [joining, setJoining] = useState(false);

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

  const handleJoinConfirm = async () => {
    if (!confirmTrip) return;
    setJoining(true);
    try {
      await joinExistingTrip(confirmTrip.id, { name: username, image: userImage });
      if (userImage) updateUserImage(userImage);
      setCurrentTrip({ ...confirmTrip });
      setConfirmTrip(null);
      navigate(`/trip/${confirmTrip.id}`);
    } catch (err) {
      console.error('Error joining trip:', err);
      setJoining(false);
    }
  };

  const handleAddTrip = () => {
    resetTripForm();
    navigate('/create');
  };

  const handleTripClick = (trip) => {
    setCurrentTrip(trip);
    navigate(`/trip/${trip.id}`);
  };

  const handleDelete = async (t) => {
    setActionTrip(null);
    await deleteExistingTrip(t.id);
  };

  const handleLeave = async (t) => {
    setActionTrip(null);
    const m = (t.members || []).filter(m => m.name !== username);
    const uids = (t.memberUids || []).filter(uid => uid !== authUser?.uid);
    await updateExistingTrip(t.id, { members: m, memberUids: uids });
  };

  const handleEditSave = async (data) => {
    if (editTrip) {
      await updateExistingTrip(editTrip.id, data);
      setEditTrip(null);
    }
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96696 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7648C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#363853" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/>
            <path d="M9.66665 8.00016H6.33331M7.99998 9.66683L7.99998 6.3335" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
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
                  onEdit={(t) => setActionTrip(t)}
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
                  onJoin={(t) => setConfirmTrip(t)}
                  onView={(t) => navigate(`/trip/${t.id}`)}
                  onCardClick={() => setConfirmTrip(trip)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {confirmTrip && (
        <JoinConfirmModal
          trip={confirmTrip}
          userName={username || ''}
          trips={trips}
          joining={joining}
          onConfirm={handleJoinConfirm}
          onClose={() => { setConfirmTrip(null); setJoining(false); }}
        />
      )}

      {actionTrip && (
        <TripActionSheet
          trip={actionTrip}
          onClose={() => setActionTrip(null)}
          onEdit={(t) => { setActionTrip(null); setEditTrip(t); }}
          onDelete={handleDelete}
          onLeave={handleLeave}
        />
      )}
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          onClose={() => setEditTrip(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
