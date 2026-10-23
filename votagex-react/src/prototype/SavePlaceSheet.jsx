import { useEffect, useMemo, useState } from 'react';
import { useProto } from './useProto';
import { Sheet, CatIcon, Chip } from './ui';
import Icon, { Flag, SourceBadge } from './icons';
import MapView from './MapView';
import { PLACE_CATS, SOURCES, EVENT_KINDS, distanceKm } from './data';
import { parseShared, usePlaceSearch, checkTikTok, tiktokPlayer, instagramEmbed, guessDates, guessKind, guessTime, guessTitle } from './placeSearch';

// Demo inputs. The TikTok sample uses TikTok's own documented example clip so the embed really loads.
const SAMPLES = [
  { label: 'คาเฟ่จาก TikTok', text: 'ร้านลับในซอยเก่า กาแฟดี วิวสตรีทอาร์ต ☕️ 📍ตลาดน้อย #คาเฟ่กรุงเทพ #ตลาดน้อย https://www.tiktok.com/@scout2015/video/6718335390845095173' },
  { label: 'ทะเลจาก IG', text: 'ทะเลน้ำใสใกล้กรุงเทพ 🏝️ 📍หาดตาแหวน #เกาะล้าน #เที่ยวชลบุรี https://www.instagram.com/reel/C0ffee12345/' },
  { label: 'Google Maps', text: 'https://www.google.com/maps/place/Wat+Arun/@13.7437,100.4888,17z' },
  { label: 'ป๊อปอัปจาก IG', text: 'Pop-up ขนมโฮมเมด 🍪 1-2 พ.ย. 12.00 น. 📍สามย่านมิตรทาวน์ #popupbkk https://www.instagram.com/p/C0ffee12345/' },
  { label: 'คอนเสิร์ตจาก TikTok', text: 'คอนเสิร์ตฟรีริมน้ำ เสาร์ 8 พ.ย. 18:30 📍ล้ง 1919 #ดนตรีสด https://www.tiktok.com/@scout2015/video/6718335390845095173' },
];

// Keep somewhere from a link (or a name): a place, or an event at a place when the post has dates.
// One list for both: an event is a place I want to go that has dates. dated: start with dates on.
export default function SavePlaceSheet({ onClose, dated: startDated = false }) {
  const { places, groups, actions, showToast, openSheet, today, settings } = useProto();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [cat, setCat] = useState('sight');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('want');
  // dates and the rest of an event: read from the caption until the person changes them
  const [dated, setDated] = useState(startDated);
  const [title, setTitle] = useState(null);
  const [kind, setKind] = useState(null);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [time, setTime] = useState(null);
  // shared with the group home is showing, by default
  const [groupId, setGroupId] = useState(() => (groups.some((g) => g.id === settings.scope) ? settings.scope : null));

  const shared = useMemo(() => parseShared(text), [text]);
  const caption = shared?.caption || '';
  const dates = guessDates(caption, today);
  const ev = {
    title: title ?? (guessTitle(caption) || picked?.name || ''),
    kind: kind ?? guessKind(caption),
    start: start ?? dates?.start ?? today,
    time: time ?? guessTime(caption),
  };
  ev.end = end && end >= ev.start ? end : end ? ev.start : dates?.end ?? ev.start;

  // New input: reset the pick and the event fields, seed the search from the caption
  const applyText = (t) => {
    const s = parseShared(t);
    setText(t);
    [setTitle, setKind, setStart, setEnd, setTime].forEach((f) => f(null));
    setDated(startDated || Boolean(guessDates(s?.caption, today)));
    if (s?.type === 'maps' && s.place) {
      setPicked({ ...s.place, key: 'maps', area: 'จากลิงก์ Google Maps', country: 'TH', prov: '', cat: 'sight' });
      setQuery('');
      return;
    }
    setPicked(null);
    setQuery(!s ? '' : s.type === 'text' ? s.caption : (s.candidates[0] || ''));
  };

  const search = usePlaceSearch(picked ? '' : query);

  const pick = (r) => {
    setPicked(r);
    setCat(r.cat || 'sight');
  };

  const duplicate = picked && !dated && places.find((p) => !p.startDate && distanceKm(p, picked) < 0.08);

  const source = shared && ['tiktok', 'instagram', 'maps'].includes(shared.type)
    ? { type: shared.type, url: shared.url, author: shared.author || '' }
    : shared?.url ? { type: 'web', url: shared.url } : { type: 'manual' };

  const save = (thenAddToPlan, close) => {
    const at = { area: picked.area, prov: picked.prov, country: picked.country || 'TH', lat: picked.lat, lng: picked.lng };
    const place = dated
      ? { ...at, name: ev.title || picked.name, venue: picked.name, cat: 'event', kind: ev.kind, startDate: ev.start, endDate: ev.end, time: ev.time, status: 'want' }
      : { ...at, name: picked.name, cat, status };
    const id = actions.addPlace({ ...place, source, groupId, note: note || caption.slice(0, 80) || '' });
    const group = groups.find((g) => g.id === groupId);
    showToast(`เก็บ “${place.name}” แล้ว${group ? ` · แชร์ให้${group.name}` : ''}`);
    close();
    if (thenAddToPlan) setTimeout(() => openSheet('addToPlan', { placeId: id }), 340);
  };

  const pasteClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) applyText(t);
    } catch {
      showToast('อ่านคลิปบอร์ดไม่ได้');
    }
  };

  return (
    <Sheet title="เก็บที่อยากไป" onClose={onClose} tall
      footer={picked ? (close) => (
        <div className="pt-foot-row">
          {!dated && <button className="pt-btn light" onClick={() => save(true, close)}>เก็บ + เพิ่มลงแผน</button>}
          <button className="pt-btn" onClick={() => save(false, close)}>เก็บ</button>
        </div>
      ) : null}
    >
      {/* 1. paste */}
      <div className="pt-paste">
        <textarea
          className="pt-input pt-textarea"
          rows={2}
          placeholder="วางลิงก์โพสต์ หรือพิมพ์ชื่อสถานที่"
          value={text}
          onChange={(e) => applyText(e.target.value)}
        />
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

      {/* 2. source preview */}
      {shared && shared.type !== 'text' && <SourcePreview key={shared.url} shared={shared} />}

      {/* 3. which place? */}
      {shared && !picked && (
        <div className="pt-field">
          {shared.type !== 'text' && <div className="pt-label">สถานที่</div>}
          {shared.candidates.length > 0 && (
            <div className="pt-chip-row wrap">
              {shared.candidates.map((c) => <Chip key={c} active={query === c} onClick={() => setQuery(c)}>{c}</Chip>)}
            </div>
          )}
          {shared.type !== 'text' && (
            <div className="pt-search">
              <Icon name="search" size={18} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="พิมพ์ชื่อร้าน / สถานที่" />
            </div>
          )}
          <ResultList search={search} onPick={pick} />
        </div>
      )}

      {/* 4. confirm: a place, or (with dates) an event there */}
      {picked && (
        <div className="pt-field">
          <div className="pt-picked">
            <MapView className="pt-map-mini" points={[{ id: 'x', lat: picked.lat, lng: picked.lng, cat: dated ? 'event' : cat }]} interactive={false} />
            <div className="pt-picked-row">
              <CatIcon cat={dated ? 'event' : cat} size={40} />
              <div className="pt-grow">
                <div className="pt-strong">{picked.name}</div>
                <div className="pt-muted">{picked.area}{picked.country && picked.country !== 'TH' && <> · <Flag code={picked.country} /></>}</div>
              </div>
              {picked.key !== 'maps' && <button className="pt-chip" onClick={() => setPicked(null)}>เปลี่ยน</button>}
            </div>
          </div>
          {duplicate && <div className="pt-clip-status fail">เก็บไว้แล้ว</div>}

          <div className="pt-chip-row">
            <Chip active={!dated} onClick={() => setDated(false)}>สถานที่</Chip>
            <Chip active={dated} onClick={() => setDated(true)}><Icon name="event" size={14} className="pt-inline-icon" /> งานที่มีวันจัด</Chip>
          </div>
          {dated ? (
            <>
              <input className="pt-input" placeholder="ชื่องาน" value={ev.title} onChange={(e) => setTitle(e.target.value)} />
              <div className="pt-chip-row wrap">
                {Object.entries(EVENT_KINDS).map(([k, c]) => (
                  <Chip key={k} active={ev.kind === k} onClick={() => setKind(k)}><Icon name={c.icon} size={14} className="pt-inline-icon" /> {c.label}</Chip>
                ))}
              </div>
              <div className="pt-ev-dates">
                <input type="date" className="pt-input" value={ev.start} onChange={(e) => setStart(e.target.value)} />
                <span className="pt-muted">ถึง</span>
                <input type="date" className="pt-input" value={ev.end} min={ev.start} onChange={(e) => setEnd(e.target.value)} />
                <label className="pt-time"><Icon name="clock" size={16} /><input type="time" value={ev.time} onChange={(e) => setTime(e.target.value)} /></label>
              </div>
            </>
          ) : (
            <>
              <div className="pt-chip-row wrap">
                {Object.entries(PLACE_CATS).filter(([k]) => k !== 'event').map(([k, c]) => <Chip key={k} active={cat === k} color={c.color} onClick={() => setCat(k)}>{c.label}</Chip>)}
              </div>
              <div className="pt-chip-row">
                <Chip active={status === 'want'} onClick={() => setStatus('want')}>อยากไป</Chip>
                <Chip active={status === 'visited'} onClick={() => setStatus('visited')}>เคยไปแล้ว</Chip>
              </div>
            </>
          )}
          {groups.length > 0 && (
            <>
              <div className="pt-label">แชร์ให้กลุ่ม</div>
              <div className="pt-chip-row wrap">
                <Chip active={!groupId} onClick={() => setGroupId(null)}>เฉพาะฉัน</Chip>
                {groups.map((g) => <Chip key={g.id} active={groupId === g.id} color={g.color} onClick={() => setGroupId(g.id)}>{g.name}</Chip>)}
              </div>
            </>
          )}
          <input className="pt-input" placeholder="โน้ต" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Sheet>
  );
}

// icon: what tapping a result does right away (plus: adds it); none when it's only picked
export function ResultList({ search, onPick, icon = null }) {
  if (search.loading && !search.results.length) return <div className="pt-muted pad">กำลังค้นหา…</div>;
  if (search.error && !search.results.length) return <div className="pt-muted pad">ค้นหาไม่ได้</div>;
  if (search.q && !search.results.length) return <div className="pt-muted pad">ไม่พบสถานที่</div>;
  return (
    <div className="pt-results">
      {search.results.map((r) => (
        <button key={r.key} className="pt-result" onClick={() => onPick(r)}>
          <CatIcon cat={r.cat} size={36} />
          <span className="pt-grow">
            <span className="pt-strong">{r.name}</span>
            <span className="pt-muted">{r.area}{r.country && r.country !== 'TH' && <> <Flag code={r.country} /></>}</span>
          </span>
          {icon && <Icon name={icon} size={18} />}
        </button>
      ))}
    </div>
  );
}

// The shared post: where it's from, the clip or post itself (TikTok checked through oEmbed, public and
// CORS-enabled) and its caption. Used when saving a place or an event.
export function SourcePreview({ shared }) {
  const [clipResult, setClipResult] = useState({ url: null, state: 'idle' });
  const [showEmbed, setShowEmbed] = useState(shared.type === 'tiktok');
  const tiktokUrl = shared.type === 'tiktok' && !shared.short ? shared.url : null;
  useEffect(() => {
    if (!tiktokUrl) return undefined;
    let alive = true;
    checkTikTok(tiktokUrl)
      .then(() => alive && setClipResult({ url: tiktokUrl, state: 'ok' }))
      .catch(() => alive && setClipResult({ url: tiktokUrl, state: 'fail' }));
    return () => { alive = false; };
  }, [tiktokUrl]);
  const clip = { state: !tiktokUrl ? 'idle' : clipResult.url === tiktokUrl ? clipResult.state : 'loading' };
  return (
    <div className="pt-source-card">
      <div className="pt-source-head">
        <SourceBadge type={shared.type === 'web' ? 'manual' : shared.type} size={30} />
        <div className="pt-grow">
          <div className="pt-strong">{SOURCES[shared.type]?.label || 'ลิงก์เว็บ'}{shared.author ? ` · ${shared.author}` : ''}</div>
          <div className="pt-muted ellipsis">{shared.url}</div>
        </div>
        {shared.type === 'instagram' && shared.code && (
          <button className="pt-chip" onClick={() => setShowEmbed((v) => !v)}>{showEmbed ? 'ซ่อนโพสต์' : 'ดูโพสต์'}</button>
        )}
      </div>
      {shared.type === 'tiktok' && (
        <div className={`pt-clip-status ${clip.state}`}>
          {shared.short && 'อ่านลิงก์สั้นไม่ได้'}
          {!shared.short && clip.state === 'loading' && 'กำลังโหลดคลิป…'}
          {!shared.short && clip.state === 'ok' && <><Icon name="check" size={14} stroke={2.4} className="pt-inline-icon" /> พบคลิป</>}
          {!shared.short && clip.state === 'fail' && 'เปิดคลิปไม่ได้'}
        </div>
      )}
      {shared.type === 'tiktok' && shared.videoId && clip.state === 'ok' && showEmbed && (
        <iframe className="pt-embed tiktok" src={tiktokPlayer(shared.videoId)} title="TikTok" allow="encrypted-media; fullscreen" />
      )}
      {shared.type === 'instagram' && shared.code && showEmbed && (
        <iframe className="pt-embed ig" src={instagramEmbed(shared.igKind, shared.code)} title="Instagram" />
      )}
      {shared.type === 'maps' && !shared.place && (
        <div className="pt-clip-status fail">อ่านลิงก์สั้นไม่ได้</div>
      )}
      {shared.caption && (
        <div className="pt-caption">“{shared.caption}”</div>
      )}
    </div>
  );
}
