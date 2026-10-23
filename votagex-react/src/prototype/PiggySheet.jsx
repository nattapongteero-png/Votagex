import { useState } from 'react';
import { useProto } from './useProto';
import Icon from './icons';
import { Sheet, Chip, Progress, SectionTitle } from './ui';
import { JAR_ICONS, EXPENSE_CATS, jarStats, splitByShare, jarCats, fmtMoney, thaiShort, diffDays, planStatus } from './data';

/* ---------- One piggy (one topic), its money split into spending categories ---------- */
export function PiggySheet({ jarId, onClose }) {
  const { jars, piggyLog, plans, expenses, today, actions, showToast } = useProto();
  const jar = jars.find((j) => j.id === jarId) || jars[0];
  const stats = jarStats(jar, piggyLog, plans, expenses);
  const cats = jarCats(jar);
  const [mode, setMode] = useState('in');
  const [amount, setAmount] = useState('');
  const [target, setTarget] = useState('split');
  const [note, setNote] = useState('');
  const [editShares, setEditShares] = useState(null); // { cat: % } while editing
  const n = Math.round(parseFloat(amount) || 0);

  const useCat = target === 'split' ? cats[0]?.id : target;
  const useRow = stats.rows.find((r) => r.id === useCat);
  const tooMuch = mode === 'use' && useRow && n > useRow.balance;
  const preview = mode === 'in' && target === 'split' && n > 0 ? splitByShare(n, cats) : null;
  const plan = plans.find((p) => p.id === jar.planId);
  const days = plan?.startDate && planStatus(plan, today) === 'upcoming' ? diffDays(today, plan.startDate) : null;
  const left = Math.max(0, jar.goal - stats.balance);

  const submit = (close) => {
    if (!n || tooMuch) return;
    actions.addPiggy({ jarId: jar.id, type: mode, amount: n, target: mode === 'use' ? useCat : target, note: mode === 'use' ? note : '' });
    showToast(mode === 'in' ? `หยอดแล้ว ${fmtMoney(n)}` : `ใช้ ${fmtMoney(n)} จาก${EXPENSE_CATS[useCat].label}`);
    close();
  };

  const saveShares = () => {
    const total = Object.values(editShares).reduce((s, v) => s + v, 0) || 1;
    actions.setShares(jar.id, Object.fromEntries(Object.entries(editShares).map(([k, v]) => [k, Math.round((v / total) * 100)])));
    setEditShares(null);
  };
  const step = (k, d) => setEditShares((s) => ({ ...s, [k]: Math.max(0, Math.min(100, (s[k] || 0) + d)) }));

  const log = piggyLog.filter((e) => e.jar === jar.id).slice(0, 8);

  return (
    <Sheet title={<span className="pt-title-icon"><Icon name={jar.icon || 'piggy'} size={22} />{jar.name}</span>} onClose={onClose} tall
      footer={(close) => (
        <button className="pt-btn block" disabled={!n || tooMuch} onClick={() => submit(close)}>
          {mode === 'in' ? 'หยอด' : 'ใช้'} {n ? fmtMoney(n) : ''}
        </button>
      )}>
      <div className="pt-piggy-hero">
        <div className="pt-spend-total lg">{fmtMoney(stats.balance)}<span className="pt-muted"> / {fmtMoney(jar.goal)}</span></div>
        <div className="pt-muted sm">
          เก็บแล้ว {fmtMoney(stats.saved)} · ใช้ไป {fmtMoney(stats.used)}
          {days != null && left > 0 ? ` · อีก ${days} วัน วันละ ${fmtMoney(left / Math.max(1, days))}` : ''}
        </div>
        <div className="pt-stack tall">{stats.rows.filter((r) => r.balance > 0).map((r) => <span key={r.id} style={{ flex: r.balance, background: r.color }} />)}</div>
      </div>

      <SectionTitle title="แบ่งตามหมวด" action={editShares ? 'เสร็จ' : 'ปรับ'}
        onAction={() => (editShares ? saveShares() : setEditShares(Object.fromEntries(cats.map((c) => [c.id, c.share]))))} />
      <div className="pt-jars">
        {stats.rows.map((r) => (
          <div key={r.id} className="pt-jar">
            <span className="pt-jar-dot" style={{ background: r.color }} />
            <div className="pt-grow">
              <div className="pt-jar-top">
                <span className="pt-strong ellipsis">{r.label}</span>
                <span className="pt-strong">{fmtMoney(r.balance)}<span className="pt-muted sm"> / {fmtMoney(r.goal)}</span></span>
              </div>
              <Progress value={r.goal ? r.balance / r.goal : 0} color={r.color} />
              {r.used > 0 && <div className="pt-muted sm">ใช้ไป {fmtMoney(r.used)}</div>}
            </div>
            {editShares ? (
              <div className="pt-stepper">
                <button aria-label="ลด" onClick={() => step(r.id, -5)}>−</button>
                <span>{editShares[r.id]}%</span>
                <button aria-label="เพิ่ม" onClick={() => step(r.id, 5)}>+</button>
              </div>
            ) : (
              <span className="pt-share">{r.share}%</span>
            )}
          </div>
        ))}
      </div>

      <div className="pt-seg-wrap">
        <div className="pt-seg">
          <button className={`pt-seg-btn${mode === 'in' ? ' active' : ''}`} onClick={() => { setMode('in'); setTarget('split'); }}>หยอด</button>
          <button className={`pt-seg-btn${mode === 'use' ? ' active' : ''}`} onClick={() => { setMode('use'); setTarget(cats[0]?.id); }}>ใช้เงิน</button>
        </div>
      </div>
      <div className="pt-amount">
        <span className="pt-amount-cur">฿</span>
        <input inputMode="numeric" placeholder="0" value={amount} style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} />
      </div>
      <div className="pt-chip-row center">
        {[100, 500, 1000].map((v) => <Chip key={v} onClick={() => setAmount(String(n + v))}>+{v.toLocaleString('en-US')}</Chip>)}
      </div>
      <div className="pt-chip-row wrap">
        {mode === 'in' && <Chip active={target === 'split'} onClick={() => setTarget('split')}>แบ่งตามสัดส่วน</Chip>}
        {cats.map((c) => (
          <Chip key={c.id} active={useCat === c.id && (mode === 'use' || target !== 'split')} color={EXPENSE_CATS[c.id].color} onClick={() => setTarget(c.id)}>
            {EXPENSE_CATS[c.id].label}
          </Chip>
        ))}
      </div>
      {preview && (
        <div className="pt-split-preview">
          {cats.filter((c) => preview[c.id]).map((c) => <span key={c.id}><i style={{ background: EXPENSE_CATS[c.id].color }} />{EXPENSE_CATS[c.id].label} {fmtMoney(preview[c.id])}</span>)}
        </div>
      )}
      {mode === 'use' && <input className="pt-input" placeholder="ใช้กับอะไร" value={note} onChange={(e) => setNote(e.target.value)} />}
      {tooMuch && <div className="pt-clip-status fail">เงินในหมวดนี้ไม่พอ</div>}

      {log.length > 0 && <SectionTitle title="ล่าสุด" />}
      <div className="pt-piggy-log">
        {log.map((e) => (
          <div key={e.id} className="pt-log-row">
            <span className="pt-log-dots">{Object.keys(e.alloc).map((k) => <i key={k} style={{ background: EXPENSE_CATS[k]?.color }} />)}</span>
            <span className="pt-grow">
              <span className="pt-strong">{e.type === 'in' ? (Object.keys(e.alloc).length > 1 ? 'หยอด · แบ่งตามหมวด' : `หยอด · ${EXPENSE_CATS[Object.keys(e.alloc)[0]]?.label}`) : `ใช้ · ${e.note || EXPENSE_CATS[Object.keys(e.alloc)[0]]?.label}`}</span>
              <span className="pt-muted sm">{thaiShort(e.date)}</span>
            </span>
            <span className={`pt-strong ${e.type === 'in' ? 'pos' : 'neg'}`}>{e.type === 'in' ? '+' : '−'}{fmtMoney(e.amount)}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------- New piggy: one topic, usually a trip ---------- */
export function NewJarSheet({ planId: forPlan = null, onClose, onCreated }) {
  const { plans, jars, today, actions, openSheet, showToast } = useProto();
  const options = plans.filter((p) => planStatus(p, today) !== 'past' && p.kind !== 'outing' && !jars.some((j) => j.planId === p.id));
  const [planId, setPlanId] = useState(forPlan);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState(() => String(plans.find((p) => p.id === forPlan)?.budget || ''));
  const [icon, setIcon] = useState('piggy');
  const plan = plans.find((p) => p.id === planId);
  const g = Math.round(parseFloat(goal) || 0);
  const finalName = name.trim() || plan?.name || '';

  const create = (close) => {
    if (!finalName || !g) return;
    const id = actions.addJar({ name: finalName, goal: g, planId, icon, kind: plan?.kind === 'abroad' ? 'abroad' : 'trip' });
    showToast(`สร้างกระปุก “${finalName}” แล้ว`);
    onCreated?.(id);
    close();
    setTimeout(() => openSheet('piggy', { jarId: id }), 340);
  };

  return (
    <Sheet title="กระปุกใหม่" onClose={onClose}
      footer={(close) => <button className="pt-btn block" disabled={!finalName || !g} onClick={() => create(close)}>สร้าง</button>}>
      {options.length > 0 && (
        <>
          <div className="pt-label">เก็บไว้ไปทริป</div>
          <div className="pt-chip-row wrap">
            {options.map((p) => (
              <Chip key={p.id} active={planId === p.id} onClick={() => { setPlanId(planId === p.id ? null : p.id); if (!goal && p.budget) setGoal(String(p.budget)); }}>{p.name}</Chip>
            ))}
          </div>
        </>
      )}
      <div className="pt-chip-row">
        {JAR_ICONS.map((k) => <Chip key={k} active={icon === k} onClick={() => setIcon(k)}><Icon name={k} size={18} /></Chip>)}
      </div>
      <input className="pt-input" placeholder={plan?.name || 'ชื่อกระปุก เช่น เที่ยวปีใหม่'} value={name} onChange={(e) => setName(e.target.value)} />
      <div className="pt-label">เป้าหมาย</div>
      <div className="pt-amount">
        <span className="pt-amount-cur">฿</span>
        <input inputMode="numeric" placeholder="0" value={goal} style={{ width: `${Math.max(1, goal.length) + 0.6}ch` }} onChange={(e) => setGoal(e.target.value.replace(/\D/g, ''))} />
      </div>
    </Sheet>
  );
}
