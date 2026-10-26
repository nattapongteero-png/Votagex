import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from './useProto';
import { Sheet, Avatar, Chip } from './ui';
import Icon, { SourceBadge } from './icons';
import { ME, PEOPLE, KINDS, addDays, diffDays, dayList, parseISO, thaiShort, byOrder, nextOrder, stopState, passedStop, checkInFrom, countryOf, localHM, directionsUrl, sendInvite } from './data';

const after = (close, fn) => { close(); setTimeout(fn, 320); };

function MenuRow({ icon, label, sub, danger, onClick }) {
  return (
    <button className={`pt-result${danger ? ' danger' : ''}`} onClick={onClick}>
      <span className="pt-menu-icon"><Icon name={icon} size={18} /></span>
      <span className="pt-grow"><span className="pt-strong">{label}</span>{sub && <span className="pt-muted sm">{sub}</span>}</span>
    </button>
  );
}

// ⋯ on a plan: edit, invite to its group, not going after all, delete.
// A group's plan is deleted by whoever made it or made the group (as the rules allow), after a second tap.
export function PlanMenuSheet({ onClose, planId }) {
  const { plans, groups, actions, showToast, openSheet } = useProto();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return null;
  const group = groups.find((g) => g.id === plan.groupId);
  const mine = !plan.createdBy || plan.createdBy === ME;
  const canDelete = !plan.groupId || mine || group?.createdBy === ME;
  const others = plan.members.filter((id) => id !== ME);

  const remove = (close) => {
    if (group && !confirm) { setConfirm(true); return; }
    actions.removePlan(plan.id);
    close();
    navigate('/proto/plans', { replace: true });
  };

  return (
    <Sheet title={plan.name} subtitle={KINDS[plan.kind].label} onClose={onClose}>
      {(close) => (
        <div className="pt-results">
          <MenuRow icon="edit" label="แก้ไข" onClick={() => after(close, () => openSheet('editPlan', { planId }))} />
          {group && (
            <MenuRow icon="link" label={`ชวนเพื่อนเข้า “${group.name}”`} onClick={() => {
              actions.invite(group).then((link) => sendInvite(link, group.name, showToast)).catch(() => showToast('สร้างลิงก์ไม่สำเร็จ'));
            }} />
          )}
          {group && plan.members.includes(ME) && others.length > 0 && (
            <MenuRow icon="leave" label="ไม่ไปแล้ว" onClick={() => { actions.leavePlan(plan.id); showToast('ออกจากแผนนี้แล้ว'); close(); }} />
          )}
          {canDelete && (
            <MenuRow icon="trash" danger label={confirm ? 'แตะอีกครั้งเพื่อลบ' : 'ลบแผน'}
              sub={confirm ? `“${group.name}” จะไม่เห็นแผนนี้อีก` : null} onClick={() => remove(close)} />
          )}
        </div>
      )}
    </Sheet>
  );
}

// Name, dates and who's going. Moving the dates moves the stops with them.
export function EditPlanSheet({ onClose, planId }) {
  const { plans, groups, actions, showToast, cloud, today } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const group = plan && groups.find((g) => g.id === plan.groupId);
  // signed in, only people in the plan's group can come (they're the ones who can see it)
  const people = group ? group.members : cloud ? [ME] : Object.keys(PEOPLE);
  const outing = plan?.kind === 'outing';
  const [name, setName] = useState(plan?.name || '');
  const [start, setStart] = useState(plan?.startDate || addDays(today, 7));
  const [end, setEnd] = useState(plan?.endDate || addDays(today, 9));
  const [noDates, setNoDates] = useState(!plan?.startDate);
  const [members, setMembers] = useState(() => (plan?.members || [ME]).filter((id) => people.includes(id)));
  if (!plan) return null;

  const save = (close) => {
    const s = outing || !noDates ? start : null;
    const e = !s ? null : outing || end < start ? start : end;
    const kind = outing ? 'outing' : !s ? 'idea' : plan.country !== 'TH' ? 'abroad' : 'trip';
    // each stop moves as many days as the start did, and stays inside the plan
    const stopDates = {};
    if (s) {
      plan.stops.forEach((st) => {
        const moved = st.date && plan.startDate ? addDays(st.date, diffDays(plan.startDate, s)) : s;
        const d = moved < s ? s : moved > e ? e : moved;
        if (d !== st.date) stopDates[st.id] = d;
      });
    }
    actions.editPlan(plan.id, { name: name.trim() || plan.name, kind, startDate: s, endDate: e, members }, stopDates);
    showToast('บันทึกแล้ว');
    close();
  };

  return (
    <Sheet title="แก้ไขแผน" onClose={onClose} tall footer={(close) => <button className="pt-btn block" onClick={() => save(close)}>บันทึก</button>}>
      <div className="pt-label">ชื่อ</div>
      <input className="pt-input" value={name} placeholder={plan.name} onChange={(e) => setName(e.target.value)} />
      <div className="pt-label">เมื่อไร</div>
      {outing ? (
        <input type="date" className="pt-input" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
      ) : (
        <>
          {!noDates && (
            <div className="pt-date-row">
              <label><span>ไป</span><input type="date" className="pt-input" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} /></label>
              <label><span>กลับ</span><input type="date" className="pt-input" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} /></label>
            </div>
          )}
          <div className="pt-chip-row"><Chip active={noDates} onClick={() => setNoDates((v) => !v)}>ยังไม่รู้วัน</Chip></div>
        </>
      )}
      <div className="pt-label">ใครไป</div>
      <div className="pt-people">
        {people.map((id) => (
          <button key={id} className={`pt-person check${members.includes(id) ? ' active' : ''}`} disabled={id === ME}
            onClick={() => setMembers((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]))}>
            <Avatar id={id} size={40} /><span>{id === ME ? 'ฉัน' : PEOPLE[id]?.name}</span>
            {members.includes(id) && <i className="pt-person-check"><Icon name="check" size={12} stroke={3} /></i>}
          </button>
        ))}
      </div>
    </Sheet>
  );
}


const HOURS = Array.from({ length: 19 }, (_, i) => String(i + 6).padStart(2, '0')); // 06–24
const MINUTES = ['00', '15', '30', '45'];

// 24-hour time by taps: an hour strip and quarter hours; "ไม่ระบุ" clears it.
// min / max: the stops before and after it, so the times keep the stops' order
function TimePicker({ value, onChange, min = '', max = '' }) {
  const box = useRef(null);
  const [h, m] = value ? value.split(':') : ['', '00'];
  useEffect(() => {
    const el = box.current?.querySelector('.active') || box.current?.querySelector('button:not(:disabled)');
    el?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, []);
  const ok = (t) => (!min || t >= min) && (!max || t <= max);
  // an hour works if any quarter of it does; landing on it keeps the minutes if they still fit
  const pickHour = (hh) => {
    const mm = [m, ...MINUTES].find((x) => ok(`${hh}:${x}`)) || '00';
    onChange(`${hh}:${mm}`);
  };
  return (
    <>
      <div className={`pt-time-big${value && !ok(value) ? ' bad' : ''}`}>{value || '--:--'}<small>{value ? 'น.' : ''}</small></div>
      <div className="pt-hour-strip" ref={box}>
        {HOURS.map((hh) => (
          <button key={hh} disabled={!MINUTES.some((x) => ok(`${hh}:${x}`))} className={`pt-hour${h === hh ? ' active' : ''}`} onClick={() => pickHour(hh)}>{hh}</button>
        ))}
      </div>
      <div className="pt-chip-row">
        {MINUTES.map((mm) => (
          <button key={mm} className={`pt-chip${value && m === mm ? ' active' : ''}`} disabled={!ok(`${h || '09'}:${mm}`)} onClick={() => onChange(`${h || '09'}:${mm}`)}>:{mm}</button>
        ))}
        <Chip active={!value} onClick={() => onChange('')}>ไม่ระบุ</Chip>
      </div>
      {(min || max) && (
        <div className="pt-muted sm">{[min && `หลังจุดก่อนหน้า ${min}`, max && `ก่อนจุดถัดไป ${max}`].filter(Boolean).join(' · ')}</div>
      )}
    </>
  );
}

// A stop: when (time first, it's what's usually missing), which day, a note; directions and the clip it came from
export function StopSheet({ onClose, planId, stopId }) {
  const { plans, places, actions, today } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const stop = plan?.stops.find((s) => s.id === stopId);
  // the clip it was saved from, to look at again once there
  const source = stop?.placeId && places.find((p) => p.id === stop.placeId)?.source;
  const [time, setTime] = useState(stop?.time || '');
  const [date, setDate] = useState(stop?.date || null);
  const [note, setNote] = useState(stop?.note || '');
  if (!stop) return null;
  const days = dayList(plan.startDate, plan.endDate);
  // its neighbours on the chosen day (moved to another day, it goes last there)
  const sameDay = plan.stops.filter((s) => s.date === date && s.id !== stop.id).sort(byOrder);
  const at = date === stop.date ? plan.stops.filter((s) => s.date === date).sort(byOrder).findIndex((s) => s.id === stop.id) : sameDay.length;
  const min = sameDay.slice(0, at).map((s) => s.time).filter(Boolean).sort().pop() || '';
  const max = sameDay.slice(at).map((s) => s.time).filter(Boolean).sort()[0] || '';
  const fits = !time || ((!min || time >= min) && (!max || time <= max));
  const clip = ['tiktok', 'instagram'].includes(source?.type) && source.url;
  // checking in here: today only, from an hour before; late (or left behind earlier) it's still allowed
  const st = stopState(stop, today, localHM(countryOf(plan.country).utc));
  const mine = stop.checkIns?.[ME];
  const dayStops = plan.stops.filter((s) => s.date === stop.date).sort(byOrder);
  const passed = passedStop(dayStops, dayStops.findIndex((s) => s.id === stop.id), today);
  const changed = time !== (stop.time || '') || date !== (stop.date || null) || note.trim() !== (stop.note || '');

  return (
    <Sheet title={stop.name} subtitle={stop.area} onClose={onClose}
      footer={(close) => (
        <button className="pt-btn block" disabled={changed && !fits} onClick={() => {
          if (changed) actions.updateStop(plan.id, stop.id, { time, date, note: note.trim(), ...(date !== stop.date && { order: nextOrder(plan.stops, date) }) });
          close();
        }}>
          {changed && !fits ? 'เวลาต้องอยู่ระหว่างจุดก่อนหน้ากับจุดถัดไป' : changed ? 'บันทึก' : 'เสร็จ'}
        </button>
      )}>
      {(close) => (
        <>
          <div className="pt-row-actions">
            <a className="pt-btn light sm" href={directionsUrl(stop)} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> นำทาง</a>
            {clip && (
              <a className="pt-btn light sm" href={source.url} target="_blank" rel="noreferrer"><SourceBadge type={source.type} size={20} /> {source.type === 'tiktok' ? 'ดูคลิป' : 'ดูโพสต์'}</a>
            )}
          </div>

          {stop.date === today && st !== 'skipped' && (
            <div className="pt-stop-checkrow">
              {mine ? (
                <>
                  <span className="pt-grow pt-strong pos"><Icon name="check" size={16} stroke={2.6} className="pt-inline-icon" /> เช็คอินแล้ว {mine.at}{mine.late ? ' · มาสาย' : ''}</span>
                  <button className="pt-text-btn" onClick={() => actions.toggleCheckIn(plan.id, stop.id)}>ยกเลิก</button>
                </>
              ) : st === 'early' ? (
                <span className="pt-muted">เช็คอินได้ตั้งแต่ {checkInFrom(stop.time)}</span>
              ) : (
                <button className={`pt-btn block${st === 'due' ? ' danger-fill' : ''}`} onClick={() => actions.toggleCheckIn(plan.id, stop.id, st === 'due')}>
                  <Icon name="check" size={16} stroke={2.6} /> {passed ? 'เช็คอินย้อนหลัง' : st === 'due' ? 'เลยเวลาแล้ว · เช็คอิน' : 'เช็คอิน'}
                </button>
              )}
            </div>
          )}

          <div className="pt-label">เวลา</div>
          <TimePicker key={date} value={time} onChange={setTime} min={min} max={max} />

          {days.length > 1 && (
            <>
              <div className="pt-label">วัน</div>
              <div className="pt-day-strip">
                {days.map((d, i) => (
                  <button key={d} className={`pt-day-pill${date === d ? ' active' : ''}`} onClick={() => setDate(d)}>
                    <small>Day {i + 1}</small><b>{parseISO(d).getDate()}</b><small>{thaiShort(d).split(' ')[1]}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="pt-label">โน้ต</div>
          <textarea className="pt-input pt-note-input" rows={2} value={note} placeholder="เช่น สั่งอะไร จองไว้ชื่อใคร" onChange={(e) => setNote(e.target.value)} />

          <div className="pt-text-row">
            {!mine && (
              <button className="pt-text-btn" onClick={() => { actions.updateStop(plan.id, stop.id, { skip: !stop.skip }); close(); }}>
                <Icon name={stop.skip ? 'back' : 'close'} size={16} /> {stop.skip ? 'กลับไปจุดนี้' : 'ไม่ไปจุดนี้'}
              </button>
            )}
            <button className="pt-text-btn danger" onClick={() => { actions.removeStop(plan.id, stop.id); close(); }}><Icon name="trash" size={16} /> ลบจุดแวะนี้</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
