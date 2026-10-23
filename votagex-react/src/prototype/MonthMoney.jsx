import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from './useProto';
import { Sheet, Progress, SectionTitle } from './ui';
import Icon from './icons';
import { PiggyView } from './PiggyStage';
import { EXPENSE_CATS, SPENT_COLOR, fmtMoney, monthMoney, thaiShort } from './data';

// Money set aside each month for going out (settings.monthBudget). The pig holds what's left, in gold coins;
// beside it, stacks of what went where, and a grey one for what friends still owe me.
const LEFT_COLOR = '#E8B12A';

function useMonth() {
  const { plans, expenses, payments, settings, today } = useProto();
  const budget = settings.monthBudget || 0;
  const m = monthMoney(today.slice(0, 7), plans, expenses, payments);
  return { ...m, budget, left: budget - m.spent };
}

// On home: the piggy for this month, or a nudge to set the budget
export function MonthPiggyTile() {
  const { openSheet, today } = useProto();
  const { budget, spent, left, owed, owe, byCat } = useMonth();
  const open = () => openSheet('month');
  if (!budget) {
    return (
      <button className="hp-tile pt-jar-tile" onClick={open}>
        <span className="pt-cat-icon" style={{ width: 40, height: 40, background: '#FEF6DC', color: '#A16207' }}><Icon name="piggy" size={22} /></span>
        <span className="pt-grow"><span className="pt-strong">ตั้งงบเที่ยวต่อเดือน</span><span className="pt-muted sm">ใช้ไปแล้ว {fmtMoney(spent)}</span></span>
        <Icon name="next" size={18} />
      </button>
    );
  }
  // a full pig is about 60 coins, whatever the budget
  const unit = Math.max(10, Math.round(budget / 60));
  const coins = Array(Math.max(0, Math.floor(left / unit))).fill(LEFT_COLOR);
  const stack = (value) => Math.max(1, Math.min(7, Math.round((value / budget) * 12)));
  const rows = [
    ...Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, owed > 0 ? 3 : 4)
      .map(([k, v]) => ({ id: k, label: EXPENSE_CATS[k].label, color: EXPENSE_CATS[k].color, value: v, count: stack(v) })),
    ...(owed > 0 ? [{ id: 'owed', label: 'รอคืน', color: SPENT_COLOR, value: owed, count: stack(owed) }] : []),
  ];

  return (
    <div className="hp-tile pt-month-tile">
      <div className="pt-budget-row">
        <div>
          <div className="pt-muted sm">{left < 0 ? 'เกินงบ' : 'เหลือ'}</div>
          <div className={`pt-spend-total${left < 0 ? ' over' : ''}`}>{fmtMoney(Math.abs(left))}</div>
        </div>
        <div className="pt-right"><div className="pt-muted sm">งบ</div><div className="pt-strong">{fmtMoney(budget)}</div></div>
      </div>
      <Progress value={spent / budget} color={left < 0 ? 'var(--tw-danger)' : 'var(--tw-brand)'} />
      <PiggyView pileId={`month-${today.slice(0, 7)}`} coins={coins} rows={rows} onOpen={open} />
      {owe > 0 && <button className="pt-month-owe" onClick={open}>ต้องโอนคืนเพื่อน {fmtMoney(owe)}</button>}
    </div>
  );
}

// The month in full: set the budget, and each outing with what it cost me so far
export function MonthSheet({ onClose }) {
  const { actions, settings, showToast, today } = useProto();
  const navigate = useNavigate();
  const { budget, spent, left, owed, owe, rows } = useMonth();
  const [value, setValue] = useState(budget ? String(budget) : '');
  const n = parseInt(value, 10) || 0;
  const month = thaiShort(`${today.slice(0, 7)}-01`).split(' ')[1];

  const save = (close) => {
    actions.setSetting('monthBudget', n);
    showToast(n ? `งบเที่ยว ${fmtMoney(n)} ต่อเดือน` : 'ไม่ตั้งงบแล้ว');
    close();
  };

  return (
    <Sheet title="งบเที่ยวต่อเดือน" subtitle="นับเฉพาะนัด ทริปใช้กระปุกของทริป" onClose={onClose} tall
      footer={n !== (settings.monthBudget || 0) ? (close) => <button className="pt-btn block" onClick={() => save(close)}>บันทึก</button> : null}>
      {(close) => (
        <>
          <div className="pt-amount">
            <span className="pt-amount-cur">฿</span>
            <input inputMode="numeric" placeholder="0" value={value} style={{ width: `${Math.max(1, value.length) + 0.6}ch` }} onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))} />
          </div>

          {budget > 0 && (
            <div className="hp-tile pt-month-sum">
              <div><span className="pt-muted sm">ใช้ไป{month}</span><b>{fmtMoney(spent)}</b></div>
              <div><span className="pt-muted sm">{left < 0 ? 'เกินงบ' : 'เหลือ'}</span><b className={left < 0 ? 'over' : ''}>{fmtMoney(Math.abs(left))}</b></div>
              {owed > 0 && <div><span className="pt-muted sm">รอเพื่อนคืน</span><b>{fmtMoney(owed)}</b></div>}
              {owe > 0 && <div><span className="pt-muted sm">ต้องโอนคืน</span><b>{fmtMoney(owe)}</b></div>}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <SectionTitle title={`นัดเดือน${month}`} />
              <div className="pt-results">
                {rows.map((r) => (
                  <button key={r.plan.id} className="pt-result" onClick={() => { close(); setTimeout(() => navigate(`/proto/plan/${r.plan.id}`), 320); }}>
                    <span className="pt-grow">
                      <span className="pt-strong">{r.plan.name}</span>
                      <span className="pt-muted sm">
                        {thaiShort(r.plan.startDate)}
                        {r.owed > 0.5 ? ` · รอคืน ${fmtMoney(r.owed)}` : ''}
                        {r.owe > 0.5 ? ` · ต้องโอนคืน ${fmtMoney(r.owe)}` : ''}
                      </span>
                    </span>
                    <span className="pt-strong">{fmtMoney(r.cash)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Sheet>
  );
}
