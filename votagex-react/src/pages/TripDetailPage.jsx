import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrips } from '../contexts/TripContext';
import { useAuth } from '../contexts/AuthContext';
import { CATEGORY_CONFIG } from '../constants/categories';
import { formatISODate, activityMatchesDate, getTripDays } from '../utils/dates';
import { formatBudgetDisplay, getActivityAmountForDay } from '../utils/numbers';
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';
import TimelineDot from '@mui/lab/TimelineDot';
import Typography from '@mui/material/Typography';
import ActivityCard from '../components/common/ActivityCard';
import ActivityDetailModal from '../components/modals/ActivityDetailModal';
import ActivityModal from '../components/modals/ActivityModal';
import TripActionSheet from '../components/modals/TripActionSheet';
import EditTripModal from '../components/modals/EditTripModal';
import MembersModal from '../components/modals/MembersModal';

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

export default function TripDetailPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { trips, loadTrips, updateExistingTrip, deleteExistingTrip } = useTrips();
  const { username, authUser } = useAuth();

  const [activeTab, setActiveTab] = useState('expenses');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedPlanDay, setSelectedPlanDay] = useState('all');
  const [selectedChip, setSelectedChip] = useState('all');
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityIndex, setSelectedActivityIndex] = useState(-1);
  const [showActivityEditModal, setShowActivityEditModal] = useState(false);
  const scrollRef = useRef(null);
  const tripNameRef = useRef(null);
  const infoRowRef = useRef(null);
  const [tripNameHeight, setTripNameHeight] = useState(0);
  const [infoRowHeight, setInfoRowHeight] = useState(0);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const trip = useMemo(() => trips.find(t => t.id === tripId), [trips, tripId]);

  useEffect(() => {
    if (tripNameRef.current) setTripNameHeight(tripNameRef.current.offsetHeight);
    if (infoRowRef.current) setInfoRowHeight(infoRowRef.current.offsetHeight);
  }, [trip]);


  const displayName = authUser?.displayName || trip?.profileName || 'User';

  // Day cards data
  const dayCards = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return [];
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const activities = trip.activities || [];
    const monthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

    const totalAll = activities.reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    const cards = [{ key: 'all', label: 'ทั้งหมด', date: 'All Days', total: totalAll }];

    let dayNum = 1;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = formatISODate(d);
      const dayActivities = activities.filter(a => activityMatchesDate(a, dateStr));
      const dayTotal = dayActivities.reduce((s, a) => s + getActivityAmountForDay(a), 0);
      const dateLabel = `${d.getDate()} ${monthsShort[d.getMonth()]} ${d.getFullYear()}`;
      cards.push({ key: dateStr, label: `Day ${dayNum}`, date: dateLabel, total: dayTotal });
      dayNum++;
    }
    return cards;
  }, [trip]);

  // Filtered activities for expenses
  const detailActivities = useMemo(() => {
    if (!trip?.activities) return [];
    let acts = trip.activities;
    if (selectedDay !== 'all') acts = acts.filter(a => activityMatchesDate(a, selectedDay));
    if (selectedChip !== 'all') acts = acts.filter(a => a.category === selectedChip);
    return acts;
  }, [trip, selectedDay, selectedChip]);

  // Expense totals per category
  const categoryTotals = useMemo(() => {
    if (!trip?.activities) return {};
    const acts = selectedDay === 'all' ? trip.activities : trip.activities.filter(a => activityMatchesDate(a, selectedDay));
    const totals = {};
    Object.keys(CATEGORY_CONFIG).forEach(key => { totals[key] = 0; });
    acts.forEach(a => {
      const cat = a.category || 'other';
      const amt = (selectedDay !== 'all' && a.category === 'hotel') ? getActivityAmountForDay(a) : (parseFloat(a.amount) || 0);
      totals[cat] = (totals[cat] || 0) + amt;
    });
    return totals;
  }, [trip, selectedDay]);

  // Plan activities
  const planActivities = useMemo(() => {
    if (!trip?.activities) return [];
    let acts = trip.activities;
    if (selectedPlanDay !== 'all') acts = acts.filter(a => activityMatchesDate(a, selectedPlanDay));
    const getActDay = (a) => a.tripDay || a.checkIn || '';
    return [...acts].sort((a, b) => {
      const da = getActDay(a), db = getActDay(b);
      if (da !== db) return da.localeCompare(db);
      return (a.time || '00:00').localeCompare(b.time || '00:00');
    });
  }, [trip, selectedPlanDay]);

  // Budget info
  const budgetInfo = useMemo(() => {
    if (!trip) return { budget: 0, spent: 0, remaining: 0 };
    const budget = trip.budget ? parseFloat(trip.budget) : 0;
    const spent = (trip.activities || []).reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
    return { budget, spent, remaining: budget - spent };
  }, [trip]);

  const members = trip?.members || [];
  const memberCount = trip?.memberCount || 1;

  const metaText = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return '';
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const dayCount = Math.round((end - start) / 86400000) + 1;
    const monthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${start.getDate()}-${end.getDate()} ${monthsShort[start.getMonth()]} ${start.getFullYear()} (${dayCount} วัน)`;
  }, [trip]);

  const tripDaysMap = useMemo(() => {
    if (!trip?.startDate || !trip?.endDate) return {};
    const days = getTripDays(trip.startDate, trip.endDate);
    const map = {};
    days.forEach((d, i) => { map[d] = i + 1; });
    return map;
  }, [trip]);

  const handleDelete = async (t) => {
    await deleteExistingTrip(t.id);
    navigate('/itrip');
  };

  const handleEditSave = async (data) => {
    await updateExistingTrip(tripId, data);
  };

  const handleRemoveMember = async (memberName) => {
    if (!trip) return;
    const updatedMembers = (trip.members || []).filter(m => m.name !== memberName);
    await updateExistingTrip(tripId, { members: updatedMembers });
  };

  const handleActivityClick = (activity, index) => {
    setSelectedActivity(activity);
    setSelectedActivityIndex(index);
  };

  const handleActivityEdit = () => {
    setShowActivityEditModal(true);
  };

  const handleActivityDelete = useCallback(async () => {
    if (!trip || selectedActivityIndex < 0) return;
    const activities = [...(trip.activities || [])];
    activities.splice(selectedActivityIndex, 1);
    await updateExistingTrip(trip.id, { activities });
    setSelectedActivity(null);
    setSelectedActivityIndex(-1);
  }, [trip, selectedActivityIndex, updateExistingTrip]);

  const handleActivitySave = useCallback(async (activity, editIndex) => {
    if (!trip) return;
    const activities = [...(trip.activities || [])];
    if (editIndex >= 0) {
      activities[editIndex] = activity;
    } else {
      activities.push(activity);
    }
    await updateExistingTrip(trip.id, { activities });
    setShowActivityEditModal(false);
    setSelectedActivity(null);
    setSelectedActivityIndex(-1);
  }, [trip, updateExistingTrip]);

  const handleCheckIn = useCallback(async (actIndex) => {
    if (!trip) return;
    const activities = [...(trip.activities || [])];
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
      await updateExistingTrip(trip.id, { activities });
    }
  }, [trip, updateExistingTrip]);

  if (!trip) {
    return (
      <div className="trip-detail-page active">
        <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
          <p>ไม่พบทริป</p>
          <button className="btn-gradient" onClick={() => navigate('/itrip')} style={{ marginTop: 16 }}>กลับ</button>
        </div>
      </div>
    );
  }

  const row1Cats = ['hotel', 'shopping'];
  const row2Cats = ['food', 'place', 'travel', 'other'];
  const categoryOrder = ['place', 'food', 'shopping', 'hotel', 'travel', 'other'];

  const grouped = {};
  detailActivities.forEach(act => {
    const cat = act.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(act);
  });

  return (
    <div className="trip-detail-page active">
      <div className="trip-detail-container">
        <div className="td-scroll" ref={scrollRef}>
          {/* Header (scrolls away) */}
          <div className="td-header">
            <div className="td-header-bg"><img src="/assets/header-bg.png" alt="" /></div>
            <div className="td-header-text">
              <span className="td-header-title">iTrip</span>
              <span className="td-header-subtitle">Welcome , {displayName}</span>
            </div>
            <button className="td-close-btn" onClick={() => navigate(-1)}>
              <svg viewBox="0 0 32 32" fill="none" width="24" height="24">
                <path d="M19.1921 12.793L12.8027 19.1823" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M19.1998 19.1908L12.7998 12.7908" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path opacity="0.4" fillRule="evenodd" clipRule="evenodd" d="M3.6665 16.0001C3.6665 25.2494 6.7505 28.3334 15.9998 28.3334C25.2492 28.3334 28.3332 25.2494 28.3332 16.0001C28.3332 6.75075 25.2492 3.66675 15.9998 3.66675C6.7505 3.66675 3.6665 6.75075 3.6665 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Flag (scrolls away naturally) */}
          <div className="td-scroll-away">
            <div className="td-trip-flag">
              {trip.coverImage ? <img src={trip.coverImage} alt="" /> : <span className="flag-emoji">🌍</span>}
            </div>
          </div>

          {/* Trip Name (sticky layer 1) */}
          <div className="td-trip-name-sticky" ref={tripNameRef}>
            <div className="td-trip-top">
              <div className="td-trip-details">
                <span className="td-trip-name">{trip.name || 'Trip'}</span>
                <span className="td-trip-meta">{metaText}</span>
              </div>
              <button className="td-trip-more" onClick={() => setShowActionSheet(true)}>⋯</button>
            </div>
          </div>

          {/* Description (scrolls away behind trip name) */}
          {trip.description && (
            <div className="td-desc-scroll">
              <div className="td-trip-desc">{trip.description}</div>
            </div>
          )}

          {/* Info Row (sticky layer 2 — slides up under trip name) */}
          <div className="td-info-row-sticky" ref={infoRowRef} style={{ top: tripNameHeight }}>
            <div className="td-info-row">
              <div className="td-info-item td-info-members" style={{ cursor: 'pointer' }} onClick={() => setShowMembersModal(true)}>
                <div className="td-info-avatars">
                  {members.length > 0 ? (
                    <>
                      {members.slice(0, 3).map((m, i) => (
                        <div key={i} className="td-info-avatar">
                          {m.image ? <img src={m.image} alt="" /> : <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>}
                        </div>
                      ))}
                      {members.length > 3 && <div className="td-info-avatar" style={{ fontSize: 9, fontWeight: 700, color: '#2463eb' }}>+{members.length - 3}</div>}
                    </>
                  ) : (
                    Array.from({ length: Math.min(memberCount, 3) }).map((_, i) => (
                      <div key={i} className="td-info-avatar"><svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
                    ))
                  )}
                </div>
                <span className="td-info-label">ผู้ร่วมเดินทาง</span>
              </div>
              <div className="td-info-item">
                <span className="td-info-value budget">{formatBudgetDisplay(budgetInfo.budget)}</span>
                <span className="td-info-label">งบทั้งหมด</span>
              </div>
              <div className="td-info-item">
                <span className="td-info-value spent">{budgetInfo.spent > 0 ? `-${formatBudgetDisplay(budgetInfo.spent)}` : '0'}</span>
                <span className="td-info-label">เงินที่ใช้ไป</span>
              </div>
              <div className="td-info-item">
                <span className="td-info-value remaining">{formatBudgetDisplay(budgetInfo.remaining)}</span>
                <span className="td-info-label">คงเหลือ</span>
              </div>
            </div>
          </div>

          {/* Tabs (sticky layer 3) */}
          <div className="td-tabs-sticky" style={{ top: tripNameHeight + infoRowHeight }}>
            <div className="td-tabs">
              <div className="td-tabs-indicator" style={{ transform: activeTab === 'plan' ? 'translateX(100%)' : 'translateX(0)' }} />
              <button className={`td-tab${activeTab === 'expenses' ? ' active' : ''}`} onClick={() => setActiveTab('expenses')}>ค่าใช้จ่าย</button>
              <button className={`td-tab${activeTab === 'plan' ? ' active' : ''}`} onClick={() => setActiveTab('plan')}>แผนการเที่ยว</button>
            </div>
          </div>

          {/* Tab Content Slider */}
          <div className="td-tab-slider" style={{ transform: activeTab === 'plan' ? 'translateX(-50%)' : 'translateX(0)' }}>
            {/* Expenses Tab */}
            <div className="td-tab-panel">
              <div className="td-days">
                {dayCards.map(c => (
                  <div key={c.key} className={`td-day-card${selectedDay === c.key ? ' active' : ''}`} onClick={() => setSelectedDay(c.key)}>
                    <div className="td-day-top"><span className="td-day-label">{c.label}</span><span className={`td-day-total${c.total > 0 ? ' has-expense' : ''}`}>{formatBudgetDisplay(c.total)}</span></div>
                    <div className="td-day-top"><span className="td-day-date">{c.date}</span><span className="td-day-total-label">รวม</span></div>
                  </div>
                ))}
              </div>
              <div className="td-expense-card">
                <span className="td-expense-title">{selectedDay === 'all' ? 'สรุปค่าใช้จ่ายทั้งหมด' : 'สรุปค่าใช้จ่ายรายวัน'}</span>
                <div className="td-expense-rows">
                  <div className="td-expense-row">
                    {row1Cats.map(cat => { const cfg = CATEGORY_CONFIG[cat]; const val = categoryTotals[cat] || 0; return (<div key={cat} className="td-expense-item"><span className={`td-expense-value${val > 0 ? ' has-expense' : ''}`}>{formatBudgetDisplay(val)}</span><div className="td-expense-cat"><span className="td-expense-cat-icon" dangerouslySetInnerHTML={{ __html: cfg.icon }} /><span className="td-expense-cat-label">{cfg.label}</span></div></div>); })}
                  </div>
                  <div className="td-expense-row">
                    {row2Cats.map(cat => { const cfg = CATEGORY_CONFIG[cat]; const val = categoryTotals[cat] || 0; return (<div key={cat} className="td-expense-item"><span className={`td-expense-value${val > 0 ? ' has-expense' : ''}`}>{formatBudgetDisplay(val)}</span><div className="td-expense-cat"><span className="td-expense-cat-icon" dangerouslySetInnerHTML={{ __html: cfg.icon }} /><span className="td-expense-cat-label">{cfg.label}</span></div></div>); })}
                  </div>
                </div>
                <div className="td-expense-bg"><img src="/assets/coins.png" alt="" onError={(e) => { e.target.parentElement.style.display = 'none'; }} /></div>
              </div>
              <div className="td-activities">
                <div className="td-activities-header">
                  <span className="td-activities-title">กิจกรรม</span>
                  <button className="td-btn-add" onClick={() => { setSelectedActivity(null); setSelectedActivityIndex(-1); setShowActivityEditModal(true); }}>
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96696 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7648C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#363853" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/><path d="M9.66665 8.00016H6.33331M7.99998 9.66683L7.99998 6.3335" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    เพิ่มกิจกรรม
                  </button>
                </div>
                <div className="td-chips">
                  <button className={`td-chip${selectedChip === 'all' ? ' active' : ''}`} onClick={() => setSelectedChip('all')}>ทั้งหมด</button>
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (<button key={key} className={`td-chip${selectedChip === key ? ' active' : ''}`} onClick={() => setSelectedChip(key)}><span dangerouslySetInnerHTML={{ __html: cfg.icon }} /> {cfg.label}</button>))}
                </div>
                <div className="td-activity-list">
                  {detailActivities.length > 0 ? categoryOrder.map(cat => {
                    if (!grouped[cat]?.length) return null;
                    const cfg = CATEGORY_CONFIG[cat];
                    return (<div key={cat} className="activity-section"><span className="activity-section-label">{cfg.label}</span><div className="activity-section-row">{grouped[cat].map((act, i) => { const origIdx = (trip.activities || []).indexOf(act); return <ActivityCard key={i} activity={act} onClick={() => handleActivityClick(act, origIdx)} />; })}</div></div>);
                  }) : <div className="td-empty">ไม่มีกิจกรรม</div>}
                </div>
              </div>
            </div>

            {/* Plan Tab */}
            <div className="td-tab-panel">
              <div className="td-days">
                {dayCards.map(c => (
                  <div key={c.key} className={`td-day-card${selectedPlanDay === c.key ? ' active' : ''}`} onClick={() => setSelectedPlanDay(c.key)}>
                    <div className="td-day-top"><span className="td-day-label">{c.label}</span><span className={`td-day-total${c.total > 0 ? ' has-expense' : ''}`}>{formatBudgetDisplay(c.total)}</span></div>
                    <div className="td-day-top"><span className="td-day-date">{c.date}</span><span className="td-day-total-label">รวม</span></div>
                  </div>
                ))}
              </div>
              <div className="td-plan-content" style={{ display: 'block' }}>
                <div className="td-schedule-header">
                  <span className="td-schedule-title">ตารางเที่ยว</span>
                  <button className="td-btn-add" onClick={() => { setSelectedActivity(null); setSelectedActivityIndex(-1); setShowActivityEditModal(true); }}>
                    <svg width="24" height="24" viewBox="0 0 16 16" fill="none"><path d="M2.23525 5.96695C2.66958 4.11534 4.11534 2.66958 5.96696 2.23525C7.30417 1.92158 8.69583 1.92158 10.033 2.23525C11.8847 2.66958 13.3304 4.11534 13.7647 5.96696C14.0784 7.30417 14.0784 8.69583 13.7647 10.033C13.3304 11.8847 11.8847 13.3304 10.033 13.7648C8.69583 14.0784 7.30417 14.0784 5.96696 13.7647C4.11534 13.3304 2.66958 11.8847 2.23525 10.033C1.92158 8.69583 1.92158 7.30417 2.23525 5.96695Z" fill="#363853" fillOpacity="0.15" stroke="white" strokeWidth="1.5"/><path d="M9.66665 8.00016H6.33331M7.99998 9.66683L7.99998 6.3335" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    เพิ่มกิจกรรม
                  </button>
                </div>
                <div className="hp-schedule">
                  {planActivities.length > 0 ? (() => {
                    const monthsShort = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
                    const getActDay = (a) => a.tripDay || a.checkIn || '';

                    // Group activities by day
                    const dayGroups = [];
                    let currentGroup = null;
                    planActivities.forEach(act => {
                      const actDay = getActDay(act);
                      if (selectedPlanDay === 'all' && (!currentGroup || actDay !== currentGroup.day)) {
                        currentGroup = { day: actDay, activities: [] };
                        dayGroups.push(currentGroup);
                      } else if (!currentGroup) {
                        currentGroup = { day: actDay, activities: [] };
                        dayGroups.push(currentGroup);
                      }
                      currentGroup.activities.push(act);
                    });

                    return dayGroups.map((group, gi) => (
                      <div key={gi}>
                        {selectedPlanDay === 'all' && group.day && (() => {
                          const d = new Date(group.day);
                          return (
                            <div className="hp-schedule-day-header">
                              <span className="hp-schedule-day-num">Day {tripDaysMap[group.day] || ''}</span>
                              <span className="hp-schedule-day-date">{d.getDate()} {monthsShort[d.getMonth()]} {d.getFullYear()}</span>
                            </div>
                          );
                        })()}
                        <Timeline position="alternate">
                          {group.activities.map((act, idx) => {
                            const cfg = CATEGORY_CONFIG[act.category] || CATEGORY_CONFIG.other;
                            const status = getActivityStatus(act);
                            let circleClass = 'pending';
                            if (status === 'checked-in') circleClass = act.checkedInLate ? 'late' : 'checked-in';
                            else if (status === 'missed') circleClass = 'missed';
                            else if (act.category === 'hotel') circleClass = 'default';
                            const origIndex = (trip.activities || []).indexOf(act);

                            return (
                              <TimelineItem key={idx}>
                                <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                                  <span className="hp-timeline-time">{act.time || '--:--'}</span>
                                </TimelineOppositeContent>
                                <TimelineSeparator>
                                  <TimelineConnector sx={{ bgcolor: '#e5e7eb' }} />
                                  <TimelineDot sx={{ bgcolor: 'transparent', boxShadow: 'none', p: 0, m: 0 }}>
                                    <div className={`hp-status-circle ${circleClass}`} dangerouslySetInnerHTML={{ __html: cfg.icon }} />
                                  </TimelineDot>
                                  <TimelineConnector sx={{ bgcolor: '#e5e7eb' }} />
                                </TimelineSeparator>
                                <TimelineContent sx={{ py: '12px', px: 2, m: 'auto 0' }}>
                                  <Typography variant="subtitle2" component="span" sx={{ fontFamily: "'Google Sans', sans-serif", fontWeight: 600, color: '#1a1a2e' }}>
                                    {act.name}
                                  </Typography>
                                  {act.checkedIn ? (
                                    <Typography variant="caption" sx={{ display: 'block', color: act.checkedInLate ? '#EF4444' : '#22C55E', fontWeight: 600, fontFamily: "'Google Sans', sans-serif" }}>
                                      {act.checkedInLate ? 'Late' : 'Checked'}
                                    </Typography>
                                  ) : status === 'missed' ? (
                                    <Typography variant="caption" sx={{ display: 'block', color: '#9ca3af', fontWeight: 400, fontFamily: "'Google Sans', sans-serif" }}>
                                      Miss
                                    </Typography>
                                  ) : (
                                    <Typography variant="caption" sx={{ display: 'block', color: '#2463eb', cursor: 'pointer', fontWeight: 400, fontFamily: "'Google Sans', sans-serif" }} onClick={() => handleCheckIn(origIndex)}>
                                      Check in
                                    </Typography>
                                  )}
                                </TimelineContent>
                              </TimelineItem>
                            );
                          })}
                        </Timeline>
                      </div>
                    ));
                  })() : <div className="hp-schedule-empty">ไม่มีกิจกรรม</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showActionSheet && <TripActionSheet trip={trip} onClose={() => setShowActionSheet(false)} onEdit={() => setShowEditModal(true)} onDelete={handleDelete} onLeave={async (t) => { const m = (t.members || []).filter(m => m.name !== username); await updateExistingTrip(t.id, { members: m }); navigate('/itrip'); }} />}
      {showEditModal && <EditTripModal trip={trip} onClose={() => setShowEditModal(false)} onSave={handleEditSave} />}
      {showMembersModal && <MembersModal trip={trip} onClose={() => setShowMembersModal(false)} onRemoveMember={handleRemoveMember} />}
      {selectedActivity && !showActivityEditModal && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => { setSelectedActivity(null); setSelectedActivityIndex(-1); }}
          onEdit={handleActivityEdit}
          onDelete={handleActivityDelete}
        />
      )}
      {showActivityEditModal && (
        <ActivityModal
          tripForm={trip}
          editingActivity={selectedActivity}
          editingIndex={selectedActivityIndex}
          onSave={handleActivitySave}
          onClose={() => { setShowActivityEditModal(false); setSelectedActivity(null); setSelectedActivityIndex(-1); }}
        />
      )}
    </div>
  );
}
