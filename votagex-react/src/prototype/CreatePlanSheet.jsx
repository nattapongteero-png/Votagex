import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from './useProto';
import { Sheet, Avatar, Chip, CatIcon, Seg } from './ui';
import Icon, { Flag } from './icons';
import { ResultList } from './SavePlaceSheet';
import { usePlaceSearch } from './placeSearch';
import {
  ME, PEOPLE, PLACE_CATS, HOME, EVENT_KINDS, sendInvite, countryOf, addDays, parseISO, thaiShort, distanceKm, fmtKm, eventOn, eventEnded,
} from './data';

const PLAN_TYPES = [{ value: 'outing', label: 'นัด · วันเดียว' }, { value: 'trip', label: 'ทริป · ค้างคืน' }];
const TH_DOW = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const TIMES = [['', 'ไม่ระบุ'], ['10:00', 'เช้า'], ['12:00', 'เที่ยง'], ['15:00', 'บ่าย'], ['18:00', 'เย็น']];

const dayLabel = (d, today) => (d === today ? 'วันนี้' : d === addDays(today, 1) ? 'พรุ่งนี้' : `${TH_DOW[parseISO(d).getDay()]} ${thaiShort(d)}`);

// Days to tap, from today on; anything further through the phone's own date picker
function DayStrip({ value, onPick, from, count = 45 }) {
  const box = useRef(null);
  const other = useRef(null);
  useEffect(() => { box.current?.querySelector('.active')?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, []);
  return (
    <div className="pt-day-strip" ref={box}>
      {Array.from({ length: count }, (_, i) => addDays(from, i)).map((d) => {
        const dt = parseISO(d);
        return (
          <button key={d} className={`pt-day-pill${value === d ? ' active' : ''}${dt.getDay() % 6 === 0 ? ' weekend' : ''}`} onClick={() => onPick(d)}>
            <small>{TH_DOW[dt.getDay()]}</small><b>{dt.getDate()}</b><small>{thaiShort(d).split(' ')[1]}</small>
          </button>
        );
      })}
      <button className="pt-day-pill other" onClick={() => { try { other.current.showPicker(); } catch { other.current.focus(); } }}>
        <Icon name="calendar" size={18} /><small>วันอื่น</small>
        <input ref={other} type="date" min={from} value={value || ''} tabIndex={-1} onChange={(e) => e.target.value && onPick(e.target.value)} />
      </button>
    </div>
  );
}

// One line of the summary; tapped, it opens to change that one thing
function SumRow({ icon, title, value, open, onToggle, children }) {
  return (
    <div className={`pt-sum-row${open ? ' open' : ''}`}>
      <button className="pt-sum-head" aria-expanded={open} onClick={onToggle}>
        <span className="me-row-icon"><Icon name={icon} size={16} /></span>
        <span className="pt-grow"><span className="pt-muted sm">{title}</span><span className="pt-strong">{value}</span></span>
        <Icon name="next" size={16} className="pt-sum-chev" />
      </button>
      {open && <div className="pt-sum-body">{children}</div>}
    </div>
  );
}

// First where to go (saved places first), then a summary with everything else already filled in.
// place: start from a place (a saved one, or an event's venue); date/time/name/groupId: prefilled;
// undated: a trip idea without dates yet
export default function CreatePlanSheet({ onClose, place, groupId, type: startType, date, time: startTime = '', name: startName = '', undated = false }) {
  const { actions, closeSheet, today, groups, places, settings, cloud, showToast } = useProto();
  const navigate = useNavigate();
  const fromDay = date && date >= today ? date : null;
  const [type, setType] = useState(startType || 'outing');
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState(place ? { ...place, key: 'prefill' } : null);
  const [noPlace, setNoPlace] = useState(false); // a trip named before knowing where
  const [day, setDay] = useState(fromDay || today);
  const [time, setTime] = useState(startTime);
  const [start, setStart] = useState(fromDay || addDays(today, 7));
  const [nights, setNights] = useState(2);
  const [noDates, setNoDates] = useState(undated);
  const [name, setName] = useState(startName);
  // the group it's for: the one asked for, else the one home is showing; its members come along by default
  const [group, setGroup] = useState(() => groups.find((g) => g.id === (groupId || settings.scope)) || null);
  const [members, setMembers] = useState(() => group?.members || [ME]);
  const [open, setOpen] = useState(null); // the summary row being changed
  const pickGroup = (g) => { setGroup(g); setMembers(g ? g.members : [ME]); };
  const toggle = (row) => setOpen((o) => (o === row ? null : row));
  const outing = type === 'outing';
  const picking = !dest && !noPlace;
  const search = usePlaceSearch(picking ? query : '', { withDestinations: !outing });

  // saved places for an outing: that day's events first, then the nearest
  const q = query.trim().toLowerCase();
  const saved = outing && picking ? places
    .filter((p) => p.status !== 'visited' && !eventEnded(p, today) && (p.country || 'TH') === 'TH' && (!p.startDate || eventOn(p, day)) && (!q || p.name.toLowerCase().includes(q)))
    .map((p) => ({ ...p, km: distanceKm(HOME, p) }))
    .sort((a, b) => Number(Boolean(b.startDate)) - Number(Boolean(a.startDate)) || a.km - b.km)
    .slice(0, q ? 4 : 6) : [];

  const country = dest?.country || 'TH';
  const c = countryOf(country);
  const end = addDays(start, nights);
  const dates = outing ? [day, day] : noDates ? [null, null] : [start, end];
  const kind = outing ? 'outing' : noDates ? 'idea' : country !== 'TH' ? 'abroad' : 'trip';
  const autoName = dest ? (outing ? `ไป ${dest.name}` : `ทริป${dest.name}`) : '';
  const title = name.trim() || autoName;
  const ready = outing ? Boolean(dest) : Boolean(title);
  const cat = dest?.cat in PLACE_CATS ? dest.cat : 'sight';

  const pick = (p) => {
    setDest(p);
    if (p.startDate && p.time && !time) setTime(p.time);
  };
  const changePlace = () => { setDest(null); setNoPlace(false); setQuery(''); setOpen(null); };

  const create = () => {
    // an outing's place is its first stop; a trip's is where it goes (unless it started from a place)
    const firstStop = dest && dates[0] && (outing || place) ? [{
      date: dates[0], time: outing ? time : '', name: dest.name, area: dest.venue || dest.area, prov: dest.prov, lat: dest.lat, lng: dest.lng, cat,
      note: '', checkIns: {}, placeId: dest.savedAt ? dest.id : undefined, eventId: dest.eventId,
    }] : [];
    const id = actions.addPlan({
      name: title, kind, country, currency: c.currency,
      destination: dest ? { name: dest.name, lat: dest.lat, lng: dest.lng } : null,
      startDate: dates[0], endDate: dates[1], members, groupId: group?.id || null, budget: 0,
      cover: outing ? { icon: cat, tint: PLACE_CATS[cat].bg } : { icon: kind === 'abroad' ? 'globe' : 'sight', tint: kind === 'abroad' ? '#E8F3FF' : '#E6F7F4' },
      checklist: kind === 'abroad' ? [
        { id: 'a1', text: 'พาสปอร์ตอายุเหลือเกิน 6 เดือน', done: false },
        { id: 'a2', text: 'เช็กเงื่อนไขวีซ่า / ลงทะเบียนเข้าเมือง', done: false },
        { id: 'a3', text: 'ประกันการเดินทาง', done: false },
        { id: 'a4', text: 'eSIM / Pocket WiFi', done: false },
        { id: 'a5', text: `แลกเงิน ${c.currency}`, done: false },
      ] : undefined,
      stops: firstStop,
    });
    closeSheet();
    navigate(`/proto/plan/${id}`);
  };

  const people = cloud ? (group ? group.members : [ME]).map((id) => PEOPLE[id]).filter(Boolean) : Object.values(PEOPLE);
  const others = members.filter((id) => id !== ME).map((id) => PEOPLE[id]?.name).filter(Boolean);
  const whoText = group ? `${group.name} · ${members.length} คน` : others.length ? `ฉัน, ${others.join(', ')}` : 'ไปคนเดียว';
  const whenText = outing
    ? `${dayLabel(day, today)} · ${time ? `${time} น.` : 'ยังไม่ใส่เวลา'}`
    : noDates ? 'ยังไม่รู้วัน' : `${thaiShort(start)} – ${thaiShort(end)} · ${nights + 1} วัน ${nights} คืน`;

  return (
    <Sheet title="แผนใหม่" onClose={onClose} tall
      footer={<button className="pt-btn block" disabled={!ready} onClick={create}>{ready ? (outing ? 'สร้างนัด' : 'สร้างทริป') : picking ? 'เลือกที่ไปก่อน' : 'ตั้งชื่อทริปก่อน'}</button>}>
      <Seg value={type} onChange={(t) => { setType(t); setOpen(null); }} items={PLAN_TYPES} />

      {picking ? (
        <>
          <div className="pt-search">
            <Icon name="search" size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={outing ? 'ค้นหาที่ไป' : 'จังหวัด เมือง ประเทศ'} />
          </div>
          {saved.length > 0 && (
            <>
              <div className="pt-label">ที่อยากไป</div>
              <div className="pt-results">
                {saved.map((p) => (
                  <button key={p.id} className="pt-result" onClick={() => pick(p)}>
                    <CatIcon cat={p.cat} size={36} />
                    <span className="pt-grow">
                      <span className="pt-strong ellipsis">{p.name}</span>
                      <span className="pt-muted sm ellipsis">
                        {p.startDate ? `${EVENT_KINDS[p.kind]?.label || 'งาน'}วันนั้น${p.time ? ` · ${p.time} น.` : ''}` : p.venue || p.area}
                      </span>
                    </span>
                    <span className="pt-muted sm">{fmtKm(p.km)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {q && <ResultList search={search} onPick={pick} />}
          {!outing && !q && (
            <button className="pt-btn light block" onClick={() => { setNoPlace(true); setOpen('name'); }}>ยังไม่รู้ที่ไป · ตั้งชื่อทริปเอง</button>
          )}
        </>
      ) : (
        <>
          {dest ? (
            <div className="pt-picked-row boxed">
              <CatIcon cat={cat} size={44} />
              <div className="pt-grow">
                <div className="pt-strong">{dest.name}</div>
                <div className="pt-muted sm"><Flag code={c.code} /> {c.name}{dest.venue || dest.area ? ` · ${dest.venue || dest.area}` : ''}</div>
              </div>
              <button className="pt-chip" onClick={changePlace}>เปลี่ยน</button>
            </div>
          ) : (
            <button className="pt-picked-row boxed pt-pick-later" onClick={changePlace}>
              <span className="pt-cat-icon pt-pick-icon"><Icon name="search" size={20} /></span>
              <span className="pt-grow"><span className="pt-strong">ยังไม่ได้เลือกที่ไป</span><span className="pt-muted sm">แตะเพื่อเลือก</span></span>
            </button>
          )}

          <div className="pt-sum">
            <SumRow icon="calendar" title="เมื่อไร" value={whenText} open={open === 'when'} onToggle={() => toggle('when')}>
              {outing ? (
                <>
                  <DayStrip value={day} onPick={setDay} from={today} />
                  <div className="pt-chip-row wrap">
                    {TIMES.map(([t, label]) => <Chip key={label} active={time === t} onClick={() => setTime(t)}>{label}{t ? ` ${t.slice(0, 2)}:00` : ''}</Chip>)}
                    <label className={`pt-chip pt-time-chip${time && !TIMES.some(([t]) => t === time) ? ' active' : ''}`}>
                      <Icon name="clock" size={14} /> {time && !TIMES.some(([t]) => t === time) ? time : 'เวลาอื่น'}
                      <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  {!noDates && (
                    <>
                      <div className="pt-muted sm">วันไป</div>
                      <DayStrip value={start} onPick={setStart} from={today} />
                      <div className="pt-stepper">
                        <span className="pt-muted pt-stepper-label">ค้างกี่คืน</span>
                        <button className="pt-round-btn sm" aria-label="น้อยลง" disabled={nights <= 1} onClick={() => setNights((n) => n - 1)}><Icon name="minus" size={16} /></button>
                        <b>{nights} คืน</b>
                        <button className="pt-round-btn sm" aria-label="มากขึ้น" disabled={nights >= 30} onClick={() => setNights((n) => n + 1)}><Icon name="plus" size={16} /></button>
                      </div>
                    </>
                  )}
                  <Chip active={noDates} onClick={() => setNoDates((v) => !v)}>ยังไม่รู้วัน</Chip>
                </>
              )}
            </SumRow>

            <SumRow icon="users" title="ไปกับ" value={whoText} open={open === 'who'} onToggle={() => toggle('who')}>
              {groups.length > 0 && (
                <div className="pt-chip-row wrap">
                  <Chip active={!group} onClick={() => pickGroup(null)}>ไม่มีกลุ่ม</Chip>
                  {groups.map((g) => <Chip key={g.id} active={group?.id === g.id} color={g.color} onClick={() => pickGroup(g)}><Icon name={g.icon} size={14} className="pt-inline-icon" /> {g.name}</Chip>)}
                </div>
              )}
              <div className="pt-people">
                {/* signed in, only people in the plan's group can come (they're the ones who can see it) */}
                {people.map((p) => (
                  <button key={p.id} className={`pt-person check${members.includes(p.id) ? ' active' : ''}`} disabled={p.id === ME}
                    onClick={() => setMembers((m) => (m.includes(p.id) ? m.filter((x) => x !== p.id) : [...m, p.id]))}>
                    <Avatar id={p.id} size={40} /><span>{p.id === ME ? 'ฉัน' : p.name}</span>
                    {members.includes(p.id) && <i className="pt-person-check"><Icon name="check" size={12} stroke={3} /></i>}
                  </button>
                ))}
                {group && (
                  <button className="pt-person invite" onClick={() => actions.invite(group).then((link) => sendInvite(link, group.name, showToast)).catch(() => showToast('สร้างลิงก์ไม่สำเร็จ'))}>
                    <span className="pt-invite-icon"><Icon name="link" size={18} /></span><span>ชวนเข้ากลุ่ม</span>
                  </button>
                )}
              </div>
            </SumRow>

            <SumRow icon="edit" title="ชื่อ" value={title || 'ตั้งชื่อ'} open={open === 'name'} onToggle={() => toggle('name')}>
              <input className="pt-input" autoFocus placeholder={autoName || (outing ? 'ชื่อนัด' : 'ชื่อทริป')} value={name} onChange={(e) => setName(e.target.value)} />
            </SumRow>
          </div>
        </>
      )}
    </Sheet>
  );
}
