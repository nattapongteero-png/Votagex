import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_AVATAR } from '../constants/avatars';
import { formatISODate, activityMatchesDate, formatDateThaiShort } from '../utils/dates';
import ActivityCard from '../components/common/ActivityCard';
import TripCard from '../components/common/TripCard';
import ActivityModal from '../components/modals/ActivityModal';
import ActivityDetailModal from '../components/modals/ActivityDetailModal';
import JoinConfirmModal from '../components/modals/JoinConfirmModal';
import MonthPickerSheet from '../components/modals/MonthPickerSheet';
import useSheetSnap from '../hooks/useSheetSnap';

function getStartOfWeek(baseDate, offset) {
  const dayOfWeek = baseDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(baseDate);
  startOfWeek.setDate(baseDate.getDate() + mondayOffset + (offset * 7));
  return startOfWeek;
}

function getActivityStatus(act) {
  if (act.checkedIn) return 'checked-in';
  const now = new Date();
  if (!act.tripDay || !act.time) return 'pending';
  const [h, m] = act.time.split(':').map(Number);
  const actDate = new Date(act.tripDay);
  actDate.setHours(h || 0, m || 0, 0, 0);
  const diffMin = (now - actDate) / 60000;
  if (diffMin > 60) return 'missed';
  return 'pending';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { trips, loadTrips, currentTrip, resetTripForm, updateExistingTrip, joinExistingTrip, setCurrentTrip } = useTrips();
  const { username, userImage, authUser, updateUserImage } = useAuth();

  const [selectedDate, setSelectedDate] = useState(formatISODate(new Date()));
  const [weekOffset, setWeekOffset] = useState(0);
  const [slideAnim, setSlideAnim] = useState('');
  const [confirmTrip, setConfirmTrip] = useState(null);
  const [joining, setJoining] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [detailActivity, setDetailActivity] = useState(null);
  const [detailActivityIndex, setDetailActivityIndex] = useState(-1);
  const [showActivityEditModal, setShowActivityEditModal] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const contentRef = useRef(null);
  const collapsedRef = useRef(false);
  const pageRef = useRef(null);
  useSheetSnap(pageRef);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const top = el.scrollTop;
      if (!collapsedRef.current && top > 30) {
        collapsedRef.current = true;
        setHeaderCollapsed(true);
      } else if (collapsedRef.current && top < 10) {
        collapsedRef.current = false;
        setHeaderCollapsed(false);
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Find the user's current/latest trip
  const homeTrip = useMemo(() => {
    if (currentTrip) return currentTrip;
    const userName = username || '';
    const joinedTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return isCreator || isMember;
    });
    if (joinedTrips.length === 0) return null;

    // Find the nearest upcoming or ongoing trip
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sorted = [...joinedTrips].sort((a, b) => {
      const aStart = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
      const bStart = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
      const aDiff = Math.abs(aStart - today);
      const bDiff = Math.abs(bStart - today);
      return aDiff - bDiff;
    });
    return sorted[0];
  }, [currentTrip, trips, username]);

  // Countdown (follows selectedDate)
  const countdownData = useMemo(() => {
    const userName = username || '';
    const selDate = new Date(selectedDate); selDate.setHours(0, 0, 0, 0);

    const joinedTrips = trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return isCreator || isMember;
    });

    if (joinedTrips.length === 0) {
      return { num: '', label: 'ไม่มีทริปของคุณ', isOngoing: false, noTrip: true };
    }

    // Check if selectedDate falls within any trip
    for (const trip of joinedTrips) {
      if (!trip.startDate) continue;
      const start = new Date(trip.startDate); start.setHours(0, 0, 0, 0);
      const end = trip.endDate ? new Date(trip.endDate) : start; end.setHours(0, 0, 0, 0);
      if (selDate >= start && selDate <= end) {
        const dayNum = Math.round((selDate - start) / 86400000) + 1;
        const tripName = trip.name || '';
        return { num: `Day ${dayNum}`, label: tripName ? `- ${tripName}` : '', isOngoing: true };
      }
    }

    // Not in any trip — find nearest upcoming trip from selectedDate
    let nearestDays = Infinity;
    let nearestTrip = null;
    joinedTrips.forEach(t => {
      if (t.startDate) {
        const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
        const diff = Math.ceil((start - selDate) / 86400000);
        if (diff > 0 && diff < nearestDays) {
          nearestDays = diff;
          nearestTrip = t;
        }
      }
    });

    if (nearestTrip) {
      const tripName = nearestTrip.name || '';
      return { num: String(nearestDays), label: tripName ? `Days - ${tripName}` : 'Days', isOngoing: false };
    }

    // No upcoming trips from this date
    return { num: '', label: 'ไม่มีทริปของคุณ', isOngoing: false, noTrip: true };
  }, [selectedDate, trips, username]);

  // Activities per day (week strip + month picker)
  const activityCounts = useMemo(() => {
    const activities = homeTrip?.activities || [];
    const counts = {};
    activities.forEach(act => {
      if (act.category === 'hotel' && act.checkIn && act.checkOut) {
        const d = new Date(act.checkIn);
        const end = new Date(act.checkOut);
        while (d < end) {
          const key = formatISODate(d);
          counts[key] = (counts[key] || 0) + 1;
          d.setDate(d.getDate() + 1);
        }
      } else if (act.tripDay) {
        counts[act.tripDay] = (counts[act.tripDay] || 0) + 1;
      }
    });
    return counts;
  }, [homeTrip]);

  // Week calendar
  const weekDays = useMemo(() => {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today, weekOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = formatISODate(d);
      days.push({
        date: dateStr,
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
        isSelected: dateStr === selectedDate,
        actCount: activityCounts[dateStr] || 0
      });
    }
    return days;
  }, [weekOffset, activityCounts, selectedDate]);

  // Pick a day from the month calendar: select it and move the week strip to its week
  const pickDate = useCallback((dateStr) => {
    const today = getStartOfWeek(new Date(), 0);
    const target = getStartOfWeek(new Date(dateStr), 0);
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    setWeekOffset(Math.round((target - today) / (7 * 86400000)));
    setSelectedDate(dateStr);
  }, []);

  // Calendar month label (syncs with displayed week)
  const calendarMonthLabel = useMemo(() => {
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    if (weekDays.length < 4) return '';
    const midDate = new Date(weekDays[3].date);
    return `${thaiMonths[midDate.getMonth()]} ${midDate.getFullYear()}`;
  }, [weekDays]);

  // Upcoming activities within 2 hours
  const recentActivities = useMemo(() => {
    if (!homeTrip?.activities) return [];
    const now = new Date();
    const todayStr = formatISODate(now);
    return homeTrip.activities
      .map((act, i) => ({ ...act, _index: i }))
      .filter(act => {
        if (!activityMatchesDate(act, todayStr)) return false;
        if (!['place', 'food', 'shopping', 'hotel'].includes(act.category)) return false;
        if (!act.time) return false;
        const [h, m] = act.time.split(':').map(Number);
        const actTime = new Date(now);
        actTime.setHours(h, m, 0, 0);
        const diffMin = (actTime - now) / 60000;
        return diffMin >= -30 && diffMin <= 120;
      })
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
      .slice(0, 3);
  }, [homeTrip]);

  // Travel schedule (follows selected date from calendar)
  const scheduleActivities = useMemo(() => {
    if (!homeTrip?.activities) return [];
    return homeTrip.activities
      .filter(act => activityMatchesDate(act, selectedDate))
      .map(a => {
        const origIndex = (homeTrip.activities || []).indexOf(a);
        return { ...a, _index: origIndex };
      })
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [homeTrip, selectedDate]);

  // Other trips (not joined by current user)
  const otherTrips = useMemo(() => {
    const userName = username || '';
    return trips.filter(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      return !isCreator && !isMember;
    }).sort((a, b) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const aExpired = a.endDate ? new Date(a.endDate) < today : false;
      const aFull = (a.members || []).length >= (a.memberCount || 1);
      const bExpired = b.endDate ? new Date(b.endDate) < today : false;
      const bFull = (b.members || []).length >= (b.memberCount || 1);
      return (aExpired || aFull ? 1 : 0) - (bExpired || bFull ? 1 : 0);
    });
  }, [trips, username]);

  // Find the user's joined trip on the selected date
  const tripOnDate = useMemo(() => {
    const userName = username || '';
    return trips.find(t => {
      const isCreator = t.profileName && t.profileName === userName;
      const isMember = (t.members || []).some(m => m.name === userName);
      if (!isCreator && !isMember) return false;
      if (!t.startDate || !t.endDate) return false;
      return selectedDate >= t.startDate && selectedDate <= t.endDate;
    }) || null;
  }, [trips, username, selectedDate]);

  // Determine add button mode
  const addButtonMode = tripOnDate ? 'activity' : 'trip';

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

  const handleAddButton = () => {
    if (addButtonMode === 'trip') {
      resetTripForm();
      navigate('/create');
    } else {
      setShowActivityModal(true);
    }
  };

  const handleSaveActivity = useCallback(async (activity) => {
    if (!tripOnDate) return;
    const activities = [...(tripOnDate.activities || []), activity];
    await updateExistingTrip(tripOnDate.id, { activities });
    setShowActivityModal(false);
  }, [tripOnDate, updateExistingTrip]);

  const handleCheckIn = useCallback(async (actIndex) => {
    if (!homeTrip) return;
    const activities = [...(homeTrip.activities || [])];
    const act = activities[actIndex];
    if (act && !act.checkedIn) {
      let isLate = false;
      if (act.tripDay && act.time) {
        const [h, m] = act.time.split(':').map(Number);
        const actDate = new Date(act.tripDay);
        actDate.setHours(h || 0, m || 0, 0, 0);
        isLate = (new Date() - actDate) / 60000 > 0;
      }
      activities[actIndex] = { ...act, checkedIn: true, checkedInLate: isLate, checkedInAt: new Date().toISOString() };
      await updateExistingTrip(homeTrip.id, { activities });
    }
  }, [homeTrip, updateExistingTrip]);

  const handleDetailActivityEdit = useCallback(() => {
    setShowActivityEditModal(true);
  }, []);

  const handleDetailActivityDelete = useCallback(async () => {
    if (!homeTrip || detailActivityIndex < 0) return;
    const activities = [...(homeTrip.activities || [])];
    activities.splice(detailActivityIndex, 1);
    await updateExistingTrip(homeTrip.id, { activities });
    setDetailActivity(null);
    setDetailActivityIndex(-1);
  }, [homeTrip, detailActivityIndex, updateExistingTrip]);

  const handleDetailActivitySave = useCallback(async (activity, editIndex) => {
    if (!homeTrip) return;
    const activities = [...(homeTrip.activities || [])];
    if (editIndex >= 0) {
      activities[editIndex] = activity;
    } else {
      activities.push(activity);
    }
    await updateExistingTrip(homeTrip.id, { activities });
    setShowActivityEditModal(false);
    setDetailActivity(null);
    setDetailActivityIndex(-1);
  }, [homeTrip, updateExistingTrip]);

  // Swipe handling for calendar (touch + mouse) with animation
  const swipeStartX = useRef(0);
  const isSwiping = useRef(false);
  const isAnimating = useRef(false);

  const doSwipe = useCallback((direction) => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setSlideAnim(direction > 0 ? 'slide-out-left' : 'slide-out-right');
    setTimeout(() => {
      setWeekOffset(w => w + direction);
      setSlideAnim(direction > 0 ? 'slide-in-right' : 'slide-in-left');
      setTimeout(() => {
        setSlideAnim('');
        isAnimating.current = false;
      }, 200);
    }, 150);
  }, []);

  const handleTouchStart = useCallback((e) => {
    swipeStartX.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback((e) => {
    const diff = swipeStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) doSwipe(1);
    else if (diff < -50) doSwipe(-1);
  }, [doSwipe]);
  const handleMouseDown = useCallback((e) => {
    swipeStartX.current = e.clientX;
    isSwiping.current = true;
  }, []);
  const handleMouseUp = useCallback((e) => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const diff = swipeStartX.current - e.clientX;
    if (diff > 50) doSwipe(1);
    else if (diff < -50) doSwipe(-1);
  }, [doSwipe]);

  const displayName = authUser?.displayName || username || 'Traveler';
  const displayPhoto = userImage || authUser?.photoURL;

  const stageTrip = tripOnDate || homeTrip;
  const isTodaySelected = selectedDate === formatISODate(new Date());
  const countdownChip = countdownData.noTrip
    ? countdownData.label
    : countdownData.isOngoing ? countdownData.num : `อีก ${countdownData.num} วัน`;

  return (
    <div ref={pageRef} className={`homepage${headerCollapsed ? ' header-collapsed' : ''}`} style={{ display: 'flex' }}>
      {/* Header: avatar + greeting, then pill row (ThaiWell home header) */}
      <div className="hp-header">
        <div className="hp-header-top">
          <button className="hp-greet" onClick={() => navigate('/me')}>
            <span className="hp-profile-avatar">
              <img src={displayPhoto || DEFAULT_AVATAR} alt="" />
            </span>
            <span className="hp-greet-text">
              <span className="hp-welcome">สวัสดี,</span>
              <span className="hp-logo">{displayName}</span>
            </span>
          </button>
        </div>

        <div className="hp-pill-row">
          <button className="hp-brand-pill" onClick={() => setShowMonthPicker(true)}>
            <span className="hp-brand-orb">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M8 3v3M16 3v3M3 10h18" /></svg>
            </span>
            {isTodaySelected ? 'วันนี้' : formatDateThaiShort(selectedDate)}
          </button>
          {stageTrip && (
            <button className="hp-trip-pill" onClick={() => navigate(`/trip/${stageTrip.id}`)}>
              {stageTrip.name || 'Trip'}
            </button>
          )}
        </div>
      </div>

      {/* Stage: info chips + empty slot (where ThaiWell shows its 3D model) */}
      <div className="hp-stage">
        <div className="hp-stage-chips">
          <span className="hp-chip">
            <span className="hp-chip-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M8 3v3M16 3v3M3 10h18" /></svg>
            </span>
            {countdownChip}
          </span>
          {stageTrip && (
            <span className="hp-chip">
              <span className="hp-chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M3 20c.5-3.4 3-5.5 6-5.5s5.5 2.1 6 5.5" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.4.9 2.3 2.6 2.5 5.2" /></svg>
              </span>
              {(stageTrip.members || []).length}/{stageTrip.memberCount || 1} คน
            </span>
          )}
          {scheduleActivities.length > 0 && (
            <span className="hp-chip good">
              <span className="hp-chip-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11.5l2.5 2.5L16 9.5" /><rect x="3.5" y="3.5" width="17" height="17" rx="4" /></svg>
              </span>
              {scheduleActivities.length} กิจกรรม
            </span>
          )}
          <span className="hp-stage-caption">{formatDateThaiShort(selectedDate)} · {calendarMonthLabel}</span>
        </div>
        {/* Reserved slot: content for this area is still to be decided */}
        <div className="hp-stage-slot" />
      </div>

      {/* Sheet frame: rises with the cards to step 2, then stays under the pill row */}
      <div className="hp-sheet-frame" aria-hidden="true"><div className="hp-sheet-bg" /><span className="hp-sheet-handle" /></div>

      {/* Scrollable sheet of cards over the stage */}
      <div className="hp-content" ref={contentRef}>
        <div className="hp-stage-spacer" />

        {/* Day plan card (ThaiWell appointment card) */}
        <div className="hp-tile hp-plan-card">
          <div className="hp-plan-head">
            <div className="hp-plan-head-text">
              <span className="hp-plan-label">{countdownData.noTrip ? calendarMonthLabel : `${countdownData.num} ${countdownData.label}`}</span>
              <span className="hp-plan-title">{isTodaySelected ? 'วันนี้' : formatDateThaiShort(selectedDate)} · {scheduleActivities.length} กิจกรรม</span>
            </div>
          </div>
          {stageTrip && (
            <div className="hp-plan-place">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.8-5.6-6.8-11.2a6.8 6.8 0 0 1 13.6 0C18.8 15.4 12 21 12 21Z" /><circle cx="12" cy="9.8" r="2.5" /></svg>
              <span>{stageTrip.name || 'Trip'}</span>
            </div>
          )}

          <div
            className={`hp-calendar-dates${slideAnim ? ` ${slideAnim}` : ''}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          >
            <div className="hp-week-labels">
              <span>จ.</span><span>อ.</span><span>พ.</span><span>พฤ.</span><span>ศ.</span><span>ส.</span><span>อา.</span>
            </div>
            <div className="hp-week-row">
              {weekDays.map(day => (
                <div
                  key={day.date}
                  className={`hp-week-day${day.isToday ? ' today' : ''}${day.isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <span className="hp-week-day-num">{day.dayNum}</span>
                  <div className="hp-week-dots">
                    {day.actCount > 0 ? (
                      Array.from({ length: Math.min(day.actCount, 3) }).map((_, i) => (
                        <span key={i} className="hp-week-dot has-activity"></span>
                      ))
                    ) : (
                      <span className="hp-week-dot"></span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Day schedule as a checklist */}
          <div className="hp-steps">
            {scheduleActivities.length > 0 ? scheduleActivities.map((act, idx) => {
              const status = getActivityStatus(act);
              const state = act.checkedIn ? (act.checkedInLate ? 'late' : 'done') : status === 'missed' ? 'missed' : 'pending';
              return (
                <div key={idx} className={`hp-step ${state}`}>
                  <span className="hp-step-icon">
                    {state === 'done' || state === 'late' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>
                    )}
                  </span>
                  <span className="hp-step-time">{act.time || '--:--'}</span>
                  <span className="hp-step-name">{act.name}</span>
                  {state === 'done' ? (
                    <span className="hp-step-status done">Checked</span>
                  ) : state === 'late' ? (
                    <span className="hp-step-status late">Late</span>
                  ) : state === 'missed' ? (
                    <span className="hp-step-status">Miss</span>
                  ) : (
                    <button className="hp-step-checkin" onClick={() => handleCheckIn(act._index)}>Check in</button>
                  )}
                </div>
              );
            }) : (
              <div className="hp-schedule-empty">ไม่มีกิจกรรมในวัน{isTodaySelected ? 'นี้' : `ที่ ${formatDateThaiShort(selectedDate)}`}</div>
            )}
          </div>

          <div className="hp-plan-actions">
            <button className="hp-add-btn" onClick={handleAddButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              {addButtonMode === 'activity' ? 'เพิ่ม Activity' : 'เพิ่มทริป'}
            </button>
            {tripOnDate && (
              <button className="hp-section-arrow" aria-label="ดูทริป" onClick={() => navigate(`/trip/${tripOnDate.id}`)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="hp-section">
          <div className="hp-tile-title">
            <span className="hp-section-title">กิจกรรมล่าสุด</span>
            {recentActivities.length > 0 && tripOnDate && (
              <button className="hp-tile-link" onClick={() => navigate(`/trip/${tripOnDate.id}`)}>ดูทั้งหมด</button>
            )}
          </div>
          <div className="hp-recent-scroll">
            {recentActivities.length > 0 ? (
              recentActivities.map((act, idx) => (
                <ActivityCard key={idx} activity={act} onClick={() => { setDetailActivity(act); setDetailActivityIndex(act._index); }} />
              ))
            ) : (
              <div className="hp-recent-empty">ไม่มีกิจกรรมที่จะถึงเร็วๆ นี้</div>
            )}
          </div>
        </div>

        {/* Other Trips */}
        {otherTrips.length > 0 && (
          <div className="hp-section">
            <div className="hp-tile-title">
              <span className="hp-section-title">Other Trip</span>
            </div>
            <div className="hp-other-trip-grid">
              {otherTrips.map(trip => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  showEditButton={false}
                  onJoin={(t) => setConfirmTrip(t)}
                  onView={(t) => navigate(`/trip/${t.id}`)}
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

      {showMonthPicker && (
        <MonthPickerSheet
          selectedDate={selectedDate}
          tripStart={stageTrip?.startDate}
          tripEnd={stageTrip?.endDate}
          activityCounts={activityCounts}
          onPick={pickDate}
          onClose={() => setShowMonthPicker(false)}
        />
      )}

      {showActivityModal && tripOnDate && (
        <ActivityModal
          tripForm={tripOnDate}
          editingActivity={null}
          editingIndex={-1}
          onSave={handleSaveActivity}
          onClose={() => setShowActivityModal(false)}
        />
      )}

      {detailActivity && !showActivityEditModal && (
        <ActivityDetailModal
          activity={detailActivity}
          onClose={() => { setDetailActivity(null); setDetailActivityIndex(-1); }}
          onEdit={handleDetailActivityEdit}
          onDelete={handleDetailActivityDelete}
        />
      )}
      {showActivityEditModal && (
        <ActivityModal
          tripForm={homeTrip}
          editingActivity={detailActivity}
          editingIndex={detailActivityIndex}
          onSave={handleDetailActivitySave}
          onClose={() => { setShowActivityEditModal(false); setDetailActivity(null); setDetailActivityIndex(-1); }}
        />
      )}
    </div>
  );
}
