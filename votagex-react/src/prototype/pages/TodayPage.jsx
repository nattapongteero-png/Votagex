import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag, SourceBadge } from '../icons';
import { Avatars, CatIcon, Cover, Progress, SectionTitle } from '../ui';
import MonthCalendar from '../MonthCalendar';
import useSheetSnap from '../../hooks/useSheetSnap';
import SpeechNotes from '../SpeechNotes';
import WeatherCard from '../WeatherCard';
import { pm25Level, useWeather, weatherKind } from '../weather';
import HOLIDAYS from '../thHolidays.json';
import {
  ME, PEOPLE, EXPENSE_CATS, CURRENCIES, HOME, addDays, parseISO, diffDays, thaiShort, byTime, localHM,
  stopState, myShare, fmtMoney, distanceKm, fmtKm, directionsUrl, countryOf, planStatus, toTHB, jarStats,
} from '../data';

const FOLD_TOP = 12; // folded calendar's distance from the top of the screen
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const STATE_TEXT = { done: 'เช็คอินแล้ว', 'late-done': 'มาสาย', missed: 'พลาด', due: 'ถึงเวลาแล้ว', pending: '' };

function StepIcon({ state }) {
  if (state === 'done' || state === 'late-done') {
    return <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7.2" fill="currentColor" /><path d="m4.8 8.2 2.1 2.1 4.3-4.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  }
  return <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray={state === 'missed' ? '2 2' : undefined} /></svg>;
}

export default function TodayPage() {
  const { plans, places, expenses, memories, jars, piggyLog, today, openSheet, actions } = useProto();
  const navigate = useNavigate();
  const [picked, setPicked] = useState(null);
  const [seed, setSeed] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const pageRef = useRef(null);
  // the card sheet rests just under the calendar (its height changes with week/month and the day's stops),
  // always leaving a strip of the sheet in view
  const stageRef = useRef(null);
  const [sheet, setSheet] = useState(null); // { top: --hp-sheet-top, clip: px of calendar under the resting sheet }
  useLayoutEffect(() => {
    const stage = stageRef.current, page = pageRef.current;
    if (!stage || !page) return undefined;
    // the sheet's top edge lands 14px under the calendar (cards start 24px below that edge); on a short screen
    // it stops higher and the calendar's bottom is cut off where the sheet covers it
    const fit = () => {
      if (page.querySelector('.hp-content')?.scrollTop > 0) return; // folding: the open sizes stay as measured
      const bottom = stage.offsetTop + stage.offsetHeight;
      const top = Math.round(Math.min(bottom + 38, page.clientHeight - 126));
      // what's left of the calendar when folded (header bar, weekdays, one week)
      const away = [...stage.querySelectorAll('.pt-riso-stack > :first-child .pt-fold-away')].reduce((h, el) => h + el.offsetHeight, 0);
      setSheet({ top, clip: Math.max(0, bottom - (top - 24)), folded: stage.offsetHeight - away });
    };
    const ro = new ResizeObserver(fit);
    ro.observe(stage);
    ro.observe(page);
    return () => ro.disconnect();
  }, []);
  useSheetSnap(pageRef, { cssDriven: true });
  // At rest the calendar sits above the card list so it gets taps; an up/down drag on it is passed on to the
  // list, so the sheet still rises from anywhere. Once the list moves, the calendar drops behind the sheet.
  const [atRest, setAtRest] = useState(true);
  useEffect(() => {
    const stage = stageRef.current, list = pageRef.current?.querySelector('.hp-content');
    if (!stage || !list) return undefined;
    let t = null;
    const start = (e) => { t = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null }; };
    const move = (e) => {
      if (!t) return;
      const { clientX: x, clientY: y } = e.touches[0];
      if (!t.axis && Math.hypot(x - t.x, y - t.y) > 8) t.axis = Math.abs(y - t.y) > Math.abs(x - t.x) ? 'y' : 'x';
      if (t.axis !== 'y') return;
      e.preventDefault();
      list.scrollTop += t.y - y;
      t.y = y;
    };
    const end = () => { t = null; };
    stage.addEventListener('touchstart', start, { passive: true });
    stage.addEventListener('touchmove', move, { passive: false });
    stage.addEventListener('touchend', end);
    stage.addEventListener('touchcancel', end);
    return () => {
      stage.removeEventListener('touchstart', start);
      stage.removeEventListener('touchmove', move);
      stage.removeEventListener('touchend', end);
      stage.removeEventListener('touchcancel', end);
    };
  }, []);
  const selected = picked && picked.base === today ? picked.date : today;
  const setSelected = (date) => setPicked({ date, base: today });

  const stopsOn = useMemo(() => {
    const m = {};
    plans.forEach((p) => p.stops.forEach((s) => { if (s.date) m[s.date] = (m[s.date] || 0) + 1; }));
    return m;
  }, [plans]);

  const dayPlans = plans.filter((p) => p.startDate && selected >= p.startDate && selected <= (p.endDate || p.startDate));
  const plan = dayPlans.find((p) => p.kind !== 'outing') || dayPlans[0] || null;
  const stops = plan ? plan.stops.filter((s) => s.date === selected).sort(byTime) : [];
  const country = countryOf(plan?.country);
  const nowHM = localHM(country.utc);
  const live = plan && selected === today && planStatus(plan, today) === 'ongoing' && plan.kind !== 'outing';
  const nextStop = selected === today ? stops.find((s) => !s.checkIns?.[ME]) : null;

  // stage chips
  const upcoming = plans.filter((p) => planStatus(p, today) === 'upcoming' && p.kind !== 'outing').sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  // savings live with their trip now; home only shows how the next trip's piggy is doing
  const upJar = upcoming && jars.find((j) => j.planId === upcoming.id);
  const upSaved = upJar && jarStats(upJar, piggyLog, plans, expenses);
  const jar = upJar || jars[0];
  const piggy = jar && (jar === upJar ? upSaved : jarStats(jar, piggyLog, plans, expenses));
  const openPiggy = () => (jar ? openSheet('piggy', { jarId: jar.id }) : openSheet('newJar'));
  const monthKey = today.slice(0, 7);
  const monthSpend = expenses.filter((e) => e.date?.startsWith(monthKey)).reduce((s, e) => s + myShare(e), 0);
  const wantCount = places.filter((p) => p.status === 'want').length;
  const todaySpend = plan ? expenses.filter((e) => e.planId === plan.id && e.date === today) : [];
  const todaySpendLocal = todaySpend.reduce((s, e) => s + (e.currency === plan.currency ? e.amount : toTHB(e) / CURRENCIES[plan.currency].toTHB), 0);

  // today's weather where I am (trip destination while travelling)
  const wxToday = useWeather({ [today]: live && plan.destination?.lat ? plan.destination : HOME })[today];
  // the selected day's forecast, where I'll be that day (a trip's destination, else home)
  const tripSel = plans.find((p) => p.kind !== 'outing' && p.destination?.lat && p.startDate && selected >= p.startDate && selected <= (p.endDate || p.startDate));
  const wxSel = useWeather({ [selected]: tripSel?.destination || HOME })[selected];
  const selPlace = tripSel?.destination?.name;
  // today after dark: night sky and the moon (as the iPhone weather app does)
  const hour = new Date().getHours();
  const night = selected === today && (hour >= 19 || hour < 6);
  const dayTitle = selected === today ? `วันนี้ · ${thaiShort(selected)}` : `${TH_DOW[parseISO(selected).getDay()]} ${thaiShort(selected)}`;
  const holiday = HOLIDAYS[selected];
  const daySub = [holiday, stops.length ? `${stops.length} จุดแวะ${plan ? ` · ${plan.name}` : ''}` : 'ยังไม่มีแผน'].filter(Boolean).join(' · ');
  // the next day off within a week (today included), so there's time to plan something
  const nextHoliday = Object.keys(HOLIDAYS).find((d) => d >= today && d <= addDays(today, 7));
  const wxNote = wxToday && (() => {
    const k = weatherKind(wxToday.code);
    if (wxToday.rain >= 60) return { key: 'wx', icon: 'umbrella', text: `วันนี้ฝนมีโอกาสตก ${wxToday.rain}% พกร่มด้วยนะ` };
    const air = pm25Level(wxToday.pm25);
    if (air && wxToday.pm25 > 37.5) return { key: 'wx', icon: 'wFog', text: `ฝุ่น PM2.5 ${air.label} ใส่หน้ากากด้วยนะ` };
    if (wxToday.max >= 35) return { key: 'wx', icon: 'hot', text: `วันนี้ร้อนถึง ${wxToday.max}° ดื่มน้ำเยอะๆ นะ` };
    return { key: 'wx', icon: k.icon, text: `วันนี้${k.label} ${wxToday.min}–${wxToday.max}°` };
  })();

  // notes the profile character says in a speech bubble (what used to be the stage chips)
  const notes = [...(live ? [
    { key: 'day', flag: country.code, text: `Day ${diffDays(plan.startDate, today) + 1} ที่${country.name}แล้วน้า`, onClick: () => navigate(`/proto/plan/${plan.id}`) },
    { key: 'time', icon: 'clock', text: `ที่นั่นตอนนี้ ${nowHM} (${country.utc - 7 >= 0 ? '+' : ''}${country.utc - 7} ชม.)` },
    { key: 'spend', icon: 'wallet', text: `วันนี้ใช้ไป ${fmtMoney(todaySpendLocal, plan.currency)} แล้วนะ`, onClick: () => openSheet('expense') },
  ] : [
    upcoming && { key: 'trip', icon: 'plane', text: `อีก ${diffDays(today, upcoming.startDate)} วันได้ไป${upcoming.name}แล้ว!`, onClick: () => navigate(`/proto/plan/${upcoming.id}`) },
    wantCount > 0 && { key: 'want', icon: 'pin', text: `เก็บที่อยากไปไว้ ${wantCount} แห่งแล้ว ไปไหนดี?`, onClick: () => navigate('/proto/map') },
  ]),
  nextHoliday && { key: 'holiday', icon: 'calendar', text: nextHoliday === today ? `วันนี้${HOLIDAYS[today]} ไปเที่ยวไหนดี?` : `อีก ${diffDays(today, nextHoliday)} วันหยุด${HOLIDAYS[nextHoliday]}`, onClick: () => setSelected(nextHoliday) },
  // always-there notes, so someone with no trips or places still gets something to read
  wxNote,
  jar
    ? piggy.balance < jar.goal && { key: 'jar', icon: jar.icon || 'piggy', text: `${jar.name} อีก ${fmtMoney(jar.goal - piggy.balance)} ถึงเป้า`, onClick: openPiggy }
    : { key: 'jar', icon: 'piggy', text: 'เริ่มเก็บเงินไปเที่ยวกันมั้ย?', onClick: openPiggy },
  !upcoming && !live && { key: 'plan', icon: 'map', text: wantCount ? 'ยังไม่มีทริปเลย วางแผนสักที่มั้ย?' : 'อยากไปไหน เก็บไว้ในแผนที่ก่อนเลย', onClick: () => (wantCount ? openSheet('createPlan') : navigate('/proto/map')) },
  ].filter(Boolean);

  // "where to go" suggestion: nearest saved places, rotated by the shuffle button
  const nearby = useMemo(() => places
    .filter((p) => p.status === 'want' && (p.country || 'TH') === 'TH')
    .map((p) => ({ ...p, km: distanceKm(HOME, p) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 6), [places]);
  const suggestion = nearby.length ? nearby[seed % nearby.length] : null;

  // memory from about a year ago, else the latest one with a photo
  const throwback = useMemo(() => {
    const withPhoto = memories.filter((m) => m.photos?.length && m.date < today);
    const yearAgo = withPhoto.find((m) => Math.abs(diffDays(m.date, addDays(today, -365))) <= 3);
    return yearAgo ? { m: yearAgo, label: 'วันนี้เมื่อปีที่แล้ว' } : withPhoto[0] ? { m: withPhoto[0], label: 'ความทรงจำล่าสุด' } : null;
  }, [memories, today]);

  // spending this month by category (my share)
  const monthByCat = Object.entries(expenses.filter((e) => e.date?.startsWith(monthKey))
    .reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + myShare(e) }), {}))
    .sort((a, b) => b[1] - a[1]);

  return (
    <div ref={pageRef} className={`homepage pt-today${collapsed ? ' header-collapsed' : ''}${atRest ? ' at-rest' : ''}`} style={sheet ? { '--hp-sheet-top': `${sheet.top}px`, '--fold-top': `${FOLD_TOP}px` } : undefined}>
      <div className="hp-header">
        <div className="hp-header-top pt-talk">
          {/* Instagram-style note floating above the avatar */}
          <div className="pt-avatar-note">
            <SpeechNotes notes={notes} />
            <button className="hp-greet" onClick={() => navigate('/proto/me')}>
              <span className="hp-profile-avatar"><img src={PEOPLE[ME].avatar} alt="" /></span>
              <span className="hp-greet-text">
                <span className="hp-welcome">สวัสดี,</span>
                <span className="hp-logo">{PEOPLE[ME].name}</span>
              </span>
            </button>
          </div>
        </div>
        {/* step 2 stop for the card sheet: it rises over the greeting up to here */}
        <span className="hp-pill-row pt-snap-stop" aria-hidden="true" style={sheet ? { height: FOLD_TOP + sheet.folded } : undefined} />
      </div>

      <div className="hp-stage" ref={stageRef} style={sheet?.clip && atRest ? { clipPath: `inset(0 0 ${sheet.clip}px 0)` } : undefined}>
        {/* the calendar sits where the 3D piggy used to be; the sheet folds it to one week as it rises */}
        <div className="hp-tile hp-plan-card">
          <MonthCalendar selected={selected} today={today} onSelect={setSelected} stopsOn={stopsOn} plans={plans} />
        </div>
      </div>

      <div className="hp-sheet-frame" aria-hidden="true"><div className="hp-sheet-bg" /><span className="hp-sheet-handle" /></div>

      <div className="hp-content" onScroll={(e) => { setCollapsed(e.currentTarget.scrollTop > 40); setAtRest(e.currentTarget.scrollTop < 4); }}>
        <div className="hp-stage-spacer" />

        {/* one block for the whole sheet, so a drag anywhere on it (gaps and handle too) moves it */}
        <div className="pt-home-sheet">
          {/* the selected day's weather, its own card */}
          {wxSel && <WeatherCard wx={wxSel} place={selPlace || 'กรุงเทพฯ'} title={dayTitle} holiday={holiday} night={night} clock={selected === today} utc={countryOf(tripSel?.country).utc} />}

          {/* the selected day's plan */}
          <div className="hp-tile pt-day-card">
            {!wxSel && (
              <div className="pt-day-head">
                <span className="pt-grow">
                  <span className="pt-strong lg">{dayTitle}</span>
                  <span className="pt-muted sm">{daySub}{selPlace ? ` · ${selPlace}` : ''}</span>
                </span>
              </div>
            )}
              {plan && stops.length > 0 && (
                <div className="hp-steps">
                  {stops.map((s) => {
                    const st = stopState(s, today, nowHM);
                    const canCheck = selected === today && (st === 'pending' || st === 'due');
                    return (
                      <div key={s.id} className={`hp-step ${st === 'done' ? 'done' : st === 'late-done' ? 'late' : st === 'missed' ? 'missed' : ''}${nextStop?.id === s.id && live ? ' pt-next' : ''}`}>
                        <span className="hp-step-icon"><StepIcon state={st} /></span>
                        <span className="hp-step-time">{s.time || '--:--'}</span>
                        <span className="hp-step-name">{s.name}</span>
                        {canCheck ? (
                          <button className="hp-step-checkin" onClick={() => actions.toggleCheckIn(plan.id, s.id, st === 'due')}>เช็คอิน</button>
                        ) : (
                          <span className={`hp-step-status ${st === 'done' ? 'done' : st === 'late-done' ? 'late' : ''}`}>{STATE_TEXT[st]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {live && nextStop && (
                <div className="pt-next-card">
                  <CatIcon cat={nextStop.cat} size={40} />
                  <div className="pt-grow">
                    <div className="pt-muted sm">ถัดไป {nextStop.time}</div>
                    <div className="pt-strong ellipsis">{nextStop.name}</div>
                  </div>
                  <a className="pt-btn sm" href={directionsUrl(nextStop)} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> นำทาง</a>
                </div>
              )}

              <div className="hp-plan-actions">
                {plan ? (
                  <>
                    <button className="hp-add-btn" onClick={() => openSheet(live ? 'expense' : 'addStop', live ? {} : { planId: plan.id, date: selected })}>
                      <Icon name={live ? 'wallet' : 'plus'} size={18} stroke={2.2} /> {live ? 'จดรายจ่าย' : 'เพิ่มจุดแวะ'}
                    </button>
                    <button className="hp-section-arrow" aria-label="เปิดแผน" onClick={() => navigate(`/proto/plan/${plan.id}`)}><Icon name="next" size={18} /></button>
                  </>
                ) : (
                  <>
                    <button className="hp-add-btn" onClick={() => openSheet('createPlan')}><Icon name="plus" size={18} stroke={2.2} /> สร้างแผนวันนี้</button>
                    <button className="pt-btn light" onClick={() => setSeed((s) => s + 1)}>ไปไหนดี?</button>
                  </>
                )}
              </div>
          </div>

          {/* where to go */}
          {!live && suggestion && (
            <div className="hp-section">
              <SectionTitle title="ไปไหนดี?" action="ดูบนแผนที่" onAction={() => navigate('/proto/map')} />
              <div className="hp-tile pt-suggest">
                <div className="pt-suggest-top">
                  <CatIcon cat={suggestion.cat} size={52} />
                  <div className="pt-grow">
                    <div className="pt-strong lg">{suggestion.name}</div>
                    <div className="pt-muted">{suggestion.area} · ห่าง {fmtKm(suggestion.km)}</div>
                    {suggestion.note && <div className="pt-note">“{suggestion.note}”</div>}
                  </div>
                  <SourceBadge type={suggestion.source?.type || 'manual'} size={26} />
                </div>
                <div className="pt-row-actions">
                  <button className="pt-btn light sm" onClick={() => setSeed((s) => s + 1)}><Icon name="shuffle" size={16} /> สุ่มใหม่</button>
                  <a className="pt-btn light sm" href={directionsUrl(suggestion)} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> นำทาง</a>
                  <button className="pt-btn sm" onClick={() => openSheet('addToPlan', { placeId: suggestion.id })}>ไปวันนี้</button>
                </div>
              </div>
            </div>
          )}

          {/* upcoming */}
          {!live && upcoming && (
            <div className="hp-section">
              <SectionTitle title="กำลังจะไป" action="แผนทั้งหมด" onAction={() => navigate('/proto/plans')} />
              <button className="hp-tile pt-upcoming" onClick={() => navigate(`/proto/plan/${upcoming.id}`)}>
                <Cover cover={upcoming.cover} className="pt-upcoming-cover" />
                <div className="pt-grow">
                  <div className="pt-muted sm"><Flag code={upcoming.country} /> {thaiShort(upcoming.startDate)} – {thaiShort(upcoming.endDate)}</div>
                  <div className="pt-strong lg">{upcoming.name}</div>
                  {upSaved && (
                    <>
                      <div className="pt-muted sm">เก็บเงินแล้ว {fmtMoney(upSaved.balance)} / {fmtMoney(upJar.goal)}</div>
                      <div className="pt-stack">{upSaved.rows.filter((r) => r.balance > 0).map((r) => <span key={r.id} style={{ flex: r.balance, background: r.color }} />)}</div>
                    </>
                  )}
                  {upcoming.checklist && (
                    <>
                      <div className="pt-muted sm">เตรียมตัว {upcoming.checklist.filter((c) => c.done).length}/{upcoming.checklist.length}</div>
                      <Progress value={upcoming.checklist.filter((c) => c.done).length / upcoming.checklist.length} color="var(--tw-brand)" />
                    </>
                  )}
                </div>
                <span className="pt-countdown"><b>{diffDays(today, upcoming.startDate)}</b>วัน</span>
              </button>
            </div>
          )}

          {/* throwback */}
          {throwback && (
            <div className="hp-section">
              <SectionTitle title={throwback.label} />
              <button className="pt-throwback" style={{ backgroundImage: `url(${throwback.m.photos[0]})` }}
                onClick={() => navigate(`/proto/plan/${throwback.m.planId}?tab=memories`)}>
                <span className="pt-throwback-text">
                  <span className="pt-muted light sm">{thaiShort(throwback.m.date)} {parseISO(throwback.m.date).getFullYear() + 543} · {plans.find((p) => p.id === throwback.m.planId)?.name}</span>
                  <span><Icon name={throwback.m.mood} size={16} className="pt-inline-icon" /> {throwback.m.text}</span>
                </span>
              </button>
            </div>
          )}

          {/* month spending */}
          <div className="hp-section">
            <SectionTitle title="ใช้จ่ายเดือนนี้" action="ดูทั้งหมด" onAction={() => navigate('/proto/me')} />
            <div className="hp-tile pt-spend">
              <div className="pt-spend-total">{fmtMoney(monthSpend)}</div>
              <div className="pt-stack">
                {monthByCat.map(([k, v]) => <span key={k} style={{ flex: v, background: EXPENSE_CATS[k].color }} />)}
              </div>
              <div className="pt-legend">
                {monthByCat.slice(0, 4).map(([k, v]) => (
                  <span key={k}><i style={{ background: EXPENSE_CATS[k].color }} />{EXPENSE_CATS[k].label} {fmtMoney(v)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
