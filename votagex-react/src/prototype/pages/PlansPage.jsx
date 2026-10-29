import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import { Avatars, Cover, Seg, Empty } from '../ui';
import { KINDS, countryOf, thaiRange, planStatus, diffDays, fmtMoney, toTHB } from '../data';
import { StampBook, StampStrip } from '../StampBook';

export function PlanCard({ plan }) {
  const { expenses, memories, today } = useProto();
  const navigate = useNavigate();
  const status = planStatus(plan, today);
  // a trip of an archived group carries its own money and memories
  const spent = (plan.archived ? plan.expenses || [] : expenses.filter((e) => e.planId === plan.id)).reduce((s, e) => s + toTHB(e), 0);
  const memCount = plan.archived ? plan.memories.length : memories.filter((m) => m.planId === plan.id).length;
  const c = countryOf(plan.country);
  const meta = [
    thaiRange(plan.startDate, plan.endDate),
    `${plan.stops.length} จุดแวะ`,
    spent ? fmtMoney(spent) : null,
  ].filter(Boolean).join(' · ');

  // outings are light: one compact row
  if (plan.kind === 'outing') {
    return (
      <button className="pt-plan-row" onClick={() => navigate(`/proto/plan/${plan.id}`)}>
        <Cover cover={plan.cover} className="pt-plan-thumb" />
        <span className="pt-grow">
          <span className="pt-strong ellipsis">{plan.name}</span>
          <span className="pt-muted sm">{meta}</span>
        </span>
        {status === 'ongoing' && <span className="pt-badge live">วันนี้</span>}
        {memCount > 0 && <span className="pt-badge"><Icon name="camera" size={12} /> {memCount}</span>}
        <Icon name="next" size={18} className="pt-muted" />
      </button>
    );
  }

  return (
    <button className={`pt-plan-card${plan.kind === 'idea' ? ' idea' : ''}`} onClick={() => navigate(`/proto/plan/${plan.id}`)}>
      <Cover cover={plan.cover} className="pt-plan-cover">
        <span className="pt-badge glass"><Flag code={c.code} /> {KINDS[plan.kind].label}</span>
        {status === 'ongoing' && <span className="pt-badge live right">กำลังเที่ยว</span>}
        {status === 'upcoming' && <span className="pt-badge dark right">อีก {diffDays(today, plan.startDate)} วัน</span>}
        {status === 'past' && memCount > 0 && <span className="pt-badge glass right"><Icon name="camera" size={12} /> {memCount} ความทรงจำ</span>}
      </Cover>
      <span className="pt-plan-body">
        <span className="pt-plan-name">{plan.name}</span>
        <span className="pt-muted sm">{meta}</span>
        <span className="pt-plan-foot">
          <Avatars ids={plan.members} size={24} />
          {plan.kind === 'idea' && <span className="pt-muted sm">{plan.note || 'ยังไม่กำหนดวัน'}</span>}
          {status === 'past' && <span className="pt-link sm">ดูสรุปทริป →</span>}
        </span>
      </span>
    </button>
  );
}

export default function PlansPage() {
  const { plans, archivedPlans = [], archivedGroups = [], openSheet, today } = useProto();
  const [tab, setTab] = useState('next');
  const [book, setBook] = useState(false); // the stamp book, opened from the top of past trips
  const withStatus = plans.map((p) => ({ p, s: planStatus(p, today) }));
  const next = withStatus.filter((x) => x.s === 'ongoing' || x.s === 'upcoming').sort((a, b) => a.p.startDate.localeCompare(b.p.startDate)).map((x) => x.p);
  const past = withStatus.filter((x) => x.s === 'past').sort((a, b) => b.p.startDate.localeCompare(a.p.startDate)).map((x) => x.p);
  const ideas = withStatus.filter((x) => x.s === 'idea').map((x) => x.p);
  const list = { next, past, ideas, archived: [] }[tab];
  // trips of groups I archived, by group, newest first
  const archived = archivedGroups.map((g) => ({ g, trips: archivedPlans.filter((p) => p.groupId === g.id).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || '')) }))
    .filter((x) => x.trips.length);

  return (
    <div className="pt-page">
      <div className="pt-header">
        <div className="pt-title">แผน</div>
        <button className="pt-pill-btn" onClick={() => openSheet('createPlan')}><Icon name="plus" size={16} stroke={2.4} /> แผนใหม่</button>
      </div>
      <div className="pt-pad">
        <Seg value={tab} onChange={setTab} items={[
          { value: 'next', label: 'กำลังจะไป', count: next.length },
          { value: 'past', label: 'ผ่านมาแล้ว', count: past.length },
          { value: 'ideas', label: 'ไอเดีย', count: ideas.length },
          ...(archived.length ? [{ value: 'archived', label: 'เก็บแล้ว', count: archivedPlans.length }] : []),
        ]} />
      </div>
      <div className="pt-scroll">
        {tab === 'past' && <StampStrip onOpen={() => setBook(true)} />}
        {list.map((p) => <PlanCard key={p.id} plan={p} />)}
        {tab === 'archived' && archived.map(({ g, trips }) => (
          <div key={g.id} className="pt-archived-group">
            <span className="pt-group-chip" style={{ background: g.color }}><Icon name={g.icon} size={14} /> {g.name}</span>
            {trips.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        ))}
        {tab !== 'archived' && !list.length && <Empty>{tab === 'ideas' ? 'ยังไม่มีไอเดีย' : 'ยังไม่มีแผน'}</Empty>}
        {tab === 'ideas' && (
          <button className="pt-dashed-btn" onClick={() => openSheet('createPlan', { type: 'trip', undated: true })}><Icon name="plus" size={18} /> ไอเดียใหม่</button>
        )}
      </div>
      {book && <StampBook onClose={() => setBook(false)} />}
    </div>
  );
}
