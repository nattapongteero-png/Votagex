import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfileImage } from '../services/storage';
import { formatDateShort } from '../utils/dates';
import { isTripOwner, isTripMember } from '../utils/helpers';
import JoinConfirmModal from '../components/modals/JoinConfirmModal';
import TripActionSheet from '../components/modals/TripActionSheet';
import EditTripModal from '../components/modals/EditTripModal';

/* ── Inline stack card ─────────────────────────────────────────── */
function StackCard({ trip, isJoined, onView, onJoin, onEdit, userName }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isExpired = trip.endDate ? new Date(trip.endDate) < today : false;
  const members = trip.members || [];
  const maxMembers = trip.memberCount || 1;
  const isFull = members.length >= maxMembers;
  const canJoin = !isExpired && !isFull && !isJoined;
  const showEdit = isTripOwner(trip) || isTripMember(trip);

  const dateText = (trip.startDate && trip.endDate)
    ? `${formatDateShort(trip.startDate)} – ${formatDateShort(trip.endDate)}`
    : '';

  const showMax = 4;
  const defaultSvg = `<svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;

  return (
    <div className={`sc-inner${isExpired ? ' sc-expired' : ''}`}>
      {/* Cover */}
      <div className="sc-cover">
        {trip.coverImage
          ? <img src={trip.coverImage} alt="" className="sc-cover-img" />
          : <div className="sc-cover-gradient" />
        }
        <div className={`sc-badge${isJoined ? ' joined' : isExpired ? ' expired' : ''}`}>
          {isJoined ? 'My Trip' : isExpired ? 'สิ้นสุดแล้ว' : `${members.length}/${maxMembers} คน`}
        </div>
        {showEdit && (
          <button
            className="sc-edit-btn"
            onClick={(e) => { e.stopPropagation(); onEdit?.(trip); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="5" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="12" cy="19" r="1.2" />
            </svg>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="sc-info">
        <h3 className="sc-name">{trip.name || 'Trip'}</h3>
        {dateText && <div className="sc-date">{dateText}</div>}
        {trip.description && <p className="sc-desc">{trip.description}</p>}

        {/* Avatars */}
        <div className="sc-avatars">
          {members.length > 0 ? (
            <>
              {members.slice(0, showMax).map((m, i) => (
                <div key={i} className="sc-avatar">
                  {m.image ? <img src={m.image} alt="" /> : (m.name || 'U').charAt(0).toUpperCase()}
                </div>
              ))}
              {members.length > showMax && (
                <div className="sc-avatar extra">+{members.length - showMax}</div>
              )}
            </>
          ) : (
            Array.from({ length: Math.min(maxMembers, showMax) }).map((_, i) => (
              <div key={i} className="sc-avatar" dangerouslySetInnerHTML={{ __html: defaultSvg }} />
            ))
          )}
          <span className="sc-member-count">{members.length} / {maxMembers} ผู้ร่วมทริป</span>
        </div>

        {/* Action */}
        <div className="sc-action">
          {isJoined ? (
            <button
              className="sc-btn view"
              onClick={(e) => { e.stopPropagation(); onView?.(trip); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3H21M21 3V7.66667M21 3L15 10" />
                <path d="M12 3C10.9767 3 9.95334 3.11763 8.95043 3.35288C6.17301 4.00437 4.00437 6.17301 3.35288 8.95043C2.88237 10.9563 2.88237 13.0437 3.35288 15.0496C4.00437 17.827 6.17301 19.9956 8.95044 20.6471C10.9563 21.1176 13.0437 21.1176 15.0496 20.6471C17.827 19.9956 19.9956 17.827 20.6471 15.0496C20.8824 14.0466 21 13.0233 21 12" />
              </svg>
              ดูข้อมูลทริป
            </button>
          ) : isExpired ? (
            <button className="sc-btn disabled" disabled>สิ้นสุดทริปแล้ว</button>
          ) : isFull ? (
            <button className="sc-btn disabled" disabled>เต็มแล้ว ({members.length}/{maxMembers})</button>
          ) : (
            <button
              className="sc-btn join"
              onClick={(e) => { e.stopPropagation(); onJoin?.(trip); }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              เข้าร่วมทริป
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────── */
export default function JoinScreen() {
  const navigate = useNavigate();
  const { trips, loadTrips, joinExistingTrip, setCurrentTrip, updateExistingTrip, deleteExistingTrip } = useTrips();
  const { username, userImage, updateUserImage, authUser } = useAuth();

  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [confirmTrip, setConfirmTrip] = useState(null);
  const [joining, setJoining] = useState(false);
  const [actionTrip, setActionTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const fileInputRef = useRef(null);

  // Swipe stack state
  const [cardIndex, setCardIndex] = useState(0);
  const [flyDir, setFlyDir] = useState(null); // 'left' | 'right' | null
  const dragStartX = useRef(0);
  const dragXRef = useRef(0);         // live drag offset (no re-render)
  const topCardRef = useRef(null);    // direct DOM ref for top card
  const bg1Ref = useRef(null);        // mid card ref
  const bg2Ref = useRef(null);        // back card ref
  const isAnimating = useRef(false);

  useEffect(() => { setName(username || ''); if (userImage) setImage(userImage); }, [username, userImage]);
  useEffect(() => { loadTrips(); }, [loadTrips]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      uploadProfileImage(file).then(url => {
        setImage(url);
        updateUserImage(url);
      });
    }
  };

  const handleNext = () => {
    if (!name.trim()) return;
    setCardIndex(0);
    setPage(2);
  };

  const handleJoinConfirm = async () => {
    if (!confirmTrip) return;
    setJoining(true);
    try {
      await joinExistingTrip(confirmTrip.id, { name: name.trim(), image });
      if (image) updateUserImage(image);
      setCurrentTrip({ ...confirmTrip, profileName: name.trim(), profileImage: image });
      setConfirmTrip(null);
      navigate(`/trip/${confirmTrip.id}`);
    } catch (err) {
      console.error('Error joining trip:', err);
      setJoining(false);
    }
  };

  const userName = name.trim() || username || '';

  // Split trips: joined first, then available
  const { joinedTrips, availableTrips } = (() => {
    const joined = [];
    const available = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    [...trips].reverse().forEach(trip => {
      const isCreator = trip.profileName && trip.profileName === userName;
      const isMember = (trip.members || []).some(m => m.name === userName);
      if (isCreator || isMember) joined.push(trip);
      else available.push(trip);
    });
    available.sort((a, b) => {
      const aOk = !(a.endDate && new Date(a.endDate) < today) && !((a.members || []).length >= (a.memberCount || 1));
      const bOk = !(b.endDate && new Date(b.endDate) < today) && !((b.members || []).length >= (b.memberCount || 1));
      return (aOk ? 0 : 1) - (bOk ? 0 : 1);
    });
    return { joinedTrips: joined, availableTrips: available };
  })();

  const allTrips = [...joinedTrips, ...availableTrips];
  const n = allTrips.length;

  const handleGoToTrip = (trip) => {
    setCurrentTrip(trip);
    navigate('/home');
  };

  const handleDelete = async (t) => {
    setActionTrip(null);
    await deleteExistingTrip(t.id);
  };

  const handleLeave = async (t) => {
    setActionTrip(null);
    const m = (t.members || []).filter(m => m.name !== userName);
    const uids = (t.memberUids || []).filter(uid => uid !== authUser?.uid);
    await updateExistingTrip(t.id, { members: m, memberUids: uids });
  };

  const handleEditSave = async (data) => {
    if (editTrip) {
      await updateExistingTrip(editTrip.id, data);
      setEditTrip(null);
    }
  };

  // ── Direct DOM helpers ──
  const applyTopCard = (dx, transition = 'none') => {
    const el = topCardRef.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
  };

  const applyBgCards = (progress) => {
    // progress 0→1 as drag increases: bg cards scale up toward front
    const el1 = bg1Ref.current;
    const el2 = bg2Ref.current;
    if (el1) {
      const s = 0.955 + progress * 0.045;
      const t = 16 - progress * 16;
      el1.style.transform = `scale(${s}) translateY(${t}px)`;
    }
    if (el2) {
      const s = 0.91 + progress * 0.045;
      const t = 32 - progress * 16;
      el2.style.transform = `scale(${s}) translateY(${t}px)`;
    }
  };

  // ── Swipe logic ──
  const goDir = (dir) => {
    if (n <= 1 || isAnimating.current) return;
    isAnimating.current = true;
    // Fly the top card off screen via CSS (smooth)
    const el = topCardRef.current;
    if (el) {
      el.style.transition = 'transform 0.22s ease-in';
      el.style.transform = dir === 'left'
        ? 'translateX(-130%) rotate(-20deg)'
        : 'translateX(130%) rotate(20deg)';
    }
    // Animate bg cards forward
    const el1 = bg1Ref.current;
    const el2 = bg2Ref.current;
    if (el1) { el1.style.transition = 'transform 0.22s ease-in'; el1.style.transform = 'scale(1) translateY(0px)'; }
    if (el2) { el2.style.transition = 'transform 0.22s ease-in'; el2.style.transform = 'scale(0.955) translateY(16px)'; }

    setTimeout(() => {
      isAnimating.current = false;
      dragXRef.current = 0;
      setFlyDir(null); // triggers re-render, cardIndex will update
      setCardIndex(i => dir === 'left' ? (i + 1) % n : (i - 1 + n) % n);
    }, 220);
  };

  const goNext = () => goDir('left');
  const goPrev = () => goDir('right');

  const handlePointerDown = (e) => {
    if (isAnimating.current) return;
    dragStartX.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    const dx = e.clientX - dragStartX.current;
    dragXRef.current = dx;
    const progress = Math.min(Math.abs(dx) / 100, 1);
    // Update DOM directly — no React re-render
    applyTopCard(dx);
    applyBgCards(progress);
  };

  const handlePointerUp = (e) => {
    const dx = dragXRef.current;
    if (dx === 0) return;
    if (dx < -70) {
      goDir('left');
    } else if (dx > 70) {
      goDir('right');
    } else {
      // Snap back with ease animation
      applyTopCard(0, 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)');
      applyBgCards(0);
      if (bg1Ref.current) bg1Ref.current.style.transition = 'transform 0.35s ease';
      if (bg2Ref.current) bg2Ref.current.style.transition = 'transform 0.35s ease';
      dragXRef.current = 0;
    }
  };

  // Build 3 stack layers (render back→front so front is on top in DOM)
  const stackLayers = n > 0 ? [2, 1, 0] : [];

  return (
    <div className="join-screen active">
      <div className="join-container">

        {/* ── Page 1: Profile ── */}
        {page === 1 && (
          <div className="join-page active">
            <div className="page4-layout">
              <div className="join-topbar">
                <button className="btn-back-pill" onClick={() => navigate('/')}>ย้อนกลับ</button>
                <div className="join-dots">
                  <span className="jdot active"></span>
                  <span className="jdot"></span>
                </div>
              </div>

              <h2 className="page2-title">ผู้ร่วม Trip</h2>
              <p className="page2-subtitle">" กรอกชื่อของคุณเพื่อเดินทาง "</p>

              <div className="profile-upload-circle" onClick={() => fileInputRef.current?.click()}>
                {image ? (
                  <img src={image} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
                ) : (
                  <svg width="17" height="17" viewBox="0 0 32 32" fill="none">
                    <path d="M20 30.3333H12C4.75996 30.3333 1.66663 27.24 1.66663 20V12C1.66663 4.75996 4.75996 1.66663 12 1.66663H20C27.24 1.66663 30.3333 4.75996 30.3333 12V20C30.3333 27.24 27.24 30.3333 20 30.3333ZM12 3.66663C5.85329 3.66663 3.66663 5.85329 3.66663 12V20C3.66663 26.1466 5.85329 28.3333 12 28.3333H20C26.1466 28.3333 28.3333 26.1466 28.3333 20V12C28.3333 5.85329 26.1466 3.66663 20 3.66663H12Z" fill="#747474" />
                    <path d="M12 14.3333C9.97337 14.3333 8.33337 12.6933 8.33337 10.6667C8.33337 8.64 9.97337 7 12 7C14.0267 7 15.6667 8.64 15.6667 10.6667C15.6667 12.6933 14.0267 14.3333 12 14.3333ZM12 9C11.08 9 10.3334 9.74667 10.3334 10.6667C10.3334 11.5867 11.08 12.3333 12 12.3333C12.92 12.3333 13.6667 11.5867 13.6667 10.6667C13.6667 9.74667 12.92 9 12 9Z" fill="#747474" />
                  </svg>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
              <p className="profile-upload-label">เพิ่มภาพโปรไฟล์</p>

              <div className="page2-form">
                <input type="text" className="input-pill" placeholder="Username" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="spacer"></div>

              <div className="page2-bottom-fade">
                <button className="btn-gradient" disabled={!name.trim()} onClick={handleNext}>ถัดไป</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Page 2: Swipe Stack ── */}
        {page === 2 && (
          <div className="join-page active">
            <div className="join-stack-layout">
              <div className="join-topbar">
                <button className="btn-back-pill" onClick={() => setPage(1)}>ย้อนกลับ</button>
                <div className="join-dots">
                  <span className="jdot"></span>
                  <span className="jdot active"></span>
                </div>
              </div>

              <div className="join-stack-header">
                <h2 className="join-stack-title">เลือกทริป</h2>
                {n > 0 && (
                  <span className="join-stack-counter">{cardIndex + 1} / {n}</span>
                )}
              </div>

              {/* Stack area */}
              <div className="join-stack-area">
                {n === 0 ? (
                  <div className="join-stack-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M8 2v4M16 2v4M3 10h18" />
                    </svg>
                    <p>ยังไม่มีทริป</p>
                  </div>
                ) : (
                  // Render back→front (z-index handles stacking)
                  [2, 1, 0].map(stackPos => {
                    const tripIdx = (cardIndex + stackPos) % n;
                    const trip = allTrips[tripIdx];
                    const isTop = stackPos === 0;
                    const isJoined = joinedTrips.some(t => t.id === trip.id);

                    // Static initial CSS (DOM manipulation updates top card during drag)
                    const staticStyle = isTop
                      ? { zIndex: 3, top: 0, opacity: 1 }
                      : stackPos === 1
                        ? { zIndex: 2, top: '16px', transform: 'scale(0.955) translateY(16px)', opacity: 0.82 }
                        : { zIndex: 1, top: '32px', transform: 'scale(0.91) translateY(32px)', opacity: 0.65 };

                    return (
                      <div
                        key={stackPos}
                        ref={isTop ? topCardRef : stackPos === 1 ? bg1Ref : bg2Ref}
                        className={`join-stack-card${isTop ? ' top' : ''}`}
                        style={{ ...staticStyle, pointerEvents: isTop ? 'auto' : 'none' }}
                        onPointerDown={isTop ? handlePointerDown : undefined}
                        onPointerMove={isTop ? handlePointerMove : undefined}
                        onPointerUp={isTop ? handlePointerUp : undefined}
                        onPointerCancel={isTop ? handlePointerUp : undefined}
                      >
                        <StackCard
                          trip={trip}
                          isJoined={isJoined}
                          userName={userName}
                          onView={handleGoToTrip}
                          onJoin={(t) => setConfirmTrip(t)}
                          onEdit={(t) => setActionTrip(t)}
                        />
                      </div>
                    );
                  })
                )}
              </div>

              {/* Nav arrows */}
              {n > 1 && (
                <div className="join-stack-nav">
                  <button className="join-nav-btn" onClick={goPrev}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span className="join-nav-hint">ปัดเพื่อเปลี่ยนทริป</span>
                  <button className="join-nav-btn" onClick={goNext}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {confirmTrip && (
        <JoinConfirmModal
          trip={confirmTrip}
          userName={name.trim()}
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
