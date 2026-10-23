import { useMemo, useState } from 'react';
import { useProto } from './useProto';
import { Sheet, Chip, CatIcon } from './ui';
import Icon from './icons';
import MapView from './MapView';
import { ResultList, SourcePreview } from './SavePlaceSheet';
import { parseShared, usePlaceSearch } from './placeSearch';
import { EVENT_KINDS, HOME, PEOPLE, ME, addDays, distanceKm, fmtKm, directionsUrl, eventRange } from './data';

// Concerts, flea markets and pop-ups live in posts, not in any free API, so people keep them from a link:
// paste the post, and the title, kind, dates and time are read from its caption where they can be.

const SAMPLES = [
  { label: 'ป๊อปอัปจาก IG', text: 'Pop-up ขนมโฮมเมด 🍪 1-2 พ.ย. 12.00 น. 📍สามย่านมิตรทาวน์ #popupbkk https://www.instagram.com/p/C0ffee12345/' },
  { label: 'คอนเสิร์ตจาก TikTok', text: 'คอนเสิร์ตฟรีริมน้ำ เสาร์ 8 พ.ย. 18:30 📍ล้ง 1919 #ดนตรีสด https://www.tiktok.com/@scout2015/video/6718335390845095173' },
  { label: 'ตลาดนัดจาก IG', text: 'ตลาดนัดวินเทจ flea market 15-16 พ.ย. 📍ช่างชุ่ย https://www.instagram.com/reel/C0ffee12345/' },
];

const MONTHS = [
  ['ม.ค.', 'มกรา'], ['ก.พ.', 'กุมภา'], ['มี.ค.', 'มีนา'], ['เม.ย.', 'เมษา'], ['พ.ค.', 'พฤษภา'], ['มิ.ย.', 'มิถุนา'],
  ['ก.ค.', 'กรกฎา'], ['ส.ค.', 'สิงหา'], ['ก.ย.', 'กันยา'], ['ต.ค.', 'ตุลา'], ['พ.ย.', 'พฤศจิกา'], ['ธ.ค.', 'ธันวา'],
];
const esc = (s) => s.replace(/\./g, '\\.');
const MONTH_RE = MONTHS.map(([a, b]) => `${esc(a)}|${b}\\S*`).join('|');
const DATE_RE = new RegExp(`(\\d{1,2})(?:\\s*[-–]\\s*(\\d{1,2}))?\\s*(${MONTH_RE})`);
const TIME_RE = /(?:^|\D)([01]?\d|2[0-3])[:.]([0-5]\d)(?!\d)/;
const KIND_WORDS = [
  ['concert', /คอนเสิร์ต|concert|ดนตรี|live|เฟส|fest/i],
  ['market', /ตลาด|market|flea/i],
  ['popup', /ป๊อป|pop.?up|ขาย|ร้าน|booth/i],
];

// "1-2 พ.ย." → this year's (or next year's, if it has passed) start and end
function guessDates(caption, today) {
  const m = caption?.match(DATE_RE);
  if (!m) return null;
  const month = MONTHS.findIndex(([a, b]) => m[3] === a || m[3].startsWith(b));
  let year = Number(today.slice(0, 4));
  const at = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const end = Number(m[2] || m[1]);
  if (at(end) < today) year++;
  return { start: at(Number(m[1])), end: at(end) };
}
const guessTime = (caption) => { const m = caption?.match(TIME_RE); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
const guessKind = (caption) => KIND_WORDS.find(([, re]) => re.test(caption || ''))?.[0] || 'other';
// the caption up to the first date, pin or hashtag
const guessTitle = (caption) => (caption || '').split(/📍|#|\n|\d{1,2}\s*[-–]?\s*\d{0,2}\s*(?:ม\.ค|ก\.พ|มี\.ค|เม\.ย|พ\.ค|มิ\.ย|ก\.ค|ส\.ค|ก\.ย|ต\.ค|พ\.ย|ธ\.ค)|เสาร์|อาทิตย์/)[0]
  .replace(/[^\p{L}\p{N}\s\-&'’.]/gu, '').trim().slice(0, 60);

export function SaveEventSheet({ onClose }) {
  const { actions, showToast, today, openSheet } = useProto();
  const [text, setText] = useState('');
  // read from the caption until the person changes them
  const [title, setTitle] = useState(null);
  const [kind, setKind] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [time, setTime] = useState(null);
  const [query, setQuery] = useState(null);
  const [picked, setPicked] = useState(null);
  const [note, setNote] = useState('');

  const shared = useMemo(() => parseShared(text), [text]);
  const caption = shared?.caption || '';
  const dates = guessDates(caption, today);
  const v = {
    title: title ?? guessTitle(caption),
    kind: kind ?? guessKind(caption),
    start: start ?? dates?.start ?? today,
    time: time ?? guessTime(caption),
    query: query ?? shared?.candidates?.[0] ?? '',
  };
  v.end = end && end >= v.start ? end : end ? v.start : dates?.end ?? v.start;
  const search = usePlaceSearch(picked ? '' : v.query);

  const applyText = (t) => {
    setText(t);
    [setTitle, setKind, setStart, setEnd, setTime, setQuery, setPicked].forEach((f) => f(null));
  };
  const pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) applyText(t);
    } catch {
      showToast('อ่านคลิปบอร์ดไม่ได้');
    }
  };

  const ready = v.title && picked && v.start;
  const save = (close) => {
    const source = shared && ['tiktok', 'instagram'].includes(shared.type)
      ? { type: shared.type, url: shared.url, author: shared.author || '' }
      : shared?.url ? { type: 'web', url: shared.url } : { type: 'manual' };
    const id = actions.addEvent({
      title: v.title, kind: v.kind, startDate: v.start, endDate: v.end, time: v.time, note,
      place: { name: picked.name, area: picked.area, prov: picked.prov, country: picked.country || 'TH', lat: picked.lat, lng: picked.lng },
      source,
    });
    showToast(`เก็บ “${v.title}” แล้ว`);
    close();
    setTimeout(() => openSheet('event', { eventId: id }), 340);
  };

  return (
    <Sheet title="เก็บงาน" onClose={onClose} tall
      footer={ready ? (close) => <button className="pt-btn block" onClick={() => save(close)}>เก็บงาน</button> : null}>
      <div className="pt-paste">
        <textarea className="pt-input pt-textarea" rows={2} placeholder="วางลิงก์โพสต์งาน" value={text} onChange={(e) => applyText(e.target.value)} />
        <div className="pt-paste-actions">
          <button className="pt-chip" onClick={pasteClipboard}><Icon name="link" size={14} /> วางลิงก์</button>
          {text && <button className="pt-chip" onClick={() => applyText('')}>ล้าง</button>}
        </div>
      </div>
      {!text && (
        <div className="pt-field">
          <div className="pt-label">ตัวอย่าง</div>
          <div className="pt-chip-row wrap">
            {SAMPLES.map((s) => <button key={s.label} className="pt-chip" onClick={() => applyText(s.text)}>{s.label}</button>)}
          </div>
        </div>
      )}

      {shared && shared.type !== 'text' && <SourcePreview key={shared.url} shared={shared} />}

      {text && (
        <div className="pt-field">
          <div className="pt-label">ชื่องาน</div>
          <input className="pt-input" placeholder="ชื่องาน" value={v.title} onChange={(e) => setTitle(e.target.value)} />
          <div className="pt-label">ประเภท</div>
          <div className="pt-chip-row wrap">
            {Object.entries(EVENT_KINDS).map(([k, c]) => (
              <Chip key={k} active={v.kind === k} onClick={() => setKind(k)}><Icon name={c.icon} size={14} className="pt-inline-icon" /> {c.label}</Chip>
            ))}
          </div>
          <div className="pt-label">วันที่</div>
          <div className="pt-ev-dates">
            <input type="date" className="pt-input" value={v.start} onChange={(e) => setStart(e.target.value)} />
            <span className="pt-muted">ถึง</span>
            <input type="date" className="pt-input" value={v.end} min={v.start} onChange={(e) => setEnd(e.target.value)} />
            <label className="pt-time"><Icon name="clock" size={16} /><input type="time" value={v.time} onChange={(e) => setTime(e.target.value)} /></label>
          </div>

          <div className="pt-label">สถานที่</div>
          {picked ? (
            <div className="pt-picked-row">
              <CatIcon cat="event" size={40} />
              <div className="pt-grow">
                <div className="pt-strong">{picked.name}</div>
                <div className="pt-muted">{picked.area}</div>
              </div>
              <button className="pt-chip" onClick={() => setPicked(null)}>เปลี่ยน</button>
            </div>
          ) : (
            <>
              {shared?.candidates?.length > 0 && (
                <div className="pt-chip-row wrap">
                  {shared.candidates.map((c) => <Chip key={c} active={v.query === c} onClick={() => setQuery(c)}>{c}</Chip>)}
                </div>
              )}
              <div className="pt-search">
                <Icon name="search" size={18} />
                <input value={v.query} onChange={(e) => setQuery(e.target.value)} placeholder="ชื่อสถานที่จัดงาน" />
              </div>
              <ResultList search={search} onPick={setPicked} />
            </>
          )}
          <input className="pt-input" placeholder="โน้ต" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Sheet>
  );
}

// One kept event: the post, when and where, and going (a new outing for it, with its group if it was shared)
export function EventSheet({ onClose, eventId }) {
  const { events, groups, actions, showToast, openSheet, today } = useProto();
  const ev = events.find((e) => e.id === eventId);
  if (!ev) return null;
  const kind = EVENT_KINDS[ev.kind] || EVENT_KINDS.other;
  const shared = ev.source?.url ? { ...parseShared(ev.source.url), author: ev.source.author, caption: '' } : null;
  const ended = (ev.endDate || ev.startDate) < today;

  // its own outing, never slipped into a trip that happens to cover the day; who comes is picked in the form
  const go = (close) => {
    close();
    setTimeout(() => openSheet('createPlan', {
      type: 'outing', name: ev.title, date: ev.startDate >= today ? ev.startDate : today, time: ev.time || '', groupId: ev.groupId,
      place: { name: ev.title, area: ev.place.name, prov: ev.place.prov, lat: ev.place.lat, lng: ev.place.lng, country: ev.place.country, cat: 'event', eventId: ev.id },
    }), 320);
  };

  return (
    <Sheet title={ev.title} subtitle={kind.label} onClose={onClose} tall
      footer={(close) => (
        <div className="pt-foot-row">
          <a className="pt-btn light" href={directionsUrl(ev.place)} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> นำทาง</a>
          <button className="pt-btn" disabled={ended} onClick={() => go(close)}>ไปงานนี้</button>
        </div>
      )}>
      {(close) => (
        <>
          <div className="pt-picked">
            <MapView className="pt-map-mini" points={[{ id: ev.id, lat: ev.place.lat, lng: ev.place.lng, cat: 'event' }]} interactive={false} />
            <div className="pt-picked-row">
              <CatIcon cat="event" size={40} />
              <div className="pt-grow">
                <div className="pt-strong">{eventRange(ev)}{ev.time ? ` · ${ev.time} น.` : ''}</div>
                <div className="pt-muted">{ev.place.name} · ห่าง {fmtKm(distanceKm(HOME, ev.place))}</div>
              </div>
            </div>
          </div>
          {ev.note && <div className="pt-note">“{ev.note}”</div>}
          {groups.length > 0 && (
            <>
              <div className="pt-label">แชร์ให้กลุ่ม</div>
              <div className="pt-chip-row wrap">
                <Chip active={!ev.groupId} onClick={() => actions.shareEvent(ev.id, null)}>เฉพาะฉัน</Chip>
                {groups.map((g) => <Chip key={g.id} active={ev.groupId === g.id} color={g.color} onClick={() => actions.shareEvent(ev.id, g.id)}>{g.name}</Chip>)}
              </div>
            </>
          )}
          {shared && <SourcePreview shared={shared} />}
          <div className="pt-muted sm pt-ev-by">เก็บโดย {PEOPLE[ev.by]?.name || 'ฉัน'}{ended ? ' · จบไปแล้ว' : ev.endDate && ev.endDate !== ev.startDate && ev.endDate <= addDays(today, 2) && ev.startDate <= today ? ' · ใกล้จบแล้ว' : ''}</div>
          <button className="pt-btn light block pt-ev-remove" onClick={() => { actions.removeEvent(ev.id); showToast('ลบงานแล้ว'); close(); }}>ลบงานนี้</button>
        </>
      )}
    </Sheet>
  );
}
