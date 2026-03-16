import { useState } from 'react';
import useModalClose from '../../hooks/useModalClose';
import ConfirmModal from './ConfirmModal';
import { isTripOwner } from '../../utils/helpers';

export default function MembersModal({ trip, onClose, onRemoveMember }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const members = trip.members || [];
  const isOwner = isTripOwner(trip);

  // Build member list: creator first, then joined members
  const allMembers = [];
  if (trip.profileName) {
    allMembers.push({ name: trip.profileName, image: trip.profileImage || '', isCreator: true });
  }
  members.forEach(m => {
    if (m.name !== trip.profileName) {
      allMembers.push({ name: m.name, image: m.image || '', isCreator: false });
    }
  });

  const handleRemove = (memberName) => {
    setConfirmTarget(memberName);
  };

  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-sheet members-sheet">
        <div className="members-sheet-header">
          <div>
            <h3 className="members-sheet-title">ผู้ร่วมทริป</h3>
            <p className="members-sheet-desc">เพื่อนผู้ร่วมทริปการเดินทางกับคุณ</p>
          </div>
          <button className="modal-close-btn" onClick={handleClose}>
            <svg viewBox="0 0 32 32" fill="none" width="24" height="24">
              <path d="M19.1921 12.793L12.8027 19.1823" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className="members-sheet-divider"></div>
        <div className="members-sheet-list">
          {allMembers.length > 0 ? (
            allMembers.map((member, idx) => (
              <div key={idx}>
                {idx > 0 && <div className="member-row-divider"></div>}
                <div className="member-row">
                  <div className="member-row-avatar">
                    {member.image ? (
                      <img src={member.image} alt="" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    )}
                  </div>
                  <span className="member-row-name">
                    {member.name}{member.isCreator ? ' (เจ้าของทริป)' : ''}
                  </span>
                  {isOwner && !member.isCreator && (
                    <button className="member-row-delete" title="ลบ" onClick={() => handleRemove(member.name)}>
                      <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                        <path d="M3.33333 4.6884H12.6667V8.11722C12.6667 9.16726 12.5189 10.212 12.2279 11.2202C11.8265 12.6105 10.671 13.6464 9.25448 13.8858L9.1493 13.9036C8.3884 14.0321 7.61158 14.0321 6.85067 13.9036L6.74551 13.8858C5.32896 13.6464 4.17345 12.6105 3.7721 11.2202C3.48106 10.212 3.33333 9.16726 3.33333 8.11724V4.6884Z" fill="#E62E05" fillOpacity="0.15"/>
                        <path d="M2 4.1884C1.72386 4.1884 1.5 4.41225 1.5 4.6884C1.5 4.96454 1.72386 5.1884 2 5.1884V4.6884V4.1884ZM14 5.1884C14.2761 5.1884 14.5 4.96454 14.5 4.6884C14.5 4.41225 14.2761 4.1884 14 4.1884V4.6884V5.1884ZM3.33333 4.6884V4.1884H2.83333V4.6884H3.33333ZM12.6667 4.6884H13.1667V4.1884H12.6667V4.6884ZM3.33333 4.6884H3.83333V8.11724H3.33333H2.83333V4.6884H3.33333ZM12.6667 4.6884H12.1667V8.11722H12.6667H13.1667V4.6884H12.6667ZM2 4.6884V5.1884H14V4.6884V4.1884H2V4.6884ZM5 4.6884H5.5C5.5 4.40911 5.5613 4.13099 5.68222 3.86938L5.22836 3.65959L4.7745 3.44981C4.5939 3.84053 4.5 4.26159 4.5 4.6884H5ZM8 2V2.5C8.33546 2.5 8.66659 2.55926 8.97406 2.67339L9.14805 2.20464L9.32205 1.73589C8.90156 1.57981 8.45247 1.5 8 1.5V2ZM10.5 4.6884H11C11 4.26159 10.9061 3.84053 10.7255 3.44981L10.2716 3.65959L9.81775 3.86938C9.9387 4.131 10 4.40911 10 4.6884H10.5ZM6.66675 8V10.6667M9.33341 8V10.6667" stroke="#E62E05" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: '#a3a3a3', padding: 24, fontSize: 14 }}>ยังไม่มีผู้ร่วมทริป</div>
          )}
        </div>
      </div>
      {confirmTarget && (
        <ConfirmModal
          icon="delete"
          message={`ต้องการลบสมาชิกรายนี้ใช่ไหม ?`}
          confirmText="ลบสมาชิก"
          onConfirm={() => { onRemoveMember?.(confirmTarget); setConfirmTarget(null); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
}
