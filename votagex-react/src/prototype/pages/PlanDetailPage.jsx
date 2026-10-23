import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import PiggyStage from '../PiggyStage';
import MapView from '../MapView';
import { fmtRate } from '../rates';
import { Avatar, Avatars, CatIcon, Cover, Seg, Progress, SectionTitle, Empty } from '../ui';
import {
  ME, PEOPLE, KINDS, EXPENSE_CATS, CURRENCIES, countryOf, thaiRange, thaiShort, thaiDay, dayList, diffDays,
  planStatus, byTime, localHM, stopState, fmtMoney, toTHB, myShare, settleUp, directionsUrl, jarStats,
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
function PlanTab({ plan, day, setDay, days, status }) {
  const { actions, openSheet, today } = useProto();
  const [showAllChecklist, setShowAllChecklist] = useState(false);
  const c = countryOf(plan.country);
  const nowHM = localHM(c.utc);
  const stops = (plan.kind === 'idea' ? plan.stops : plan.stops.filter((s) => s.date === day)).slice().sort(byTime);
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

      {plan.kind !== 'idea' && <DayChips days={days} value={day} onChange={setDay} plan={plan} />}

      <div className="pt-timeline">
        {stops.map((s, i) => {
          const st = stopState(s, today, nowHM);
          const whoIn = Object.keys(s.checkIns || {});
          const canCheck = s.date === today && (st === 'pending' || st === 'due');
          return (
            <div key={s.id} className={`pt-stop ${st}`}>
              <div className="pt-stop-time">{s.time || '—'}</div>
              <div className="pt-stop-rail"><span className="pt-stop-dot">{i + 1}</span></div>
              <div className="pt-stop-card">
                <CatIcon cat={s.cat} size={40} />
                <div className="pt-grow">
                  <div className="pt-strong">{s.name}</div>
                  <div className="pt-muted sm">{s.area}</div>
                  {s.note && <div className="pt-note">{s.note}</div>}
                  {whoIn.length > 0 && (
                    <div className="pt-stop-who"><Avatars ids={whoIn} size={18} /> <span>{st === 'late-done' ? 'มาสาย' : 'เช็คอินแล้ว'} {s.checkIns[whoIn[0]].at}</span></div>
                  )}
                </div>
                <div className="pt-stop-actions">
                  {canCheck ? (
                    <button className="hp-step-checkin" onClick={() => actions.toggleCheckIn(plan.id, s.id, st === 'due')}>เช็คอิน</button>
                  ) : (
                    <a className="pt-round-btn sm" href={directionsUrl(s)} target="_blank" rel="noreferrer" aria-label="นำทาง"><Icon name="nav" size={16} /></a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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
    return list.sort((a, b) => (a.date || '').localeCompare(b.date || '') || byTime(a, b));
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
  const { expenses, jars, piggyLog, plans, today, openSheet } = useProto();
  const jarOf = jars.find((j) => j.planId === plan.id);
  const jar = jarOf && { ...jarOf, ...jarStats(jarOf, piggyLog, plans, expenses) };
  const openJar = () => openSheet('piggy', { jarId: jar.id });
  const list = expenses.filter((e) => e.planId === plan.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const total = list.reduce((s, e) => s + toTHB(e), 0);
  const mine = list.reduce((s, e) => s + myShare(e), 0);
  const byCat = Object.entries(list.reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + toTHB(e) }), {})).sort((a, b) => b[1] - a[1]);
  const transfers = plan.members.length > 1 ? settleUp(list, plan.members) : [];
  const settled = new Set(plan.settled || []);
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
      ) : planStatus(plan, today) !== 'past' && (
        <button className="hp-tile pt-jar-tile" onClick={() => openSheet('newJar', { planId: plan.id })}>
          <span className="pt-cat-icon" style={{ width: 40, height: 40, background: '#FDECF4', color: '#DB2777' }}><Icon name="piggy" size={22} /></span>
          <span className="pt-grow"><span className="pt-strong">เริ่มเก็บเงินทริปนี้</span><span className="pt-muted sm">หยอดทีละนิด แบ่งตามหมวดให้เอง</span></span>
          <Icon name="next" size={18} />
        </button>
      )}

      <div className="hp-tile pt-budget">
        <div className="pt-budget-row">
          <div>
            <div className="pt-muted sm">ส่วนของฉัน</div>
            <div className="pt-spend-total">{fmtMoney(mine)}</div>
          </div>
          {plan.budget > 0 && <div className="pt-right"><div className="pt-muted sm">งบต่อคน</div><div className="pt-strong">{fmtMoney(plan.budget)}</div></div>}
        </div>
        {plan.budget > 0 && <Progress value={mine / plan.budget} color={mine > plan.budget ? 'var(--tw-danger)' : 'var(--tw-brand)'} />}
        <div className="pt-muted sm">ทั้งทริป {fmtMoney(total)} · {list.length} รายการ</div>
        {byCat.length > 0 && (
          <>
            <div className="pt-stack">{byCat.map(([k, v]) => <span key={k} style={{ flex: v, background: EXPENSE_CATS[k].color }} />)}</div>
            <div className="pt-legend">{byCat.map(([k, v]) => <span key={k}><i style={{ background: EXPENSE_CATS[k].color }} />{EXPENSE_CATS[k].label} {Math.round((v / total) * 100)}%</span>)}</div>
          </>
        )}
      </div>


      {transfers.length > 0 && (
        <div className="hp-tile pt-settle">
          <SectionTitle title="ใครต้องโอนใคร" />
          {transfers.map((t) => {
            const key = `${t.from}>${t.to}`;
            const isDone = settled.has(key);
            return (
              <div key={key} className={`pt-settle-row${isDone ? ' done' : ''}`}>
                <Avatar id={t.from} size={32} />
                <Icon name="next" size={14} />
                <Avatar id={t.to} size={32} />
                <span className="pt-grow"><span className="pt-strong">{PEOPLE[t.from].name} → {PEOPLE[t.to].name}</span><span className="pt-muted sm">{fmtMoney(t.amount)}</span></span>
                {isDone ? <span className="pt-badge ok">โอนแล้ว</span> : (
                  <button className="pt-pill-btn sm" onClick={() => openSheet('settle', { planId: plan.id, ...t })}><Icon name="qr" size={14} /> QR พร้อมเพย์</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button className="pt-dashed-btn" onClick={() => openSheet('expense', { planId: plan.id })}><Icon name="plus" size={18} /> จดรายจ่าย</button>

      {Object.entries(groups).map(([date, items]) => (
        <div key={date} className="pt-exp-group">
          <div className="pt-muted sm">{date ? `${thaiDay(date)} ${thaiShort(date)}` : 'ไม่ระบุวัน'}</div>
          {items.map((e) => (
            <div key={e.id} className="pt-exp">
              <span className="pt-exp-dot" style={{ background: EXPENSE_CATS[e.cat].color }} />
              <span className="pt-grow">
                <span className="pt-strong">{e.title}</span>
                <span className="pt-muted sm">{PEOPLE[e.paidBy].name} จ่าย{e.split.length > 1 ? ` · หาร ${e.split.length} คน` : ''}</span>
              </span>
              <span className="pt-right">
                <span className="pt-strong">{fmtMoney(e.amount, e.currency)}</span>
                {e.currency !== 'THB' && <span className="pt-muted sm">≈ {fmtMoney(toTHB(e))}</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ---------- ความทรงจำ ---------- */
function MemoriesTab({ plan, status }) {
  const { memories, openSheet } = useProto();
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
              {m.photos?.length > 0 && <div className="pt-mem-photo" style={{ backgroundImage: `url(${m.photos[0]})` }}>{m.photos.length > 1 && <span className="pt-badge glass right">+{m.photos.length - 1}</span>}</div>}
              <div className="pt-mem-body">
                <div className="pt-mem-text"><Icon name={m.mood} size={16} className="pt-inline-icon" /> {m.text}</div>
                <div className="pt-mem-meta"><Avatar id={m.by} size={18} /><span>{thaiShort(m.date)}{stop ? ` · ${stop.name}` : ''}</span></div>
              </div>
            </div>
          );
        })}
      </div>
      {!list.length && <Empty>ยังไม่มีความทรงจำ</Empty>}
    </>
  );
}

export default function PlanDetailPage() {
  const { planId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { plans, today, showToast } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const days = plan ? dayList(plan.startDate, plan.endDate) : [];
  const status = plan ? planStatus(plan, today) : 'idea';
  const [day, setDay] = useState(() => (days.includes(today) ? today : days[0]));
  const tab = params.get('tab') || 'plan';

  if (!plan) return <Navigate to="/proto/plans" replace />;
  const c = countryOf(plan.country);

  return (
    <div className="pt-page">
      <div className="pt-detail-head">
        <button className="pt-round-btn" aria-label="ย้อนกลับ" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/proto/plans'))}><Icon name="back" size={20} /></button>
        <span className="pt-detail-title">{KINDS[plan.kind].label}</span>
        <button className="pt-round-btn" aria-label="ชวนเพื่อน" onClick={() => { navigator.clipboard?.writeText(`https://votagex.app/j/${plan.id}`).catch(() => {}); showToast('คัดลอกลิงก์ชวนเพื่อนแล้ว'); }}><Icon name="share" size={18} /></button>
      </div>
      <div className="pt-scroll">
        <Cover cover={plan.cover} className="pt-hero-cover">
          <span className="pt-badge glass"><Flag code={c.code} /> {c.name}</span>
          {status === 'ongoing' && <span className="pt-badge live right">กำลังเที่ยว</span>}
          {status === 'upcoming' && <span className="pt-badge dark right">อีก {diffDays(today, plan.startDate)} วัน</span>}
        </Cover>
        <div className="pt-hero-text">
          <div className="pt-title">{plan.name}</div>
          <div className="pt-muted">{thaiRange(plan.startDate, plan.endDate)}{days.length > 1 ? ` · ${days.length} วัน` : ''} · {plan.stops.length} จุดแวะ</div>
          <div className="pt-hero-members">
            <Avatars ids={plan.members} size={30} />
            <span className="pt-muted sm">{plan.members.map((id) => (id === ME ? 'ฉัน' : PEOPLE[id].name)).join(', ')}</span>
          </div>
        </div>
        <Seg value={tab} onChange={(v) => setParams({ tab: v }, { replace: true })} items={TABS} />
        {tab === 'plan' && <PlanTab plan={plan} day={day} setDay={setDay} days={days} status={status} />}
        {tab === 'map' && <MapTab plan={plan} days={days} />}
        {tab === 'money' && <MoneyTab plan={plan} />}
        {tab === 'memories' && <MemoriesTab plan={plan} status={status} />}
      </div>
    </div>
  );
}
