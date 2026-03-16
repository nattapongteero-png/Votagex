import { formatDateShort } from '../../utils/dates';
import { isTripOwner, isTripMember } from '../../utils/helpers';

export default function TripCard({ trip, showEditButton, onEdit, onJoin, onView, onCardClick }) {
  const isExpired = trip.endDate ? new Date(trip.endDate) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
  const currentMembers = (trip.members || []).length;
  const maxMembers = trip.memberCount || 1;
  const isFull = currentMembers >= maxMembers;
  const isJoined = isTripOwner(trip) || isTripMember(trip);
  const disabled = isExpired || (!isJoined && isFull);

  const dateText = (trip.startDate && trip.endDate)
    ? `${formatDateShort(trip.startDate)} - ${formatDateShort(trip.endDate)}`
    : '';

  const members = trip.members || [];
  const showMax = 3;

  const showEdit = showEditButton !== false && (isTripOwner(trip) || isTripMember(trip));

  const defaultAvatarSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

  return (
    <div className={`hp-other-card${disabled ? ' disabled' : ''}${isExpired ? ' expired' : ''}`} onClick={isExpired ? undefined : onCardClick}>
      <div className="hp-other-card-top">
        <div className="hp-other-flag">
          {trip.coverImage ? (
            <img src={trip.coverImage} alt="" />
          ) : (
            <svg className="flag-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
        {showEdit && (
          <button className="hp-other-edit-btn" title="แก้ไข/ลบ" onClick={(e) => { e.stopPropagation(); onEdit?.(trip); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        )}
      </div>

      <div className="hp-other-details">
        <div className="hp-other-name">{trip.name || 'Trip'}</div>
        {dateText && <div className="hp-other-date">{dateText}</div>}
        {trip.description && <div className="hp-other-desc">{trip.description}</div>}
      </div>

      <div className="hp-other-avatars">
        {members.length > 0 ? (
          <>
            {members.slice(0, showMax).map((m, i) => (
              <div key={i} className="hp-other-avatar">
                {m.image ? <img src={m.image} alt="" /> : (m.name || 'U').charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length > showMax && (
              <div className="hp-other-avatar extra">+{members.length - showMax}</div>
            )}
          </>
        ) : (
          <>
            {Array.from({ length: Math.min(maxMembers, showMax) }).map((_, i) => (
              <div key={i} className="hp-other-avatar" dangerouslySetInnerHTML={{ __html: defaultAvatarSvg }} />
            ))}
            {maxMembers > showMax && (
              <div className="hp-other-avatar extra">+{maxMembers - showMax}</div>
            )}
          </>
        )}
      </div>

      {isExpired ? (
        <button className="hp-other-join-btn hp-expired-view" disabled>สิ้นสุดทริป</button>
      ) : isJoined ? (
        <button className="hp-other-join-btn hp-other-view-btn" onClick={(e) => { e.stopPropagation(); onView ? onView(trip) : onCardClick?.(); }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 3C10.9767 3 9.95334 3.11763 8.95043 3.35288C6.17301 4.00437 4.00437 6.17301 3.35288 8.95043C2.88237 10.9563 2.88237 13.0437 3.35288 15.0496C4.00437 17.827 6.17301 19.9956 8.95044 20.6471C10.9563 21.1176 13.0437 21.1176 15.0496 20.6471C17.827 19.9956 19.9956 17.827 20.6471 15.0496C20.8824 14.0466 21 13.0233 21 12" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
            <path d="M17 3H21M21 3V7.66667M21 3L15 10" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          ดูข้อมูลทริป
        </button>
      ) : isFull ? (
        <button className="hp-other-join-btn" disabled>เต็มแล้ว ({currentMembers}/{maxMembers})</button>
      ) : (
        <button className="hp-other-join-btn" onClick={(e) => { e.stopPropagation(); onJoin?.(trip); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          เข้าร่วม ({currentMembers}/{maxMembers})
        </button>
      )}
    </div>
  );
}
