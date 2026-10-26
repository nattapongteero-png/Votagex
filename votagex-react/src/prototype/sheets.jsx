import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { useProto, useCollection } from './useProto';
import { Sheet, Avatar, Chip, CatIcon, Progress, Seg } from './ui';
import Icon, { Flag } from './icons';
import SavePlaceSheet, { ResultList } from './SavePlaceSheet';
import { PiggySheet, NewJarSheet } from './PiggySheet';
import PlaceSheet from './PlaceSheet';
import ShuffleSheet from './ShuffleSheet';
import CreatePlanSheet from './CreatePlanSheet';
import { NewGroupSheet, GroupSheet } from './GroupSheet';
import { PlanMenuSheet, EditPlanSheet, StopSheet } from './PlanSheets';
import { MonthSheet } from './MonthMoney';
import {
  ME, PEOPLE, CURRENCIES, EXPENSE_CATS, MOODS, KINDS, DEMO_PROMPTPAY, PLACE_CATS, compressImage, eventEnded,
  countryOf, fmtMoney, thaiShort, thaiRange, planStatus,
} from './data';
import { usePlaceSearch } from './placeSearch';

/* ---------- Expense ---------- */
// expenseId: change (or delete) one already written down
function AddExpenseSheet({ onClose, planId: fixedPlanId, expenseId }) {
  const { plans, expenses, activePlan, ensureActivePlan, actions, showToast, today } = useProto();
  const editing = expenseId && expenses.find((e) => e.id === expenseId);
  const plan = plans.find((p) => p.id === (editing?.planId || fixedPlanId)) || activePlan;
  const members = plan?.members || [ME];
  const planCur = plan?.currency || 'THB';
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [currency, setCurrency] = useState(editing?.currency || planCur);
  const [cat, setCat] = useState(editing?.cat || 'food');
  const [title, setTitle] = useState(editing?.title || '');
  const [paidBy, setPaidBy] = useState(editing?.paidBy || ME);
  const [split, setSplit] = useState(editing?.split || members);
  const n = parseFloat(amount) || 0;
  const rate = CURRENCIES[currency].toTHB;

  const toggle = (id) => setSplit((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));

  const save = (close) => {
    if (!n) return;
    if (editing) {
      actions.updateExpense(editing.id, { title: title || EXPENSE_CATS[cat].label, amount: n, currency, toTHB: rate, cat, paidBy, split });
      showToast('บันทึกแล้ว');
      close();
      return;
    }
    const planId = plan?.id || ensureActivePlan();
    actions.addExpense({ planId, date: plan && planStatus(plan, today) !== 'ongoing' ? (plan.startDate || today) : today, title: title || EXPENSE_CATS[cat].label, amount: n, currency, toTHB: rate, cat, paidBy, split });
    showToast(`จดแล้ว ${fmtMoney(n, currency)}${currency !== 'THB' ? ` (≈ ${fmtMoney(n * rate)})` : ''}`);
    close();
  };

  return (
    <Sheet title={editing ? 'แก้รายจ่าย' : 'จดรายจ่าย'} subtitle={plan?.name} onClose={onClose}
      footer={(close) => <button className="pt-btn block" disabled={!n} onClick={() => save(close)}>บันทึก {n ? fmtMoney(n, currency) : ''}</button>}>
      {(close) => (
        <>
          <div className="pt-amount">
            <span className="pt-amount-cur">{CURRENCIES[currency].symbol}</span>
            <input inputMode="decimal" autoFocus placeholder="0" value={amount} style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <div className="pt-amount-sub">
            {currency !== 'THB' && n > 0 ? `≈ ${fmtMoney(n * rate)}` : ' '}
          </div>
          <div className="pt-chip-row center">
            {[...new Set([planCur, 'THB', currency])].map((c) => <Chip key={c} active={currency === c} onClick={() => setCurrency(c)}>{c} {CURRENCIES[c].symbol}</Chip>)}
          </div>
          <div className="pt-label">หมวด</div>
          <div className="pt-chip-row wrap">
            {Object.entries(EXPENSE_CATS).map(([k, c]) => <Chip key={k} active={cat === k} color={c.color} onClick={() => setCat(k)}>{c.label}</Chip>)}
          </div>
          <input className="pt-input" placeholder="ชื่อรายการ" value={title} onChange={(e) => setTitle(e.target.value)} />
          {members.length > 1 && (
            <>
              <div className="pt-label">ใครจ่าย</div>
              <div className="pt-people">
                {members.map((id) => (
                  <button key={id} className={`pt-person${paidBy === id ? ' active' : ''}`} onClick={() => setPaidBy(id)}>
                    <Avatar id={id} size={40} /><span>{PEOPLE[id].name}</span>
                  </button>
                ))}
              </div>
              <div className="pt-label">หารกับ <span className="pt-muted sm">{n ? `คนละ ${fmtMoney((n * rate) / split.length)}` : ''}</span></div>
              <div className="pt-people">
                {members.map((id) => (
                  <button key={id} className={`pt-person check${split.includes(id) ? ' active' : ''}`} onClick={() => toggle(id)}>
                    <Avatar id={id} size={40} /><span>{PEOPLE[id].name}</span>
                    {split.includes(id) && <i className="pt-person-check"><Icon name="check" size={12} stroke={3} /></i>}
                  </button>
                ))}
              </div>
            </>
          )}
          {editing && <button className="pt-btn light block danger" onClick={() => { actions.removeExpense(editing.id); close(); }}><Icon name="trash" size={16} /> ลบรายการนี้</button>}
        </>
      )}
    </Sheet>
  );
}

/* ---------- Memory ---------- */
function AddMemorySheet({ onClose, planId: fixedPlanId }) {
  const { plans, activePlan, ensureActivePlan, actions, showToast, today } = useProto();
  const plan = plans.find((p) => p.id === fixedPlanId) || activePlan;
  const [photos, setPhotos] = useState([]);
  const [textValue, setText] = useState('');
  const [mood, setMood] = useState('moodHappy');
  const date = plan && planStatus(plan, today) !== 'ongoing' ? (plan.startDate || today) : today;
  const stops = (plan?.stops || []).filter((s) => s.date === date || planStatus(plan, today) === 'past');
  const [stopId, setStopId] = useState(null);

  const onFiles = async (e) => {
    const files = [...e.target.files].slice(0, 6);
    const urls = await Promise.all(files.map((f) => compressImage(f).catch(() => null)));
    setPhotos((p) => [...p, ...urls.filter(Boolean)].slice(0, 6));
  };

  const save = (close) => {
    const planId = plan?.id || ensureActivePlan();
    actions.addMemory({ planId, date: stopId ? (stops.find((s) => s.id === stopId)?.date || date) : date, stopId, photos, text: textValue, mood, by: ME });
    showToast('เก็บความทรงจำแล้ว');
    close();
  };

  return (
    <Sheet title="เก็บความทรงจำ" subtitle={plan?.name} onClose={onClose}
      footer={(close) => <button className="pt-btn block" disabled={!photos.length && !textValue.trim()} onClick={() => save(close)}>บันทึก</button>}>
      <div className="pt-photo-row">
        <label className="pt-photo-add">
          <Icon name="camera" size={24} />
          <span>เพิ่มรูป</span>
          <input type="file" accept="image/*" multiple onChange={onFiles} hidden />
        </label>
        {photos.map((src, i) => (
          <div key={i} className="pt-photo-thumb" style={{ backgroundImage: `url(${src})` }}>
            <button aria-label="ลบรูป" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}><Icon name="close" size={12} stroke={2.6} /></button>
          </div>
        ))}
      </div>
      <textarea className="pt-input pt-textarea" rows={3} placeholder="วันนี้เป็นยังไงบ้าง…" value={textValue} onChange={(e) => setText(e.target.value)} />
      <div className="pt-label">ความรู้สึก</div>
      <div className="pt-mood-row">
        {MOODS.map((m) => <button key={m} className={`pt-mood${mood === m ? ' active' : ''}`} aria-label={m} onClick={() => setMood(m)}><Icon name={m} size={26} /></button>)}
      </div>
      {stops.length > 0 && (
        <>
          <div className="pt-label">ที่ไหน</div>
          <div className="pt-chip-row wrap">
            {stops.map((s) => <Chip key={s.id} active={stopId === s.id} onClick={() => setStopId(stopId === s.id ? null : s.id)}>{s.name}</Chip>)}
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ---------- Add stop to a plan ---------- */
// One search box: before typing it lists the places I want to go, typing narrows those and searches the map too.
// The time comes after, from the toast or by tapping the stop.
function AddStopSheet({ onClose, planId, date }) {
  const { plans, places, actions, showToast, openSheet, today } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const [query, setQuery] = useState('');
  const bias = plan?.destination || undefined;
  const search = usePlaceSearch(query, { bias });
  const q = query.trim().toLowerCase();
  const saved = places.filter((p) => p.status === 'want' && !eventEnded(p, today) && (p.country || 'TH') === (plan?.country || 'TH') && (!q || p.name.toLowerCase().includes(q)));

  const add = (pl, close) => {
    const stopId = actions.addStop(planId, { date: date || null, time: '', name: pl.name, area: pl.area, prov: pl.prov, lat: pl.lat, lng: pl.lng, cat: pl.cat, placeId: pl.savedAt ? pl.id : undefined });
    close();
    showToast(`เพิ่ม “${pl.name}” แล้ว`, { label: 'ใส่เวลา', onClick: () => openSheet('stop', { planId, stopId }) });
  };

  return (
    <Sheet title="เพิ่มจุดแวะ" subtitle={date ? `${plan?.name} · ${thaiShort(date)}` : plan?.name} onClose={onClose} tall>
      {(close) => (
        <>
          <div className="pt-search">
            <Icon name="search" size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาสถานที่" />
          </div>
          {saved.length > 0 && (
            <>
              <div className="pt-label">ที่อยากไป</div>
              <div className="pt-results">
                {saved.map((p) => (
                  <button key={p.id} className="pt-result" onClick={() => add(p, close)}>
                    <CatIcon cat={p.cat} size={36} />
                    <span className="pt-grow"><span className="pt-strong">{p.name}</span><span className="pt-muted">{p.area}</span></span>
                    <Icon name="plus" size={18} />
                  </button>
                ))}
              </div>
            </>
          )}
          {q && (
            <>
              {saved.length > 0 && <div className="pt-label">ผลค้นหา</div>}
              <ResultList search={search} onPick={(r) => add(r, close)} icon="plus" />
            </>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------- Put a saved place into a plan ---------- */
function AddToPlanSheet({ onClose, placeId }) {
  const { plans, places, actions, showToast, openSheet, today } = useProto();
  const navigate = useNavigate();
  const place = places.find((p) => p.id === placeId);
  const options = plans.filter((p) => planStatus(p, today) !== 'past');
  if (!place) return null;

  const add = (plan, close) => {
    const date = plan.startDate ? (planStatus(plan, today) === 'ongoing' ? today : plan.startDate) : null;
    actions.addStop(plan.id, { date, time: '', name: place.name, area: place.area, prov: place.prov, lat: place.lat, lng: place.lng, cat: place.cat, placeId: place.id });
    showToast(`เพิ่ม “${place.name}” ลง ${plan.name} แล้ว`);
    close();
    setTimeout(() => navigate(`/proto/plan/${plan.id}`), 320);
  };

  return (
    <Sheet title="เพิ่มลงแผน" subtitle={place.name} onClose={onClose}>
      {(close) => (
        <div className="pt-results">
          <button className="pt-result accent" onClick={() => { close(); setTimeout(() => openSheet('createPlan', { place }), 320); }}>
            <span className="pt-cat-icon" style={{ width: 36, height: 36, background: 'var(--tw-btn-primary)', color: '#fff' }}><Icon name="plus" size={18} /></span>
            <span className="pt-grow"><span className="pt-strong">แผนใหม่</span></span>
          </button>
          {options.map((p) => (
            <button key={p.id} className="pt-result" onClick={() => add(p, close)}>
              <span className="pt-flag-icon"><Flag code={p.country} size={20} /></span>
              <span className="pt-grow"><span className="pt-strong">{p.name}</span><span className="pt-muted">{KINDS[p.kind].label} · {thaiRange(p.startDate, p.endDate)}</span></span>
              <Icon name="next" size={18} />
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Paying a friend back: PromptPay QR, a slip, "โอนแล้ว" ---------- */
// The friend confirms it came (with the slip in front of them); until then it shows as waiting.
function SettleSheet({ onClose, planId, to, amount }) {
  const { actions, showToast, cloud } = useProto();
  const [qr, setQr] = useState(''); // '': still making it, null: they haven't set their PromptPay
  const [slip, setSlip] = useState(null);
  useEffect(() => {
    let alive = true;
    actions.promptPayOf(planId, to)
      .then((pp) => (pp ? QRCode.toDataURL(generatePayload(pp, { amount }), { margin: 1, width: 520, color: { dark: '#111827' } }) : null))
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQr(null));
    return () => { alive = false; };
  }, [actions, planId, to, amount]);
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) setSlip(await compressImage(file).catch(() => null));
  };
  return (
    <Sheet title="โอนคืน" subtitle={`ให้${PEOPLE[to].name}`} onClose={onClose}
      footer={(close) => (
        <div className="pt-foot-row">
          <button className="pt-btn light" onClick={() => { navigator.share?.({ title: 'VOTAGEX', text: `โอน ${fmtMoney(amount)} ให้ ${PEOPLE[to].name}` }).catch(() => {}); }}>แชร์</button>
          <button className="pt-btn" onClick={() => { actions.sendPayment(planId, { to, amount, slip }); showToast(`บันทึกแล้ว รอ${PEOPLE[to].name}ยืนยัน`); close(); }}>โอนแล้ว</button>
        </div>
      )}>
      <div className="pt-settle-hero">
        <div className="pt-settle-people">
          <Avatar id={ME} size={48} /><Icon name="next" size={20} /><Avatar id={to} size={48} />
        </div>
        <div className="pt-settle-amount">{fmtMoney(amount)}</div>
        {qr === null
          ? <div className="pt-muted center">{PEOPLE[to].name}ยังไม่ได้ตั้งพร้อมเพย์</div>
          : <div className="pt-qr">{qr ? <img src={qr} alt="PromptPay QR" /> : <span className="pt-muted">กำลังสร้าง QR…</span>}</div>}
        {!cloud && <div className="pt-warn">QR ตัวอย่าง ห้ามสแกนจ่ายจริง</div>}
      </div>
      <label className="pt-slip-add">
        {slip ? <img src={slip} alt="สลิป" /> : <><Icon name="camera" size={20} /> แนบสลิป</>}
        <input type="file" accept="image/*" hidden onChange={onFile} />
      </label>
    </Sheet>
  );
}

/* ---------- My PromptPay: friends in my groups get a QR to pay me back ---------- */
// a phone number (10 digits, starts with 0) or a national ID (13 digits)
const validPromptPay = (v) => /^0\d{9}$/.test(v) || /^\d{13}$/.test(v);
function PromptPaySheet({ onClose }) {
  const { settings, actions, showToast } = useProto();
  const [value, setValue] = useState(settings.promptpay || '');
  const ok = validPromptPay(value);
  return (
    <Sheet title="พร้อมเพย์รับเงินคืน" subtitle="เพื่อนในกลุ่มเห็น เพื่อสแกนโอนคืน" onClose={onClose}
      footer={(close) => (
        <div className="pt-foot-row">
          {settings.promptpay && <button className="pt-btn light" onClick={() => { actions.setSetting('promptpay', null); showToast('ลบพร้อมเพย์แล้ว'); close(); }}>ลบ</button>}
          <button className="pt-btn" disabled={!ok} onClick={() => { actions.setSetting('promptpay', value); showToast('บันทึกพร้อมเพย์แล้ว'); close(); }}>บันทึก</button>
        </div>
      )}>
      <input className="pt-input" inputMode="numeric" autoFocus placeholder="เบอร์มือถือ หรือเลขบัตรประชาชน" value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 13))} />
    </Sheet>
  );
}

/* ---------- One transfer: the slip, confirm it came, delete it ---------- */
function PaymentSheet({ onClose, payId }) {
  const { payments, plans, actions, showToast } = useProto();
  const pay = payments.find((x) => x.id === payId);
  const [slip, setSlip] = useState(undefined); // undefined: still loading, null: couldn't
  useEffect(() => {
    if (pay?.slip) actions.loadSlip(payId).then(setSlip);
  }, [payId, pay?.slip, actions]);
  if (!pay) return null;
  const plan = plans.find((p) => p.id === pay.planId);
  const toConfirm = pay.status === 'sent' && pay.to === ME;

  return (
    <Sheet title={`${PEOPLE[pay.from]?.name} → ${PEOPLE[pay.to]?.name}`} subtitle={plan?.name} onClose={onClose}
      footer={toConfirm ? (close) => <button className="pt-btn block" onClick={() => { actions.confirmPayment(pay.id); showToast(`ได้รับ ${fmtMoney(pay.amount)} แล้ว`); close(); }}>ได้รับแล้ว</button> : null}>
      {(close) => (
        <>
          <div className="pt-settle-hero">
            <div className="pt-settle-people">
              <Avatar id={pay.from} size={48} /><Icon name="next" size={20} /><Avatar id={pay.to} size={48} />
            </div>
            <div className="pt-settle-amount">{fmtMoney(pay.amount)}</div>
            <span className={`pt-badge${pay.status === 'received' ? ' ok' : ''}`}>{pay.status === 'received' ? 'ได้รับแล้ว' : 'รอยืนยัน'} · {thaiShort(pay.date)}</span>
          </div>
          {pay.slip
            ? (slip ? <img className="pt-slip" src={slip} alt="สลิป" /> : <div className="pt-muted pad center">{slip === null ? 'เปิดสลิปไม่ได้' : 'กำลังโหลดสลิป…'}</div>)
            : <div className="pt-muted pad center">ไม่ได้แนบสลิป</div>}
          {(pay.from === ME || pay.to === ME) && (
            <button className="pt-btn light block danger" onClick={() => { actions.removePayment(pay.id); close(); }}><Icon name="trash" size={16} /> ลบรายการนี้</button>
          )}
        </>
      )}
    </Sheet>
  );
}

/* ---------- Provinces collected ---------- */
function ProvinceSheet({ onClose }) {
  const { provinces, countries } = useCollection();
  return (
    <Sheet title="สะสมจังหวัด" onClose={onClose}>
      <div className="pt-collect-hero">
        <div className="pt-collect-num">{provinces.length}<span>/77</span></div>
        <Progress value={provinces.length / 77} color="var(--tw-brand)" />
        <div className="pt-muted pt-flag-list">{countries.map((c) => <span key={c}><Flag code={c} /> {countryOf(c).name}</span>)}</div>
      </div>
      <div className="pt-results">
        {provinces.map((p) => (
          <div key={p.name} className="pt-result static">
            <span className="pt-cat-icon" style={{ width: 36, height: 36, background: 'var(--tw-brand-subtle)', color: 'var(--tw-brand)' }}><Icon name="check" size={18} stroke={2.4} /></span>
            <span className="pt-grow"><span className="pt-strong">{p.name}</span><span className="pt-muted">{p.from.join(' · ')}</span></span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------- Switcher ---------- */
const SHEETS = {
  savePlace: SavePlaceSheet,
  expense: AddExpenseSheet,
  memory: AddMemorySheet,
  createPlan: CreatePlanSheet,
  addStop: AddStopSheet,
  addToPlan: AddToPlanSheet,
  settle: SettleSheet,
  payment: PaymentSheet,
  month: MonthSheet,
  promptpay: PromptPaySheet,
  provinces: ProvinceSheet,
  piggy: PiggySheet,
  newJar: NewJarSheet,
  place: PlaceSheet,
  shuffle: ShuffleSheet,
  newGroup: NewGroupSheet,
  group: GroupSheet,
  planMenu: PlanMenuSheet,
  editPlan: EditPlanSheet,
  stop: StopSheet,
};

export default function ProtoSheets() {
  const { sheet, closeSheet } = useProto();
  if (!sheet) return null;
  const C = SHEETS[sheet.name];
  return C ? <C key={sheet.name + JSON.stringify(sheet.props)} {...sheet.props} onClose={closeSheet} /> : null;
}

