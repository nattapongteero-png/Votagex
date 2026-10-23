import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { useProto, useCollection } from './useProto';
import { Sheet, Avatar, Chip, CatIcon, Progress } from './ui';
import Icon, { Flag } from './icons';
import SavePlaceSheet, { ResultList } from './SavePlaceSheet';
import { PiggySheet, NewJarSheet } from './PiggySheet';
import { SaveEventSheet, EventSheet } from './EventSheet';
import { NewGroupSheet, GroupSheet } from './GroupSheet';
import {
  ME, PEOPLE, CURRENCIES, EXPENSE_CATS, MOODS, KINDS, DEMO_PROMPTPAY,
  countryOf, fmtMoney, addDays, parseISO, thaiShort, thaiRange, planStatus, diffDays,
} from './data';
import { usePlaceSearch } from './placeSearch';

/* ---------- Quick add (center + in the dock) ---------- */
function QuickAddSheet({ onClose }) {
  const { openSheet } = useProto();
  const go = (name, close) => { close(); setTimeout(() => openSheet(name), 320); };
  const items = [
    { name: 'expense', icon: 'wallet', label: 'จดรายจ่าย', tone: '#FFF1E6', color: '#EA580C' },
    { name: 'memory', icon: 'camera', label: 'รูป / โน้ต', tone: '#ECEEFE', color: '#4F46E5' },
    { name: 'savePlace', icon: 'bookmark', label: 'เซฟสถานที่', tone: '#E6F7F4', color: '#0D9488' },
    { name: 'saveEvent', icon: 'event', label: 'เก็บงาน', tone: '#F1EBFE', color: '#7C3AED' },
    { name: 'createPlan', icon: 'plans', label: 'แผนใหม่', tone: '#FDECF4', color: '#DB2777' },
  ];
  return (
    <Sheet title="บันทึก" onClose={onClose}>
      {(close) => (
        <div className="pt-quick-grid">
          {items.map((it) => (
            <button key={it.name} className="pt-quick" onClick={() => go(it.name, close)}>
              <span className="pt-quick-icon" style={{ background: it.tone, color: it.color }}><Icon name={it.icon} size={24} /></span>
              <span className="pt-strong">{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}

/* ---------- Expense ---------- */
function AddExpenseSheet({ onClose, planId: fixedPlanId }) {
  const { plans, activePlan, ensureActivePlan, actions, showToast, today } = useProto();
  const plan = plans.find((p) => p.id === fixedPlanId) || activePlan;
  const members = plan?.members || [ME];
  const planCur = plan?.currency || 'THB';
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(planCur);
  const [cat, setCat] = useState('food');
  const [title, setTitle] = useState('');
  const [paidBy, setPaidBy] = useState(ME);
  const [split, setSplit] = useState(members);
  const n = parseFloat(amount) || 0;
  const rate = CURRENCIES[currency].toTHB;

  const toggle = (id) => setSplit((s) => (s.includes(id) ? (s.length > 1 ? s.filter((x) => x !== id) : s) : [...s, id]));

  const save = (close) => {
    if (!n) return;
    const planId = plan?.id || ensureActivePlan();
    actions.addExpense({ planId, date: plan && planStatus(plan, today) !== 'ongoing' ? (plan.startDate || today) : today, title: title || EXPENSE_CATS[cat].label, amount: n, currency, toTHB: rate, cat, paidBy, split });
    showToast(`จดแล้ว ${fmtMoney(n, currency)}${currency !== 'THB' ? ` (≈ ${fmtMoney(n * rate)})` : ''}`);
    close();
  };

  return (
    <Sheet title="จดรายจ่าย" subtitle={plan?.name} onClose={onClose}
      footer={(close) => <button className="pt-btn block" disabled={!n} onClick={() => save(close)}>บันทึก {n ? fmtMoney(n, currency) : ''}</button>}>
      <div className="pt-amount">
        <span className="pt-amount-cur">{CURRENCIES[currency].symbol}</span>
        <input inputMode="decimal" autoFocus placeholder="0" value={amount} style={{ width: `${Math.max(1, amount.length) + 0.6}ch` }} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))} />
      </div>
      <div className="pt-amount-sub">
        {currency !== 'THB' && n > 0 ? `≈ ${fmtMoney(n * rate)}` : ' '}
      </div>
      <div className="pt-chip-row center">
        {[...new Set([planCur, 'THB'])].map((c) => <Chip key={c} active={currency === c} onClick={() => setCurrency(c)}>{c} {CURRENCIES[c].symbol}</Chip>)}
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
    </Sheet>
  );
}

/* ---------- Memory ---------- */
function compressImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(img.src);
      resolve(cv.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

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

/* ---------- Create plan (one screen) ---------- */
function nextSaturday(from) {
  const d = parseISO(from);
  const add = (6 - d.getDay() + 7) % 7 || 7;
  return addDays(from, add);
}

function CreatePlanSheet({ onClose, place, groupId }) {
  const { actions, closeSheet, today, groups, settings, cloud } = useProto();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState(place ? { ...place, key: 'prefill' } : null);
  const [when, setWhen] = useState('today');
  const [start, setStart] = useState(addDays(today, 7));
  const [end, setEnd] = useState(addDays(today, 9));
  const [name, setName] = useState('');
  // the group it's for: the one asked for, else the one home is showing; its members come along by default
  const [group, setGroup] = useState(() => groups.find((g) => g.id === (groupId || settings.scope)) || null);
  const [members, setMembers] = useState(() => group?.members || [ME]);
  const pickGroup = (g) => { setGroup(g); setMembers(g ? g.members : [ME]); };
  const search = usePlaceSearch(dest ? '' : query, { withDestinations: true });

  const country = dest?.country || 'TH';
  const c = countryOf(country);
  const dates = {
    today: [today, today], tomorrow: [addDays(today, 1), addDays(today, 1)],
    sat: [nextSaturday(today), nextSaturday(today)], range: [start, end < start ? start : end], idea: [null, null],
  }[when];
  const kind = when === 'idea' ? 'idea' : country !== 'TH' ? 'abroad' : dates[0] === dates[1] ? 'outing' : 'trip';
  const autoName = dest ? (kind === 'outing' ? `ไป ${dest.name}` : `ทริป${dest.name}`) : 'ออกไปข้างนอก';

  const create = () => {
    const id = actions.addPlan({
      name: name.trim() || autoName, kind, country, currency: c.currency,
      destination: dest ? { name: dest.name, lat: dest.lat, lng: dest.lng } : null,
      startDate: dates[0], endDate: dates[1], members, groupId: group?.id || null, budget: 0,
      cover: { icon: kind === 'abroad' ? 'globe' : kind === 'outing' ? 'food' : 'sight', tint: kind === 'abroad' ? '#E8F3FF' : kind === 'outing' ? '#FFF1E6' : '#E6F7F4' },
      checklist: kind === 'abroad' ? [
        { id: 'a1', text: 'พาสปอร์ตอายุเหลือเกิน 6 เดือน', done: false },
        { id: 'a2', text: 'เช็กเงื่อนไขวีซ่า / ลงทะเบียนเข้าเมือง', done: false },
        { id: 'a3', text: 'ประกันการเดินทาง', done: false },
        { id: 'a4', text: 'eSIM / Pocket WiFi', done: false },
        { id: 'a5', text: `แลกเงิน ${c.currency}`, done: false },
      ] : undefined,
      stops: place && dates[0] ? [{ id: 'first', date: dates[0], time: '', name: place.name, area: place.area, prov: place.prov, lat: place.lat, lng: place.lng, cat: place.cat, note: '', checkIns: {}, placeId: place.id }] : [],
    });
    closeSheet();
    navigate(`/proto/plan/${id}`);
  };

  return (
    <Sheet title="แผนใหม่" onClose={onClose} tall
      footer={<button className="pt-btn block" onClick={create}>สร้าง “{name.trim() || autoName}”</button>}>
      <div className="pt-label">ไปไหน</div>
      {dest ? (
        <div className="pt-picked-row boxed">
          <CatIcon cat={dest.cat || 'sight'} size={40} />
          <div className="pt-grow">
            <div className="pt-strong">{dest.name}</div>
            <div className="pt-muted"><Flag code={c.code} /> {c.name}{dest.area ? ` · ${dest.area}` : ''}</div>
          </div>
          <button className="pt-chip" onClick={() => { setDest(null); setQuery(''); }}>เปลี่ยน</button>
        </div>
      ) : (
        <>
          <div className="pt-search">
            <Icon name="search" size={18} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาสถานที่" />
          </div>
          <ResultList search={search} onPick={setDest} />
        </>
      )}

      {kind === 'abroad' && (
        <div className="pt-chip-row">
          <span className="pt-info-chip"><Flag code={c.code} /> {c.name}</span>
          <span className="pt-info-chip">{c.currency}</span>
          <span className="pt-info-chip"><Icon name="clock" size={14} /> {c.utc - 7 >= 0 ? '+' : ''}{c.utc - 7} ชม.</span>
        </div>
      )}

      <div className="pt-label">เมื่อไร</div>
      <div className="pt-chip-row wrap">
        <Chip active={when === 'today'} onClick={() => setWhen('today')}>วันนี้</Chip>
        <Chip active={when === 'tomorrow'} onClick={() => setWhen('tomorrow')}>พรุ่งนี้</Chip>
        <Chip active={when === 'sat'} onClick={() => setWhen('sat')}>เสาร์นี้</Chip>
        <Chip active={when === 'range'} onClick={() => setWhen('range')}>หลายวัน</Chip>
        <Chip active={when === 'idea'} onClick={() => setWhen('idea')}>ยังไม่รู้</Chip>
      </div>
      {when === 'range' && (
        <div className="pt-date-row">
          <label><span>ไป</span><input type="date" className="pt-input" value={start} onChange={(e) => setStart(e.target.value)} /></label>
          <label><span>กลับ</span><input type="date" className="pt-input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
        </div>
      )}
      <div className="pt-kind-line">
        <span className="pt-badge">{KINDS[kind].label}</span>
        <span className="pt-muted">{dates[0] ? thaiRange(dates[0], dates[1]) : ''}{dates[0] && dates[0] !== dates[1] ? ` · ${diffDays(dates[0], dates[1]) + 1} วัน` : ''}</span>
      </div>

      <div className="pt-label">ไปกับใคร</div>
      {groups.length > 0 && (
        <div className="pt-chip-row wrap">
          <Chip active={!group} onClick={() => pickGroup(null)}>ไม่มีกลุ่ม</Chip>
          {groups.map((g) => <Chip key={g.id} active={group?.id === g.id} color={g.color} onClick={() => pickGroup(g)}><Icon name={g.icon} size={14} className="pt-inline-icon" /> {g.name}</Chip>)}
        </div>
      )}
      <div className="pt-people">
        {/* signed in, only people in the trip's group can come (they're the ones who can see it) */}
        {(cloud ? (group ? group.members : [ME]).map((id) => PEOPLE[id]).filter(Boolean) : Object.values(PEOPLE)).map((p) => (
          <button key={p.id} className={`pt-person check${members.includes(p.id) ? ' active' : ''}`} disabled={p.id === ME}
            onClick={() => setMembers((m) => (m.includes(p.id) ? m.filter((x) => x !== p.id) : [...m, p.id]))}>
            <Avatar id={p.id} size={40} /><span>{p.id === ME ? 'ฉัน' : p.name}</span>
            {members.includes(p.id) && <i className="pt-person-check"><Icon name="check" size={12} stroke={3} /></i>}
          </button>
        ))}
        <button className="pt-person invite" onClick={() => navigator.clipboard?.writeText('https://votagex.app/j/AB12CD').catch(() => {})}>
          <span className="pt-invite-icon"><Icon name="link" size={18} /></span><span>ชวนด้วยลิงก์</span>
        </button>
      </div>

      <input className="pt-input" placeholder={autoName} value={name} onChange={(e) => setName(e.target.value)} />
    </Sheet>
  );
}

/* ---------- Add stop to a plan ---------- */
function AddStopSheet({ onClose, planId, date }) {
  const { plans, places, actions, showToast } = useProto();
  const plan = plans.find((p) => p.id === planId);
  const [tab, setTab] = useState('saved');
  const [query, setQuery] = useState('');
  const [time, setTime] = useState('');
  const bias = plan?.destination || undefined;
  const search = usePlaceSearch(tab === 'search' ? query : '', { bias });
  const saved = places.filter((p) => p.status === 'want' && (p.country || 'TH') === (plan?.country || 'TH'));

  const add = (pl, close) => {
    actions.addStop(planId, { date: date || null, time, name: pl.name, area: pl.area, prov: pl.prov, lat: pl.lat, lng: pl.lng, cat: pl.cat, placeId: pl.id && pl.id.startsWith('p') ? pl.id : undefined });
    showToast(`เพิ่ม “${pl.name}” แล้ว`);
    close();
  };

  return (
    <Sheet title="เพิ่มจุดแวะ" subtitle={date ? `${plan?.name} · ${thaiShort(date)}` : plan?.name} onClose={onClose} tall>
      {(close) => (
        <>
          <div className="pt-chip-row">
            <Chip active={tab === 'saved'} onClick={() => setTab('saved')}>จากที่อยากไป ({saved.length})</Chip>
            <Chip active={tab === 'search'} onClick={() => setTab('search')}>ค้นหาใหม่</Chip>
            <label className="pt-time"><Icon name="clock" size={16} /><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>
          {tab === 'saved' ? (
            saved.length ? (
              <div className="pt-results">
                {saved.map((p) => (
                  <button key={p.id} className="pt-result" onClick={() => add(p, close)}>
                    <CatIcon cat={p.cat} size={36} />
                    <span className="pt-grow"><span className="pt-strong">{p.name}</span><span className="pt-muted">{p.area}</span></span>
                    <Icon name="plus" size={18} />
                  </button>
                ))}
              </div>
            ) : <div className="pt-muted pad">ยังไม่มีที่อยากไป</div>
          ) : (
            <>
              <div className="pt-search">
                <Icon name="search" size={18} />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ชื่อสถานที่" />
              </div>
              <ResultList search={search} onPick={(r) => add(r, close)} />
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

/* ---------- Settle up with a PromptPay QR ---------- */
function SettleSheet({ onClose, planId, from, to, amount }) {
  const { actions, showToast } = useProto();
  const [qr, setQr] = useState('');
  useEffect(() => {
    QRCode.toDataURL(generatePayload(DEMO_PROMPTPAY, { amount }), { margin: 1, width: 520, color: { dark: '#111827' } }).then(setQr).catch(() => setQr(''));
  }, [amount]);
  return (
    <Sheet title="โอนคืน" onClose={onClose}
      footer={(close) => (
        <div className="pt-foot-row">
          <button className="pt-btn light" onClick={() => { navigator.share?.({ title: 'VOTAGEX', text: `โอน ${fmtMoney(amount)} ให้ ${PEOPLE[to].name}` }).catch(() => {}); }}>แชร์</button>
          <button className="pt-btn" onClick={() => { actions.markSettled(planId, `${from}>${to}`); showToast('บันทึกว่าโอนแล้ว'); close(); }}>โอนแล้ว</button>
        </div>
      )}>
      <div className="pt-settle-hero">
        <div className="pt-settle-people">
          <Avatar id={from} size={48} /><Icon name="next" size={20} /><Avatar id={to} size={48} />
        </div>
        <div className="pt-settle-amount">{fmtMoney(amount)}</div>
        <div className="pt-qr">{qr ? <img src={qr} alt="PromptPay QR" /> : <span className="pt-muted">กำลังสร้าง QR…</span>}</div>
        <div className="pt-warn">QR ตัวอย่าง ห้ามสแกนจ่ายจริง</div>
      </div>
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
  quickAdd: QuickAddSheet,
  savePlace: SavePlaceSheet,
  expense: AddExpenseSheet,
  memory: AddMemorySheet,
  createPlan: CreatePlanSheet,
  addStop: AddStopSheet,
  addToPlan: AddToPlanSheet,
  settle: SettleSheet,
  provinces: ProvinceSheet,
  piggy: PiggySheet,
  newJar: NewJarSheet,
  saveEvent: SaveEventSheet,
  event: EventSheet,
  newGroup: NewGroupSheet,
  group: GroupSheet,
};

export default function ProtoSheets() {
  const { sheet, closeSheet } = useProto();
  if (!sheet) return null;
  const C = SHEETS[sheet.name];
  return C ? <C key={sheet.name + JSON.stringify(sheet.props)} {...sheet.props} onClose={closeSheet} /> : null;
}

