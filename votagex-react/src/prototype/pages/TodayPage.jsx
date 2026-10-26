import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import { Avatars, CatIcon, Cover, Progress, SectionTitle } from '../ui';
import MonthCalendar from '../MonthCalendar';
import useSheetSnap from '../../hooks/useSheetSnap';
import SpeechNotes from '../SpeechNotes';
import WeatherCard from '../WeatherCard';
import { MonthPiggyTile } from '../MonthMoney';
import StopRow from '../StopRow';
import MapView from '../MapView';
import { pm25Level, useWeather, weatherKind } from '../weather';
import HOLIDAYS from '../thHolidays.json';
import {
  ME, PEOPLE, CURRENCIES, HOME, addDays, parseISO, diffDays, thaiShort, byOrder, localHM,
  stopState, keepThai, fmtMoney, distanceKm, fmtKm, directionsUrl, countryOf, planStatus, toTHB, jarStats,
  EVENT_KINDS, KINDS, eventOn, shufflePool, nextCheckIndex, passedStop,
} from '../data';

const FOLD_TOP = 12; // folded calendar's distance from the top of the screen
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
// a plan's head in the day card, the same on my page and a group's: its group's tag (tap: the group) over its
// name, and the faces as tall as both; tap for the plan. No plan: the group alone, with everyone in it
function PlanHead({ plan, group, invite, onOpen, onGroup }) {
  const ids = plan ? plan.members : group.members;
  return (
    <div className="pt-day-who" role="button" tabIndex={0} onClick={onOpen}>
      <span className="pt-day-who-text">
        {group && (
          <button className="pt-group-chip sm" style={{ background: group.color }} onClick={(e) => { e.stopPropagation(); onGroup(); }}>
            <Icon name={group.icon} size={13} /> {group.name}
          </button>
        )}
        {!group && ids.length < 2 && <span className="pt-muted sm">ไปคนเดียว</span>}
        {plan ? <span className="pt-strong ellipsis">{plan.name}</span> : invite && <span className="pt-strong ellipsis pt-day-invite">{invite}</span>}
      </span>
      {ids.length > 1 && <Avatars ids={ids} size={group ? 47 : 32} max={3} total />}
    </div>
  );
}

// the day's stops on a small map, numbered in the day's order; tap for the plan
function DayMap({ pins, order, onOpen }) {
  return (
    <button className="pt-day-map" aria-label="เปิดแผน" onClick={onOpen}>
      <MapView points={pins.map((st) => ({ id: st.id, lat: st.lat, lng: st.lng, cat: st.cat, label: order.indexOf(st) + 1 }))}
        route={pins.length > 1} interactive={false} padding={32} fitKey={pins.map((st) => st.id).join()} />
    </button>
  );
}

// a saved place with dates (an event) on the selected day, under the weather
function EventTile({ ev, last, onOpen }) {
  const kind = EVENT_KINDS[ev.kind] || EVENT_KINDS.other;
  return (
    <button className="hp-tile pt-ev-card" onClick={onOpen}>
      <span className="pt-ev-icon"><Icon name={kind.icon} size={22} /></span>
      <span className="pt-grow">
        <span className="pt-muted sm">{kind.label}{ev.time ? ` · ${ev.time} น.` : ''}</span>
        <span className="pt-strong ellipsis">{ev.name}</span>
        <span className="pt-muted sm ellipsis">{ev.venue || ev.area} · ห่าง {fmtKm(distanceKm(HOME, ev))}</span>
      </span>
      {last ? <span className="pt-ev-badge">วันสุดท้าย</span> : <Icon name="next" size={18} />}
    </button>
  );
}

export default function TodayPage() {
  const { plans: allPlans, places, expenses, memories, jars, piggyLog, groups, settings, today, openSheet, actions } = useProto();
  // whose calendar: mine (every trip I'm on) or one group's (only its trips, and the events shared with it)
  const group = groups.find((g) => g.id === settings.scope) || null;
  const plans = useMemo(() => (group ? allPlans.filter((p) => p.groupId === group.id) : allPlans.filter((p) => p.members.includes(ME))), [allPlans, group]);
  // events are saved places with dates
  const events = useMemo(() => places.filter((p) => p.startDate && (!group || p.groupId === group.id)), [places, group]);
  const navigate = useNavigate();
  const [picked, setPicked] = useState(null);
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
  // which groups I'm out with each day (a dot in the group's colour, two at most); on a group's calendar, its plans
  const groupsOn = useMemo(() => {
    const m = {};
    plans.forEach((p) => {
      // a group's own calendar: its plans in its colour
      const g = group || groups.find((x) => x.id === p.groupId);
      if (!g || !p.startDate) return;
      for (let d = p.startDate, i = 0; d <= (p.endDate || p.startDate) && i < 62; d = addDays(d, 1), i++) {
        const day = (m[d] ||= []);
        if (!day.includes(g.color) && day.length < 2) day.push(g.color);
      }
    });
    return m;
  }, [plans, groups, group]);
  // days with a kept event (a dot on the calendar)
  const eventsOn = useMemo(() => {
    const m = {};
    events.forEach((ev) => {
      for (let d = ev.startDate, i = 0; d <= (ev.endDate || ev.startDate) && i < 62; d = addDays(d, 1), i++) m[d] = true;
    });
    return m;
  }, [events]);

  const dayPlans = plans.filter((p) => p.startDate && selected >= p.startDate && selected <= (p.endDate || p.startDate));
  const plan = dayPlans.find((p) => p.kind !== 'outing') || dayPlans[0] || null;
  // the day's other plans (an event during a trip, two outings…), each its own row under the main one
  const stops = plan ? plan.stops.filter((s) => s.date === selected).sort(byOrder) : [];
  // every plan of the day, in time order by its first stop, each with its own head and stops
  const sections = dayPlans
    .map((p) => ({ p, g: groups.find((x) => x.id === p.groupId), stops: p.stops.filter((s) => s.date === selected).sort(byOrder) }))
    .sort((a, b) => (a.stops[0]?.time || '99').localeCompare(b.stops[0]?.time || '99'));
  const multi = sections.length > 1;
  const dayStops = sections.flatMap((x) => x.stops); // the whole day in order, for the one check-in button
  const country = countryOf(plan?.country);
  const nowHM = localHM(country.utc);
  const live = plan && selected === today && planStatus(plan, today) === 'ongoing' && plan.kind !== 'outing';
  const nextStop = selected === today ? stops.find((s) => !s.checkIns?.[ME]) : null;
  const nextCheck = nextCheckIndex(dayStops, today, nowHM);

  // stage chips
  const upcoming = plans.filter((p) => planStatus(p, today) === 'upcoming' && p.kind !== 'outing').sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  // savings live with their trip now; home only shows how the next trip's piggy is doing
  const upJar = upcoming && jars.find((j) => j.planId === upcoming.id);
  const upSaved = upJar && jarStats(upJar, piggyLog, plans, expenses);
  const jar = upJar || jars[0];
  const piggy = jar && (jar === upJar ? upSaved : jarStats(jar, piggyLog, plans, expenses));
  const openPiggy = () => (jar ? openSheet('piggy', { jarId: jar.id }) : openSheet('newJar'));
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
  const daySub = [holiday, stops.length ? `${stops.length} จุดแวะ` : 'ยังไม่มีแผน'].filter(Boolean).join(' · ');
  // events on the selected day
  const dayEvents = events.filter((ev) => eventOn(ev, selected)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
  // the soonest event worth a note: on today, tomorrow, or ending within two days
  const evSoon = events.filter((ev) => (ev.endDate || ev.startDate) >= today && ev.startDate <= addDays(today, 1))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const evNote = evSoon && (() => {
    const away = `ห่าง ${fmtKm(distanceKm(HOME, evSoon))}`;
    const open = () => openSheet('place', { placeId: evSoon.id });
    if (evSoon.startDate > today) return { key: 'event', icon: EVENT_KINDS[evSoon.kind]?.icon || 'event', text: `พรุ่งนี้มีงาน${keepThai(evSoon.name)} ${away}`, onClick: open };
    const left = diffDays(today, evSoon.endDate || evSoon.startDate);
    return { key: 'event', icon: EVENT_KINDS[evSoon.kind]?.icon || 'event', text: left > 0 ? `${keepThai(evSoon.name)} อีก ${left} วันจบ ${away}` : `วันนี้วันสุดท้าย${keepThai(evSoon.name)}`, onClick: open };
  })();
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
    { key: 'day', flag: country.code, text: `Day ${diffDays(plan.startDate, today) + 1} ที่${keepThai(country.name)}แล้วน้า`, onClick: () => navigate(`/proto/plan/${plan.id}`) },
    { key: 'time', icon: 'clock', text: `ที่นั่นตอนนี้ ${nowHM} (${country.utc - 7 >= 0 ? '+' : ''}${country.utc - 7} ชม.)` },
    { key: 'spend', icon: 'wallet', text: `วันนี้ใช้ไป ${fmtMoney(todaySpendLocal, plan.currency)} แล้วนะ`, onClick: () => openSheet('expense') },
  ] : [
    upcoming && { key: 'trip', icon: 'plane', text: `อีก ${diffDays(today, upcoming.startDate)} วันได้ไป${keepThai(upcoming.name)}แล้ว!`, onClick: () => navigate(`/proto/plan/${upcoming.id}`) },
    wantCount > 0 && shufflePool(places, allPlans, today, group).length > 0 && { key: 'want', icon: 'shuffle', text: `เก็บที่อยากไปไว้ ${wantCount} แห่งแล้ว สุ่มให้มั้ย?`, onClick: () => openSheet('shuffle', { date: today }) },
  ]),
  evNote,
  nextHoliday && { key: 'holiday', icon: 'calendar', text: nextHoliday === today ? `วันนี้${HOLIDAYS[today]} ไปเที่ยวไหนดี?` : `อีก ${diffDays(today, nextHoliday)} วันหยุด${HOLIDAYS[nextHoliday]}`, onClick: () => setSelected(nextHoliday) },
  // always-there notes, so someone with no trips or places still gets something to read
  wxNote,
  jar
    ? piggy.balance < jar.goal && { key: 'jar', icon: jar.icon || 'piggy', text: `${keepThai(jar.name)} อีก ${fmtMoney(jar.goal - piggy.balance)} ถึงเป้า`, onClick: openPiggy }
    : { key: 'jar', icon: 'piggy', text: 'เริ่มเก็บเงินไปเที่ยวกันมั้ย?', onClick: openPiggy },
  !upcoming && !live && { key: 'plan', icon: 'map', text: wantCount ? 'ยังไม่มีทริปเลย วางแผนสักที่มั้ย?' : 'อยากไปไหน เก็บไว้ในแผนที่ก่อนเลย', onClick: () => (wantCount ? openSheet('createPlan') : navigate('/proto/map')) },
  ].filter(Boolean);

  // something saved I haven't been to yet, for the shuffle on an empty day
  const canShuffle = selected >= today && shufflePool(places, allPlans, selected, group).length > 0;

  // memory from about a year ago, else the latest one with a photo
  const throwback = useMemo(() => {
    const withPhoto = memories.filter((m) => m.photos?.length && m.date < today);
    const yearAgo = withPhoto.find((m) => Math.abs(diffDays(m.date, addDays(today, -365))) <= 3);
    return yearAgo ? { m: yearAgo, label: 'วันนี้เมื่อปีที่แล้ว' } : withPhoto[0] ? { m: withPhoto[0], label: 'ความทรงจำล่าสุด' } : null;
  }, [memories, today]);

  // the day's title, when there's no weather card to say it
  const dayHead = !wxSel && (
    <div className="pt-day-head">
                <span className="pt-grow">
                  <span className="pt-strong lg">{dayTitle}</span>
                  <span className="pt-muted sm">{daySub}{selPlace ? ` · ${selPlace}` : ''}</span>
                </span>
              </div>
  );
  // one plan of the day, its own card: its head, its own map, its stops, then add a stop / open the plan
  // (the day's ongoing trip also gets its next stop, and noting a spend instead of adding a stop)
  const renderCard = ({ p, g, stops: ss }) => {
    const pins = ss.filter((s) => s.lat != null && !s.skip);
    const isLive = live && p === plan;
    return (
      <div key={p.id} className="hp-tile pt-day-card">
        {!multi && dayHead}
        <PlanHead plan={p} group={g} onOpen={() => navigate(`/proto/plan/${p.id}`)} onGroup={() => openSheet('group', { groupId: g.id })} />
        {pins.length > 0 && <DayMap pins={pins} order={ss} onOpen={() => navigate(`/proto/plan/${p.id}`)} />}
        {ss.length > 0 && (
          <div className="pt-lines">
            {ss.map((s) => {
              const i = dayStops.indexOf(s);
              return (
                <StopRow key={s.id} stop={s} planId={p.id} state={stopState(s, today, nowHM)}
                  checkHere={selected === today && i === nextCheck} passed={passedStop(dayStops, i, today)} onOpen={() => openSheet('stop', { planId: p.id, stopId: s.id })} />
              );
            })}
          </div>
        )}
        {isLive && nextStop && (
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
          <button className="hp-add-btn" onClick={() => openSheet(isLive ? 'expense' : 'addStop', isLive ? {} : { planId: p.id, date: selected })}>
            <Icon name={isLive ? 'wallet' : 'plus'} size={18} stroke={2.2} /> {isLive ? 'จดรายจ่าย' : 'เพิ่มจุดแวะ'}
          </button>
          <button className="pt-btn light pt-open-plan" onClick={() => navigate(`/proto/plan/${p.id}`)}>ดูแผน <Icon name="next" size={16} /></button>
        </div>
      </div>
    );
  };

  return (
    <div ref={pageRef} className={`homepage pt-today${collapsed ? ' header-collapsed' : ''}${atRest ? ' at-rest' : ''}`} style={sheet ? { '--hp-sheet-top': `${sheet.top}px`, '--fold-top': `${FOLD_TOP}px` } : undefined}>
      <div className="hp-header">
        <div className="hp-header-top pt-talk">
          {/* Instagram-style note floating above the avatar */}
          <div className="pt-avatar-note">
            <SpeechNotes notes={notes} />
            {/* me: my own calendar (every trip I'm on); the groups sit beside me, same size */}
            <button aria-pressed={!group} className={`pt-scope-btn${!group ? ' active' : ''}`} onClick={() => actions.setSetting('scope', 'me')}>
              <span className="pt-group-badge pt-scope-me"><img src={PEOPLE[ME].avatar} alt="" /></span><span>{PEOPLE[ME].name}</span>
            </button>
          </div>
          {/* new group stays put; only the list of groups scrolls sideways */}
          <button className="pt-scope-btn pt-scope-add" onClick={() => openSheet('newGroup')}>
            <span className="pt-group-badge add"><Icon name="plus" size={22} /></span><span>กลุ่มใหม่</span>
          </button>
          <div className="pt-scope">
            {groups.map((g) => (
              <button key={g.id} aria-pressed={group?.id === g.id} className={`pt-scope-btn${group?.id === g.id ? ' active' : ''}`} onClick={() => actions.setSetting('scope', g.id)}>
                <span className="pt-group-badge" style={{ background: g.color }}><Icon name={g.icon} size={22} /></span><span>{g.name}</span>
              </button>
            ))}
          </div>
        </div>
        {/* step 2 stop for the card sheet: it rises over the greeting up to here */}
        <span className="hp-pill-row pt-snap-stop" aria-hidden="true" style={sheet ? { height: FOLD_TOP + sheet.folded } : undefined} />
      </div>

      <div className="hp-stage" ref={stageRef} style={sheet?.clip && atRest ? { clipPath: `inset(0 0 ${sheet.clip}px 0)` } : undefined}>
        {/* the calendar sits where the 3D piggy used to be; the sheet folds it to one week as it rises */}
        <div className="hp-tile hp-plan-card">
          <MonthCalendar selected={selected} today={today} onSelect={setSelected} stopsOn={stopsOn} eventsOn={eventsOn} groupsOn={groupsOn} plans={plans} />
        </div>
      </div>

      <div className="hp-sheet-frame" aria-hidden="true"><div className="hp-sheet-bg" /><span className="hp-sheet-handle" /></div>

      <div className="hp-content" onScroll={(e) => { setCollapsed(e.currentTarget.scrollTop > 40); setAtRest(e.currentTarget.scrollTop < 4); }}>
        <div className="hp-stage-spacer" />

        {/* one block for the whole sheet, so a drag anywhere on it (gaps and handle too) moves it */}
        <div className="pt-home-sheet">
          {/* the selected day's weather, its own card */}
          {wxSel && <WeatherCard wx={wxSel} place={selPlace || 'กรุงเทพฯ'} title={dayTitle} holiday={holiday} night={night} clock={selected === today} utc={countryOf(tripSel?.country).utc} />}

          {/* events on the selected day */}
          {dayEvents.map((ev) => <EventTile key={ev.id} ev={ev} last={ev.endDate && ev.endDate !== ev.startDate && ev.endDate === selected} onOpen={() => openSheet('place', { placeId: ev.id })} />)}

          {/* the selected day's plans: a card each, side by side when there are several */}
          {multi ? (
            <>
              {dayHead}
              <div className="pt-day-row">{sections.map(renderCard)}</div>
            </>
          ) : sections.length ? renderCard(sections[0]) : (
            <div className="hp-tile pt-day-card">
              {dayHead}
              {/* a group's page: whose calendar this is, and its info, even on a day without plans */}
              {group && <PlanHead group={group} invite={selected === today ? 'วันนี้ยังว่าง ไปไหนกันดี?' : 'วันนั้นยังว่าง ชวนกันไปไหนดี?'} onOpen={() => openSheet('group', { groupId: group.id })} onGroup={() => openSheet('group', { groupId: group.id })} />}
              <div className="hp-plan-actions">
                <button className="hp-add-btn" onClick={() => openSheet('createPlan', { date: selected })}><Icon name="plus" size={18} stroke={2.2} /> {selected === today ? 'สร้างแผนวันนี้' : 'สร้างแผน'}</button>
                {canShuffle && <button className="pt-btn light" onClick={() => openSheet('shuffle', { date: selected })}><Icon name="shuffle" size={16} /> สุ่มให้</button>}
              </div>
            </div>
          )}

          {/* the next trip, only once it's 3 days away or less (the speech note counts down before that) */}
          {!live && upcoming && diffDays(today, upcoming.startDate) <= 3 && (
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

          {/* this month's going-out money: the piggy with what's left */}
          {!group && (
            <div className="hp-section">
              <SectionTitle title="งบเที่ยวเดือนนี้" action="ดูทั้งหมด" onAction={() => openSheet('month')} />
              <MonthPiggyTile />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
