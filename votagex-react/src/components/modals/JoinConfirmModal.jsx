import { useMemo } from 'react';
import { escapeHtml } from '../../utils/helpers';
import useModalClose from '../../hooks/useModalClose';

export default function JoinConfirmModal({ trip, userName, trips, joining, onConfirm, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const currentMembers = (trip.members || []).length;
  const maxMembers = trip.memberCount || 1;
  const isFull = currentMembers >= maxMembers;

  // Check date overlap
  const overlappingTrip = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return null;
    const newStart = new Date(trip.startDate); newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(trip.endDate); newEnd.setHours(0, 0, 0, 0);

    const joinedTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return isCreator || isMember;
    });

    for (const jt of joinedTrips) {
      if (!jt.startDate || !jt.endDate) continue;
      const jtStart = new Date(jt.startDate); jtStart.setHours(0, 0, 0, 0);
      const jtEnd = new Date(jt.endDate); jtEnd.setHours(0, 0, 0, 0);
      if (newStart <= jtEnd && newEnd >= jtStart) return jt;
    }
    return null;
  }, [trip, userName, trips]);

  const canJoin = !isFull && !overlappingTrip;

  return (
    <div className={`join-confirm-overlay${isClosing ? ' closing' : ''}`} style={{ display: 'flex' }} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="join-confirm-card">
        <div className="join-confirm-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="8.5" cy="7" r="4"/>
            <line x1="20" y1="8" x2="20" y2="14"/>
            <line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
        </div>
        <div className="join-confirm-trip-name">{trip.name || 'Trip'}</div>

        {isFull && (
          <div className="join-confirm-warning">ผู้ร่วมทริปเต็มแล้ว ไม่สามารถเข้าร่วมได้</div>
        )}

        {overlappingTrip && (
          <div className="join-confirm-warning">
            คุณมีทริป "<b>{escapeHtml(overlappingTrip.name || 'Trip')}</b>" ที่วันทับกันอยู่แล้ว ต้องออกจากทริปเก่าก่อนจึงจะเข้าร่วมได้
          </div>
        )}

        {canJoin && (
          <div className="join-confirm-text">ยืนยันว่าจะเข้าร่วมทริปนี้?</div>
        )}

        <div className="join-confirm-actions">
          <button className="join-confirm-cancel" onClick={handleClose}>{canJoin ? 'ยกเลิก' : 'ปิด'}</button>
          {canJoin && (
            <button className="join-confirm-ok" disabled={joining} onClick={onConfirm}>
              {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
