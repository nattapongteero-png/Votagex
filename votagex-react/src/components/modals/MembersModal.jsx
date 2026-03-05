import { escapeHtml } from '../../utils/helpers';
import useModalClose from '../../hooks/useModalClose';

export default function MembersModal({ trip, onClose, onRemoveMember }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  const members = trip.members || [];

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
    if (confirm(`ลบ ${memberName} ออกจากทริปนี้?`)) {
      onRemoveMember?.(memberName);
    }
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
                    {escapeHtml(member.name)}{member.isCreator ? ' (เจ้าของทริป)' : ''}
                  </span>
                  {!member.isCreator && (
                    <button className="member-row-delete" title="ลบ" onClick={() => handleRemove(member.name)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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
    </div>
  );
}
