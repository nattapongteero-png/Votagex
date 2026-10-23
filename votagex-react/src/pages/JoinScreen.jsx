import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { uploadProfileImage } from '../services/storage';
import { formatDateShort } from '../utils/dates';
import { isTripOwner, isTripMember } from '../utils/helpers';
import JoinConfirmModal from '../components/modals/JoinConfirmModal';
import TripActionSheet from '../components/modals/TripActionSheet';
import EditTripModal from '../components/modals/EditTripModal';

/* ── Helpers ── */
function fmtB(n) {
  if (n === null || n === undefined || isNaN(n)) return '-';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return `${sign}${(abs / 1000000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${Math.round(abs)}`;
}

const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
function fmtThaiDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  if (isNaN(d)) return '-';
  return `${THAI_DAYS[d.getDay()]} ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── Inline stack card (Figma-exact) ─────────────────────────── */
function StackCard({ trip, isJoined, isOwner, onView, onJoin }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const isExpired = trip.endDate ? new Date(trip.endDate) < today : false;
  const members = trip.members || [];
  const maxMembers = trip.memberCount || 1;
  const isFull = members.length >= maxMembers;

  const totalBudget = parseFloat(trip.budget) || 0;
  const spent = (trip.activities || []).reduce((s, a) => s + (parseFloat(a.cost) || 0), 0);
  const remaining = totalBudget - spent;
  const hasBudget = totalBudget > 0;
  const showMax = 3;

  const statusClass = isJoined ? ' sc-joined' : isExpired ? ' sc-expired' : isFull ? ' sc-full' : '';

  return (
    <div className={`sc-inner${statusClass}`}>

      {/* ── Corner ribbon ── */}
      {isJoined && <div className={`sc-ribbon${!isOwner ? ' member' : ''}`}>{isOwner ? 'My Trip' : 'Member'}</div>}
      {isExpired && !isJoined && <div className="sc-ribbon expired">สิ้นสุดแล้ว</div>}

      {/* ── Header: circle cover + trip/owner info ── */}
      <div className="sc-header">
        <div className="sc-cover-circle">
          {trip.coverImage
            ? <img src={trip.coverImage} alt="" />
            : <div className="sc-cover-placeholder" />}
        </div>
        <div className="sc-meta">
          <div className="sc-meta-row">
            <span className="sc-label">ทริป</span>
            <span className="sc-trip-name">{trip.name || 'Trip'}</span>
          </div>
          <div className="sc-meta-row">
            <span className="sc-label">เจ้าของทริป</span>
            <span className="sc-trip-name">{trip.profileName || '-'}</span>
          </div>
        </div>
      </div>

      <div className="sc-divider" />

      {/* ── Description ── */}
      <div className="sc-desc-area">
        {trip.description || <span className="sc-no-desc">ไม่มีคำอธิบาย</span>}
      </div>

      <div className="sc-divider" />

      {/* ── Travel date section (Figma: เดินทางไป – เดินทางกลับ) ── */}
      {(trip.startDate || trip.endDate) && (
        <div className="sc-travel">
          <div className="sc-travel-col left">
            <span className="sc-travel-date">{fmtThaiDate(trip.startDate)}</span>
            <span className="sc-travel-label">เดินทางไป</span>
            <span className="sc-travel-place">{trip.name || '-'}</span>
          </div>
          <div className="sc-travel-line" />
          <div className="sc-travel-col right">
            <span className="sc-travel-date">{fmtThaiDate(trip.endDate)}</span>
            <span className="sc-travel-label">เดินทางกลับ</span>
            <span className="sc-travel-place">กลับ</span>
          </div>
        </div>
      )}

      <div className="sc-divider" />

      {/* ── Budget row ── */}
      {hasBudget ? (
        <div className="sc-budget-row">
          <div className="sc-budget-item">
            <span className="sc-budget-label">งบทั้งหมด</span>
            <span className="sc-budget-amount blue">{fmtB(totalBudget)}</span>
          </div>
          <div className="sc-budget-item">
            <span className="sc-budget-label">เงินที่ใช้ไป</span>
            <span className="sc-budget-amount red">{spent > 0 ? `-${fmtB(spent)}` : '0'}</span>
          </div>
          <div className="sc-budget-item">
            <span className="sc-budget-label">คงเหลือ</span>
            <span className="sc-budget-amount green">{fmtB(remaining)}</span>
          </div>
        </div>
      ) : (
        <div className="sc-budget-empty">ยังไม่ได้ตั้งงบประมาณ</div>
      )}

      {/* ── Footer: avatars + action button ── */}
      <div className="sc-footer">
        <div className="sc-footer-avatars">
          {members.slice(0, showMax).map((m, i) => (
            <div key={i} className="sc-avatar-lg">
              {m.image ? <img src={m.image} alt="" /> : (m.name || 'U').charAt(0).toUpperCase()}
            </div>
          ))}
          {members.length > showMax && (
            <div className="sc-avatar-lg extra">+{members.length - showMax}</div>
          )}
          <span className="sc-member-label">{members.length}/{maxMembers} คน</span>
        </div>

        {isJoined ? (
          <button className="sc-btn view" onClick={(e) => { e.stopPropagation(); onView?.(trip); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3H21M21 3V7.66667M21 3L15 10" />
              <path d="M12 3C10.9767 3 9.95334 3.11763 8.95043 3.35288C6.17301 4.00437 4.00437 6.17301 3.35288 8.95043C2.88237 10.9563 2.88237 13.0437 3.35288 15.0496C4.00437 17.827 6.17301 19.9956 8.95044 20.6471C10.9563 21.1176 13.0437 21.1176 15.0496 20.6471C17.827 19.9956 19.9956 17.827 20.6471 15.0496C20.8824 14.0466 21 13.0233 21 12" />
            </svg>
            ดูทริป
          </button>
        ) : isExpired ? (
          <button className="sc-btn disabled" disabled>สิ้นสุดแล้ว</button>
        ) : isFull ? (
          <button className="sc-btn disabled" disabled>เต็มแล้ว</button>
        ) : (
          <button className="sc-btn join" onClick={(e) => { e.stopPropagation(); onJoin?.(trip); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            เข้าร่วม
          </button>
        )}
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
  const dragStartX = useRef(0);
  const dragXRef = useRef(0);         // live drag offset (no re-render)
  const isDraggingRef = useRef(false);
  const topCardRef = useRef(null);    // direct DOM ref for top card
  const bg1Ref = useRef(null);        // mid card ref
  const bg2Ref = useRef(null);        // back card ref
  const areaRef = useRef(null);
  const isAnimating = useRef(false);

  useEffect(() => { setName(username || ''); if (userImage) setImage(userImage); }, [username, userImage]);
  useEffect(() => { loadTrips(); }, [loadTrips]);

  // Measure top card height to fix container — prevents layout shift during swipe
  useEffect(() => {
    if (page === 2 && topCardRef.current && areaRef.current) {
      areaRef.current.style.height = (topCardRef.current.offsetHeight + 32) + 'px';
    }
  }, [cardIndex, trips.length, page]);

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
    const el1 = bg1Ref.current;
    const el2 = bg2Ref.current;
    if (el1) {
      const s = 0.96 + progress * 0.04;
      const t = 14 - progress * 14;
      el1.style.transform = `scale(${s}) translateY(${t}px)`;
    }
    if (el2) {
      const s = 0.92 + progress * 0.04;
      const t = 28 - progress * 14;
      el2.style.transform = `scale(${s}) translateY(${t}px)`;
    }
  };

  // ── Swipe logic ──
  const goDir = (dir) => {
    if (n <= 1 || isAnimating.current) return;
    isAnimating.current = true;
    // Fly the top card off screen
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
    if (el2) { el2.style.transition = 'transform 0.22s ease-in'; el2.style.transform = 'scale(0.96) translateY(14px)'; }

    setTimeout(() => {
      // 1. Clear ALL inline styles from refs so React can apply staticStyle cleanly
      //    (if we leave the transition, React's style update would animate instead of snap)
      [topCardRef, bg1Ref, bg2Ref].forEach(ref => {
        if (ref.current) {
          ref.current.style.transition = 'none';
          ref.current.style.transform = '';
        }
      });
      // 2. flushSync = React re-renders synchronously in this same JS tick,
      //    so the browser never paints the "cleared" intermediate state
      flushSync(() => {
        setCardIndex(i => dir === 'left' ? (i + 1) % n : (i - 1 + n) % n);
      });
      isAnimating.current = false;
      dragXRef.current = 0;
    }, 220);
  };

  const goNext = () => goDir('left');
  const goPrev = () => goDir('right');

  const handlePointerDown = (e) => {
    if (isAnimating.current) return;
    if (e.target.closest('button')) return;

    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
    dragXRef.current = 0;

    const onMove = (ev) => {
      if (!isDraggingRef.current) return;
      ev.preventDefault();
      const dx = ev.clientX - dragStartX.current;
      dragXRef.current = dx;
      applyTopCard(dx);
      applyBgCards(Math.min(Math.abs(dx) / 100, 1));
    };

    const snapBack = () => {
      if (bg1Ref.current) {
        bg1Ref.current.style.transition = 'transform 0.3s ease';
        bg1Ref.current.style.transform = 'scale(0.96) translateY(14px)';
      }
      if (bg2Ref.current) {
        bg2Ref.current.style.transition = 'transform 0.3s ease';
        bg2Ref.current.style.transform = 'scale(0.92) translateY(28px)';
      }
      applyTopCard(0, 'transform 0.3s ease-out');
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      const dx = dragXRef.current;
      dragXRef.current = 0;

      // Only swipe if there are multiple trips; otherwise always snap back
      if (Math.abs(dx) > 70 && n > 1) {
        goDir(dx < 0 ? 'left' : 'right');
      } else {
        snapBack();
      }
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
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
                <button className="btn-back-round" aria-label="ย้อนกลับ" onClick={() => navigate('/')}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
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
                    <path d="M20 30.3333H12C4.75996 30.3333 1.66663 27.24 1.66663 20V12C1.66663 4.75996 4.75996 1.66663 12 1.66663H20C27.24 1.66663 30.3333 4.75996 30.3333 12V20C30.3333 27.24 27.24 30.3333 20 30.3333ZM12 3.66663C5.85329 3.66663 3.66663 5.85329 3.66663 12V20C3.66663 26.1466 5.85329 28.3333 12 28.3333H20C26.1466 28.3333 28.3333 26.1466 28.3333 20V12C28.3333 5.85329 26.1466 3.66663 20 3.66663H12Z" fill="#6b7280" />
                    <path d="M12 14.3333C9.97337 14.3333 8.33337 12.6933 8.33337 10.6667C8.33337 8.64 9.97337 7 12 7C14.0267 7 15.6667 8.64 15.6667 10.6667C15.6667 12.6933 14.0267 14.3333 12 14.3333ZM12 9C11.08 9 10.3334 9.74667 10.3334 10.6667C10.3334 11.5867 11.08 12.3333 12 12.3333C12.92 12.3333 13.6667 11.5867 13.6667 10.6667C13.6667 9.74667 12.92 9 12 9Z" fill="#6b7280" />
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
                <button className="btn-back-round" aria-label="ย้อนกลับ" onClick={() => setPage(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg></button>
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
              <div className="join-stack-area" ref={areaRef}>
                {n === 0 ? (
                  <div className="join-stack-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M8 2v4M16 2v4M3 10h18" />
                    </svg>
                    <p>ยังไม่มีทริป</p>
                  </div>
                ) : (
                  // Render back→front; only show as many layers as there are trips
                  (n === 1 ? [0] : n === 2 ? [1, 0] : [2, 1, 0]).map(stackPos => {
                    const tripIdx = (cardIndex + stackPos) % n;
                    const trip = allTrips[tripIdx];
                    const isTop = stackPos === 0;
                    const isJoined = joinedTrips.some(t => t.id === trip.id);
                    const isOwner = trip.profileName && trip.profileName === userName;

                    // Static initial CSS (DOM manipulation updates top card during drag)
                    const staticStyle = isTop
                      ? { zIndex: 3, opacity: 1 }
                      : stackPos === 1
                        ? { zIndex: 2, transform: 'scale(0.96) translateY(14px)', opacity: 0.85 }
                        : { zIndex: 1, transform: 'scale(0.92) translateY(28px)', opacity: 0.7 };

                    return (
                      <div
                        key={stackPos}
                        ref={isTop ? topCardRef : stackPos === 1 ? bg1Ref : bg2Ref}
                        className={`join-stack-card${isTop ? ' top' : ''}`}
                        style={{ ...staticStyle, pointerEvents: isTop ? 'auto' : 'none' }}
                        onPointerDown={isTop ? handlePointerDown : undefined}
                      >
                        <StackCard
                          trip={trip}
                          isJoined={isJoined}
                          isOwner={isOwner}
                          onView={handleGoToTrip}
                          onJoin={(t) => setConfirmTrip(t)}
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
