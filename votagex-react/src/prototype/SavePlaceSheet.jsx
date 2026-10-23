import { useEffect, useMemo, useState } from 'react';
import { useProto } from './useProto';
import { Sheet, CatIcon, Chip } from './ui';
import Icon, { Flag, SourceBadge } from './icons';
import MapView from './MapView';
import { PLACE_CATS, SOURCES, distanceKm } from './data';
import { parseShared, usePlaceSearch, checkTikTok, tiktokPlayer, instagramEmbed } from './placeSearch';

// Demo inputs. The TikTok sample uses TikTok's own documented example clip so the embed really loads.
const SAMPLES = [
  { label: 'แชร์จาก TikTok', text: 'ร้านลับในซอยเก่า กาแฟดี วิวสตรีทอาร์ต ☕️ 📍ตลาดน้อย #คาเฟ่กรุงเทพ #ตลาดน้อย https://www.tiktok.com/@scout2015/video/6718335390845095173' },
  { label: 'แชร์จาก IG', text: 'ทะเลน้ำใสใกล้กรุงเทพ 🏝️ 📍หาดตาแหวน #เกาะล้าน #เที่ยวชลบุรี https://www.instagram.com/reel/C0ffee12345/' },
  { label: 'ลิงก์ Google Maps', text: 'https://www.google.com/maps/place/Wat+Arun/@13.7437,100.4888,17z' },
];

export default function SavePlaceSheet({ onClose }) {
  const { places, actions, showToast, openSheet } = useProto();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(null);
  const [cat, setCat] = useState('sight');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('want');

  const shared = useMemo(() => parseShared(text), [text]);

  // New input: reset the pick and seed the search from the caption
  const applyText = (t) => {
    const s = parseShared(t);
    setText(t);
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

  const duplicate = picked && places.find((p) => distanceKm(p, picked) < 0.08);

  const source = shared && ['tiktok', 'instagram', 'maps'].includes(shared.type)
    ? { type: shared.type, url: shared.url, author: shared.author || '' }
    : { type: 'manual' };

  const save = (thenAddToPlan, close) => {
    const id = actions.addPlace({
      name: picked.name, area: picked.area, prov: picked.prov, country: picked.country || 'TH',
      lat: picked.lat, lng: picked.lng, cat, status, source, note: note || shared?.caption?.slice(0, 80) || '',
    });
    showToast(status === 'want' ? `บันทึก “${picked.name}” ลงที่อยากไปแล้ว` : `บันทึก “${picked.name}” ว่าเคยไปแล้ว`);
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
    <Sheet title="บันทึกสถานที่" onClose={onClose} tall
      footer={picked ? (close) => (
        <div className="pt-foot-row">
          <button className="pt-btn light" onClick={() => save(true, close)}>บันทึก + เพิ่มลงแผน</button>
          <button className="pt-btn" onClick={() => save(false, close)}>บันทึก</button>
        </div>
      ) : null}
    >
      {/* 1. paste */}
      <div className="pt-paste">
        <textarea
          className="pt-input pt-textarea"
          rows={2}
          placeholder="วางลิงก์ หรือพิมพ์ชื่อสถานที่"
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

      {/* 4. confirm */}
      {picked && (
        <div className="pt-field">
          <div className="pt-picked">
            <MapView className="pt-map-mini" points={[{ id: 'x', lat: picked.lat, lng: picked.lng, cat }]} interactive={false} />
            <div className="pt-picked-row">
              <CatIcon cat={cat} size={40} />
              <div className="pt-grow">
                <div className="pt-strong">{picked.name}</div>
                <div className="pt-muted">{picked.area}{picked.country && picked.country !== 'TH' && <> · <Flag code={picked.country} /></>}</div>
              </div>
              {picked.key !== 'maps' && <button className="pt-chip" onClick={() => setPicked(null)}>เปลี่ยน</button>}
            </div>
          </div>
          {duplicate && <div className="pt-clip-status fail">บันทึกไว้แล้ว</div>}
          <div className="pt-label">หมวด</div>
          <div className="pt-chip-row wrap">
            {Object.entries(PLACE_CATS).map(([k, c]) => <Chip key={k} active={cat === k} color={c.color} onClick={() => setCat(k)}>{c.label}</Chip>)}
          </div>
          <div className="pt-label">สถานะ</div>
          <div className="pt-chip-row">
            <Chip active={status === 'want'} onClick={() => setStatus('want')}>อยากไป</Chip>
            <Chip active={status === 'visited'} onClick={() => setStatus('visited')}>เคยไปแล้ว</Chip>
          </div>
          <input className="pt-input" placeholder="โน้ต" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      )}
    </Sheet>
  );
}

export function ResultList({ search, onPick }) {
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
          <Icon name="plus" size={18} />
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
