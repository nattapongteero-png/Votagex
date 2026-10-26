import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import PiggyStage from '../PiggyStage';
import StopRow from '../StopRow';
import MapView from '../MapView';
import { fmtRate } from '../rates';
import { Avatar, Avatars, CatIcon, Cover, Seg, Progress, SectionTitle, Empty } from '../ui';
import {
  ME, PEOPLE, KINDS, EXPENSE_CATS, CURRENCIES, countryOf, thaiRange, thaiShort, thaiDay, dayList, diffDays,
  planStatus, byOrder, localHM, stopState, nextCheckIndex, passedStop, fmtMoney, toTHB, myShare, settleUp, directionsUrl, jarStats,
} from '../data';

const TABS = [
  { value: 'plan', label: 'แผน' },
  { value: 'map', label: 'แผนที่' },
  { value: 'money', label: 'เงิน' },
  { value: 'memories', label: 'ความทรงจำ' },
];

function DayChips({ days, value, onChange, plan, withAll }) {
  return (
    <div className="pt-day-chips">
      {withAll && (
        <button className={`pt-day${value === 'all' ? ' active' : ''}`} onClick={() => onChange('all')}>
          <b>ทั้งหมด</b><span>{plan.stops.length} จุด</span>
        </button>
      )}
      {days.map((d, i) => (
        <button key={d} className={`pt-day${value === d ? ' active' : ''}`} onClick={() => onChange(d)}>
          <b>Day {i + 1}</b><span>{thaiDay(d)} {thaiShort(d)}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- แผน ---------- */
// Drag a stop's card by its handle to give the day a new order. The other cards slide out of its way while it moves.
// locked: rows that can't move (checked in), and nothing moves past them either
function useDragOrder(onDrop, locked = []) {
  const [drag, setDrag] = useState(null); // { from, to, y0, dy, rects }
  const rows = useRef([]);
  const start = (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ from: i, to: i, y0: e.clientY, dy: 0, rects: rows.current.map((el) => el.getBoundingClientRect()) });
  };
  const move = (e) => setDrag((d) => {
    if (!d) return d;
    const dy = e.clientY - d.y0;
    const mid = d.rects[d.from].top + d.rects[d.from].height / 2 + dy;
    const to = d.rects.filter((r, j) => j !== d.from && r.top + r.height / 2 < mid).length;
    const lo = locked.reduce((m, j) => (j < d.from ? Math.max(m, j + 1) : m), 0);
    const hi = locked.reduce((m, j) => (j > d.from ? Math.min(m, j - 1) : m), d.rects.length - 1);
    return { ...d, dy, to: Math.min(hi, Math.max(lo, to)) };
  });
  const end = () => {
    if (drag && drag.to !== drag.from) onDrop(drag.from, drag.to);
    setDrag(null);
  };
  const style = (i) => {
    if (!drag) return undefined;
    const r = drag.rects;
    // the dragged row's height plus the gap between rows
    const step = r[drag.from].height + (r.length > 1 ? r[1].top - r[0].bottom : 0);
    if (i === drag.from) return { transform: `translateY(${drag.dy}px)`, zIndex: 3, transition: 'none' };
    if (drag.from < drag.to && i > drag.from && i <= drag.to) return { transform: `translateY(${-step}px)` };
    if (drag.from > drag.to && i >= drag.to && i < drag.from) return { transform: `translateY(${step}px)` };
    return { transform: 'none' };
  };
  return { rows, start, move, end, style, from: drag?.from };
}

function PlanTab({ plan, day, setDay, days, status }) {
  const { actions, openSheet, today } = useProto();
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const c = countryOf(plan.country);
  const nowHM = localHM(c.utc);
  const stops = (plan.kind === 'idea' ? plan.stops : plan.stops.filter((s) => s.date === day)).slice().sort(byOrder);
  // the places change order; the times stay in their slots, so the day still runs early to late
  // a stop someone has checked in at stays where it is
  const checkedIn = (s) => Object.keys(s.checkIns || {}).length > 0;
  const locked = stops.map((s, i) => (checkedIn(s) ? i : -1)).filter((i) => i >= 0);
  const dnd = useDragOrder((from, to) => {
    const list = stops.slice();
    list.splice(to, 0, list.splice(from, 1)[0]);
    actions.reorderStops(plan.id, list.map((s, i) => ({ id: s.id, order: i, time: stops[i].time || '' })));
  }, locked);
  const canDrag = status !== 'past' && stops.length > 1;
  const nextCheck = nextCheckIndex(stops, today, nowHM);
  const checklist = plan.checklist || [];
  const doneCount = checklist.filter((x) => x.done).length;
  const visibleChecklist = showAllChecklist ? checklist : checklist.filter((x) => !x.done).slice(0, 4);

  return (
    <>
      {plan.kind === 'abroad' && (
        <div className="pt-chip-row">
          <span className="pt-info-chip"><Flag code={c.code} /> {c.name}</span>
          <span className="pt-info-chip">{CURRENCIES[plan.currency].symbol} {plan.currency} · 1 = ฿{fmtRate(plan.currency)}</span>
          <span className="pt-info-chip"><Icon name="clock" size={14} /> {c.utc > 7 ? `เร็วกว่าไทย ${c.utc - 7}` : `ช้ากว่าไทย ${7 - c.utc}`} ชม.</span>
        </div>
      )}

      {checklist.length > 0 && status !== 'past' && (
        <div className="hp-tile pt-checklist">
          <SectionTitle title={`เตรียมตัว ${doneCount}/${checklist.length}`} action={showAllChecklist ? 'ย่อ' : 'ดูทั้งหมด'} onAction={() => setShowAllChecklist((v) => !v)} />
          <Progress value={doneCount / checklist.length} color="var(--tw-brand)" />
          {visibleChecklist.map((x) => (
            <button key={x.id} className={`pt-check${x.done ? ' done' : ''}`} onClick={() => actions.toggleChecklist(plan.id, x.id)}>
              <span className="pt-check-box">{x.done && <Icon name="check" size={14} stroke={3} />}</span>
              {x.text}
            </button>
          ))}
        </div>
      )}

      {plan.kind !== 'idea' && days.length > 1 && <DayChips days={days} value={day} onChange={setDay} plan={plan} />}

      <div className="pt-lines full">
        {stops.map((s, i) => (
          <StopRow key={s.id} full stop={s} planId={plan.id} state={stopState(s, today, nowHM)} checkHere={i === nextCheck} passed={passedStop(stops, i, today)}
            onOpen={() => openSheet('stop', { planId: plan.id, stopId: s.id })}
            drag={{
              rowRef: (el) => { dnd.rows.current[i] = el; },
              style: dnd.style(i),
              dragging: dnd.from === i,
              handle: canDrag && !checkedIn(s) && stops.filter((x) => !checkedIn(x)).length > 1 ? { onPointerDown: (e) => dnd.start(e, i), onPointerMove: dnd.move, onPointerUp: dnd.end, onPointerCancel: dnd.end } : null,
            }} />
        ))}
        {!stops.length && <Empty>ยังไม่มีจุดแวะ</Empty>}
      </div>
      {status !== 'past' && (
        <button className="pt-dashed-btn" onClick={() => openSheet('addStop', { planId: plan.id, date: plan.kind === 'idea' ? null : day })}>
          <Icon name="plus" size={18} /> เพิ่มจุดแวะ
        </button>
      )}
    </>
  );
}

/* ---------- แผนที่ ---------- */
function MapTab({ plan, days }) {
  const [day, setDay] = useState('all');
  const [sel, setSel] = useState(null);
  const stops = useMemo(() => {
    const list = day === 'all' ? plan.stops.slice() : plan.stops.filter((s) => s.date === day);
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || byOrder(a, b));
  }, [plan.stops, day]);
  const points = stops.map((s, i) => ({ id: s.id, lat: s.lat, lng: s.lng, cat: s.cat, label: day === 'all' && s.date ? `${days.indexOf(s.date) + 1}` : i + 1 }));

  return (
    <>
      {days.length > 0 && <DayChips days={days} value={day} onChange={(d) => { setDay(d); setSel(null); }} plan={plan} withAll />}
      <MapView className="pt-map-card" points={points} route={day !== 'all' || days.length <= 1} selectedId={sel} onSelect={setSel} fitKey={`${plan.id}-${day}`} />
      <div className="pt-results">
        {stops.map((s, i) => (
          <div key={s.id} role="button" tabIndex={0} className={`pt-result${sel === s.id ? ' selected' : ''}`} onClick={() => setSel(s.id)}>
            <span className="pt-num">{points[i].label}</span>
            <span className="pt-grow"><span className="pt-strong">{s.name}</span><span className="pt-muted">{s.time ? `${s.time} · ` : ''}{s.area}</span></span>
            <a className="pt-round-btn sm" href={directionsUrl(s)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label="นำทาง"><Icon name="nav" size={16} /></a>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------- รายจ่าย ---------- */
function MoneyTab({ plan }) {
  const { expenses, payments, jars, piggyLog, plans, today, openSheet, actions } = useProto();
  const outing = plan.kind === 'outing'; // a day out spends, it doesn't save up
  const jarOf = !outing && jars.find((j) => j.planId === plan.id);
  const jar = jarOf && { ...jarOf, ...jarStats(jarOf, piggyLog, plans, expenses) };
  const openJar = () => openSheet('piggy', { jarId: jar.id });
  const list = expenses.filter((e) => e.planId === plan.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = list.reduce((s, e) => s + toTHB(e), 0);
  const mine = list.reduce((s, e) => s + myShare(e), 0);
  const byCat = Object.entries(list.reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + toTHB(e) }), {})).sort((a, b) => b[1] - a[1]);
  const pays = payments.filter((x) => x.planId === plan.id);
  const transfers = plan.members.length > 1 ? settleUp(list, plan.members, pays) : [];
  const waiting = (t) => pays.find((x) => x.status === 'sent' && x.from === t.from && x.to === t.to);
  // signed in, only whoever wrote an expense down or paid it may change it (as the rules allow)
  const canEdit = (e) => !e.createdBy || e.createdBy === ME || e.paidBy === ME;
  const groups = list.reduce((m, e) => { (m[e.date] = m[e.date] || []).push(e); return m; }, {});

  return (
    <>
      {/* savings for this trip: the glass piggy, coins split by category */}
      {jar ? (
        <div className="hp-tile pt-jar-card">
          <div className="pt-jar-card-head">
            <span className="pt-grow">
              <span className="pt-muted sm">เงินเก็บ</span>
              <span className="pt-spend-total">{fmtMoney(jar.balance)}<span className="pt-muted"> / {fmtMoney(jar.goal)}</span></span>
            </span>
            <button className="pt-btn sm" onClick={openJar}><Icon name="plus" size={16} stroke={2.2} /> หยอด</button>
          </div>
          <Progress value={jar.goal ? jar.balance / jar.goal : 0} color="var(--tw-brand)" />
          <PiggyStage jar={jarOf} onOpen={openJar} />
        </div>
      ) : !outing && planStatus(plan, today) !== 'past' && (
        <button className="hp-tile pt-jar-tile" onClick={() => openSheet('newJar', { planId: plan.id })}>
          <span className="pt-cat-icon" style={{ width: 40, height: 40, background: '#FDECF4', color: '#DB2777' }}><Icon name="piggy" size={22} /></span>
          <span className="pt-grow"><span className="pt-strong">เริ่มเก็บเงินทริปนี้</span><span className="pt-muted sm">หยอดทีละนิด แบ่งตามหมวดให้เอง</span></span>
          <Icon name="next" size={18} />
        </button>
      )}

      {(!outing || list.length > 0) && (
        <div className="hp-tile pt-budget">
          <div className="pt-budget-row">
            <div>
              <div className="pt-muted sm">ส่วนของฉัน</div>
              <div className="pt-spend-total">{fmtMoney(mine)}</div>
            </div>
            {plan.budget > 0 && <div className="pt-right"><div className="pt-muted sm">งบต่อคน</div><div className="pt-strong">{fmtMoney(plan.budget)}</div></div>}
          </div>
          {plan.budget > 0 && <Progress value={mine / plan.budget} color={mine > plan.budget ? 'var(--tw-danger)' : 'var(--tw-brand)'} />}
          <div className="pt-muted sm">{outing ? 'รวม' : 'ทั้งทริป'} {fmtMoney(total)} · {list.length} รายการ</div>
          {byCat.length > 0 && (
            <>
              <div className="pt-stack">{byCat.map(([k, v]) => <span key={k} style={{ flex: v, background: EXPENSE_CATS[k].color }} />)}</div>
              <div className="pt-legend">{byCat.map(([k, v]) => <span key={k}><i style={{ background: EXPENSE_CATS[k].color }} />{EXPENSE_CATS[k].label} {Math.round((v / total) * 100)}%</span>)}</div>
            </>
          )}
        </div>
      )}


      {/* who still owes whom: the one who owes pays (QR, slip), the one owed confirms it or says cash came */}
      {transfers.length > 0 && (
        <div className="hp-tile pt-settle">
          <SectionTitle title="ใครต้องโอนใคร" />
          {transfers.map((t) => {
            const sent = waiting(t);
            return (
              <div key={`${t.from}>${t.to}`} className="pt-settle-row">
                <Avatar id={t.from} size={32} />
                <Icon name="next" size={14} />
                <Avatar id={t.to} size={32} />
                <span className="pt-grow"><span className="pt-strong">{PEOPLE[t.from].name} → {PEOPLE[t.to].name}</span><span className="pt-muted sm">{fmtMoney(t.amount)}</span></span>
                {sent ? (
                  t.to === ME
                    ? <button className="pt-pill-btn sm" onClick={() => openSheet('payment', { payId: sent.id })}>{sent.slip ? 'ดูสลิป' : 'ยืนยันรับเงิน'}</button>
                    : <span className="pt-badge">รอยืนยัน</span>
                ) : t.from === ME ? (
                  <button className="pt-pill-btn sm" onClick={() => openSheet('settle', { planId: plan.id, to: t.to, amount: t.amount })}><Icon name="qr" size={14} /> โอนคืน</button>
                ) : t.to === ME && (
                  <button className="pt-pill-btn sm light" onClick={() => actions.receivePayment(plan.id, { from: t.from, amount: t.amount })}>ได้เงินแล้ว</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {pays.length > 0 && (
        <div className="hp-tile pt-settle">
          <SectionTitle title="การโอนคืน" />
          {pays.map((x) => (
            <button key={x.id} className="pt-settle-row" disabled={x.from !== ME && x.to !== ME} onClick={() => openSheet('payment', { payId: x.id })}>
              <Avatar id={x.from} size={32} />
              <Icon name="next" size={14} />
              <Avatar id={x.to} size={32} />
              <span className="pt-grow"><span className="pt-strong">{fmtMoney(x.amount)}</span><span className="pt-muted sm">{thaiShort(x.date)}{x.slip ? ' · มีสลิป' : ''}</span></span>
              <span className={`pt-badge${x.status === 'received' ? ' ok' : ''}`}>{x.status === 'received' ? 'ได้รับแล้ว' : 'รอยืนยัน'}</span>
            </button>
          ))}
        </div>
      )}

      <button className="pt-dashed-btn" onClick={() => openSheet('expense', { planId: plan.id })}><Icon name="plus" size={18} /> จดรายจ่าย</button>

      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="pt-exp-group">
          <div className="pt-muted sm">{date ? `${thaiDay(date)} ${thaiShort(date)}` : 'ไม่ระบุวัน'}</div>
          {items.map((e) => (
            <button key={e.id} className="pt-exp" disabled={!canEdit(e)} onClick={() => openSheet('expense', { expenseId: e.id })}>
              <span className="pt-exp-dot" style={{ background: EXPENSE_CATS[e.cat].color }} />
              <span className="pt-grow">
                <span className="pt-strong">{e.title}</span>
                <span className="pt-muted sm">{PEOPLE[e.paidBy].name} จ่าย{e.split.length > 1 ? ` · หาร ${e.split.length} คน` : ''}</span>
              </span>
              <span className="pt-right">
                <span className="pt-strong">{fmtMoney(e.amount, e.currency)}</span>
                {e.currency !== 'THB' && <span className="pt-muted sm">≈ {fmtMoney(toTHB(e))}</span>}
              </span>
            </button>
          ))}
        </div>
      ))}
    </>
  );
}

/* ---------- ความทรงจำ ---------- */
function MemoriesTab({ plan, status }) {
  const { memories, openSheet, actions } = useProto();
  const navigate = useNavigate();
  const list = memories.filter((m) => m.planId === plan.id).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return (
    <>
      {status === 'past' && list.length > 0 && (
        <button className="pt-recap-banner" onClick={() => navigate(`/proto/plan/${plan.id}/recap`)}>
          <Icon name="sparkle" size={22} />
          <span className="pt-grow"><span className="pt-strong">สรุปทริป</span></span>
          <Icon name="next" size={18} />
        </button>
      )}
      <button className="pt-dashed-btn" onClick={() => openSheet('memory', { planId: plan.id })}><Icon name="camera" size={18} /> เพิ่มรูป / โน้ต</button>
      <div className="pt-mem-grid">
        {list.map((m) => {
          const stop = plan.stops.find((s) => s.id === m.stopId);
          return (
            <div key={m.id} className={`pt-mem${m.photos?.length ? '' : ' text'}`}>
              {m.by === ME && <button className="pt-mem-del" aria-label="ลบ" onClick={() => actions.removeMemory(m.id)}><Icon name="close" size={12} stroke={2.6} /></button>}
              {m.photos?.length > 0 && <div className="pt-mem-photo" style={{ backgroundImage: `url(${m.photos[0]})` }}>{m.photos.length > 1 && <span className="pt-badge glass right">+{m.photos.length - 1}</span>}</div>}
              <div className="pt-mem-body">
                <div className="pt-mem-text"><Icon name={m.mood} size={16} className="pt-inline-icon" /> {m.text}</div>
                <div className="pt-mem-meta"><Avatar id={m.by} size={18} /><span>{thaiShort(m.date)}{stop ? ` · ${stop.name}` : ''}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {!list.length && plan.kind !== 'outing' && <Empty>ยังไม่มีความทรงจำ</Empty>}
    </>
  );
}

export default function PlanDetailPage() {
  const { planId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { plans, groups, today, openSheet, loading } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const group = plan && groups.find((g) => g.id === plan.groupId);
  const days = plan ? dayList(plan.startDate, plan.endDate) : [];
  const status = plan ? planStatus(plan, today) : 'idea';
  const [picked, setDay] = useState(() => (days.includes(today) ? today : days[0]));
  const day = days.includes(picked) ? picked : days.includes(today) ? today : days[0]; // the dates may have moved
  const tab = params.get('tab') || 'plan';

  // opened from a link or a reload: wait for the trips to load; gone (a friend deleted it): say so
  if (!plan) {
    return (
      <div className="pt-page">
        <div className="pt-detail-head">
          <button className="pt-round-btn" aria-label="ย้อนกลับ" onClick={() => navigate('/proto/plans', { replace: true })}><Icon name="back" size={20} /></button>
        </div>
        {!loading && <Empty>ไม่พบแผนนี้ อาจถูกลบไปแล้ว</Empty>}
      </div>
    );
  }
  const c = countryOf(plan.country);
  const mapStops = plan.stops.filter((st) => st.lat != null && !st.skip).sort(byOrder);

  return (
    <div className="pt-page">
      <div className="pt-detail-head">
        <button className="pt-round-btn" aria-label="ย้อนกลับ" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/proto/plans'))}><Icon name="back" size={20} /></button>
        <span className="pt-detail-title">{KINDS[plan.kind].label}</span>
        <button className="pt-round-btn" aria-label="ตัวเลือก" onClick={() => openSheet('planMenu', { planId: plan.id })}><Icon name="more" size={20} /></button>
      </div>
      <div className="pt-scroll">
        {/* an outing's cover is its map: where it goes, in order */}
        {plan.kind === 'outing' && mapStops.length > 0 ? (
          <div className="pt-hero-cover pt-hero-map">
            <MapView points={mapStops.map((st, i) => ({ id: st.id, lat: st.lat, lng: st.lng, cat: st.cat, label: i + 1 }))}
              route={mapStops.length > 1} interactive={false} padding={40} fitKey={`${plan.id}-${mapStops.map((st) => st.id).join()}`} />
            {status === 'ongoing' && <span className="pt-badge live right">กำลังเที่ยว</span>}
            {status === 'upcoming' && <span className="pt-badge dark right">อีก {diffDays(today, plan.startDate)} วัน</span>}
          </div>
        ) : (
          <Cover cover={plan.cover} className={`pt-hero-cover${plan.kind === 'outing' ? ' short' : ''}`}>
            <span className="pt-badge glass"><Flag code={c.code} /> {c.name}</span>
            {status === 'ongoing' && <span className="pt-badge live right">กำลังเที่ยว</span>}
            {status === 'upcoming' && <span className="pt-badge dark right">อีก {diffDays(today, plan.startDate)} วัน</span>}
          </Cover>
        )}
        <div className="pt-hero-text">
          <div className="pt-title">{plan.name}</div>
          <div className="pt-muted">{thaiRange(plan.startDate, plan.endDate)}{days.length > 1 ? ` · ${days.length} วัน` : ''} · {plan.stops.length} จุดแวะ</div>
          <div className="pt-hero-members">
            {group && <span className="pt-group-chip" style={{ background: group.color }}><Icon name={group.icon} size={14} /> {group.name}</span>}
            <Avatars ids={plan.members} size={30} />
            <span className="pt-muted sm">{plan.members.map((id) => (id === ME ? 'ฉัน' : PEOPLE[id].name)).join(', ')}</span>
          </div>
        </div>
        {plan.kind === 'outing' ? (
          <>
            <PlanTab plan={plan} day={day} setDay={setDay} days={days} status={status} />
            <SectionTitle title="รายจ่าย" />
            <MoneyTab plan={plan} />
            <SectionTitle title="ความทรงจำ" />
            <MemoriesTab plan={plan} status={status} />
          </>
        ) : (
          <>
            <Seg value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} items={TABS} />
            {tab === 'plan' && <PlanTab plan={plan} day={day} setDay={setDay} days={days} status={status} />}
            {tab === 'map' && <MapTab plan={plan} days={days} />}
            {tab === 'money' && <MoneyTab plan={plan} />}
            {tab === 'memories' && <MemoriesTab plan={plan} status={status} />}
          </>
        )}
      </div>
    </div>
  );
}
