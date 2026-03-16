import { useMemo, useRef, useEffect } from 'react';
import useModalClose from '../../hooks/useModalClose';

export default function JoinConfirmModal({ trip, userName, trips, joining, onConfirm, onClose }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const currentMembers = (trip.members || []).length;
  const maxMembers = trip.memberCount || 1;
  const isFull = currentMembers >= maxMembers;

  // Prevent click-through from the card button that opened this modal
  const readyRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { readyRef.current = true; }, 300);
    return () => clearTimeout(t);
  }, []);

  // Check date overlap — exclude the trip being joined to avoid self-overlap
  const overlappingTrip = useMemo(() => {
    if (!trip.startDate || !trip.endDate) return null;
    const newStart = new Date(trip.startDate); newStart.setHours(0, 0, 0, 0);
    const newEnd = new Date(trip.endDate); newEnd.setHours(0, 0, 0, 0);

    const joinedTrips = trips.filter(t => {
      if (t.id === trip.id) return false; // ไม่นับ trip ที่กำลังจะเข้าร่วม
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
  const isWarning = isFull || !!overlappingTrip;

  return (
    <div className={`jcm-overlay${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget && readyRef.current) handleClose(); }}>
      <div className={`jcm-card${isWarning ? ' warning' : ''}`}>

        {/* Icon */}
        <div className={`jcm-icon-wrap${isWarning ? ' warn' : ' info'}`}>
          {isWarning ? (
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M19.9998 35C9.1758 35 4.92761 34.2311 4.23905 30.3389C3.55049 26.4466 7.95621 19.129 9.31387 16.7141C13.8541 8.64013 16.9394 5 19.9998 5C23.0603 5 26.1456 8.64013 30.6858 16.7141C32.0435 19.129 36.4492 26.4466 35.7606 30.3389C35.0738 34.2311 30.8239 35 19.9998 35Z" stroke="#EAAA08" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.9998 14.1665V20.6582" stroke="#EAAA08" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.9928 26.4915H20.0078" stroke="#EAAA08" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.9724 20.3682C8.73343 20.3682 5.96643 19.8782 5.96643 17.9162C5.96643 15.9542 8.71543 14.2462 11.9724 14.2462C15.2114 14.2462 17.9784 15.9382 17.9784 17.8992C17.9784 19.8602 15.2294 20.3682 11.9724 20.3682Z" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M11.9725 11.4487C14.0985 11.4487 15.8225 9.72569 15.8225 7.59969C15.8225 5.47369 14.0985 3.74969 11.9725 3.74969C9.84645 3.74969 8.12245 5.47369 8.12245 7.59969C8.11645 9.71769 9.82645 11.4417 11.9455 11.4487H11.9725Z" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" d="M18.3622 10.3916C19.5992 10.0606 20.5112 8.9326 20.5112 7.5896C20.5112 6.1886 19.5182 5.0186 18.1962 4.7486" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" d="M18.9431 13.5444C20.6971 13.5444 22.1951 14.7334 22.1951 15.7954C22.1951 16.4204 21.6781 17.1014 20.8941 17.2854" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" d="M5.58372 10.3916C4.34572 10.0606 3.43372 8.9326 3.43372 7.5896C3.43372 6.1886 4.42772 5.0186 5.74872 4.7486" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" d="M5.00176 13.5444C3.24776 13.5444 1.74976 14.7334 1.74976 15.7954C1.74976 16.4204 2.26676 17.1014 3.05176 17.2854" stroke="#2463eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Title */}
        <div className="jcm-title">
          {isWarning ? 'แจ้งเตือน!' : trip.name || 'Trip'}
        </div>

        {/* Body */}
        {isFull && (
          <div className="jcm-body">
            ทริป <span className="jcm-highlight">"{trip.name || 'Trip'}"</span> มีสมาชิกเต็มแล้ว<br />ไม่สามารถเข้าร่วมได้ในขณะนี้
          </div>
        )}

        {overlappingTrip && !isFull && (
          <div className="jcm-body">
            คุณมีทริป <span className="jcm-highlight">"{overlappingTrip.name || 'Trip'}"</span> ที่มีวันที่ทับซ้อนกันอยู่แล้ว<br />กรุณาออกจากทริปเก่าก่อนจึงจะสามารถเข้าร่วมได้
          </div>
        )}

        {canJoin && (
          <div className="jcm-body">
            ยืนยันว่าต้องการเข้าร่วม<br /><span className="jcm-highlight">"{trip.name || 'Trip'}"</span> ใช่หรือไม่?
          </div>
        )}

        {/* Actions */}
        <div className={`jcm-actions${canJoin ? ' two' : ' one'}`}>
          {canJoin && (
            <button className="jcm-btn cancel" onClick={handleClose}>ยกเลิก</button>
          )}
          {canJoin ? (
            <button className="jcm-btn confirm" disabled={joining} onClick={onConfirm}>
              {joining ? 'กำลังเข้าร่วม...' : 'เข้าร่วม'}
            </button>
          ) : (
            <button className="jcm-btn warn-ok" onClick={handleClose}>ตกลง</button>
          )}
        </div>

      </div>
    </div>
  );
}
