import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { perforated, seeded, useStamps } from './stamps';
import { strike } from './stampShader';
import { thaiShort } from './data';

// The stamp book: a postage stamp for each province and country you've been to (stamps.js). On the plans
// page a strip of the latest stamps opens it; in it the stamps are pressed in one after another, each with a
// postmark struck over its corner, and the provinces still to go wait as empty outlines. A stamp opens on a
// dark ground and turns to black metal (stampShader), lit by the finger.

const W = 148; const H = 184; // a stamp's own size; others are this scaled
const PALETTE = ['#FF6B2C', '#2F7BF5', '#8B5CF6', '#EC5FA0', '#22B07D', '#F6C531'];
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s)].length;

// a stamp with no photo: rings and bands in two of the palette's colours, picked by its name
function Pattern({ stamp }) {
  const a = PALETTE[Math.floor(seeded(stamp.key, 1) * PALETTE.length)];
  const b = PALETTE[(PALETTE.indexOf(a) + 2 + Math.floor(seeded(stamp.key, 2) * 3)) % PALETTE.length];
  return (
    <svg className="pt-stamp-photo" viewBox="0 0 130 135" preserveAspectRatio="xMidYMid slice">
      <rect width="130" height="135" fill={a} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x="0" y={78 + i * 12} width="130" height="6" fill={b} opacity={0.35 + i * 0.12} />)}
      <circle cx="84" cy="56" r="30" fill="#FFF6E8" />
      <circle cx="84" cy="56" r="30" fill="none" stroke={b} strokeWidth="5" strokeDasharray="3 5" />
    </svg>
  );
}

// a cancellation mark: a double ring with the place and date, and wavy lines running off it
function Postmark({ stamp, id }) {
  const d = new Date(`${stamp.date}T00:00:00`);
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(stamp.year).slice(2)}`;
  return (
    <svg className="pt-postmark" viewBox="0 0 120 60" aria-hidden="true">
      <defs><path id={id} d="M30,30 m-21,0 a21,21 0 1,1 42,0 a21,21 0 1,1 -42,0" /></defs>
      <circle cx="30" cy="30" r="26" /><circle cx="30" cy="30" r="16" />
      <text className="ring"><textPath href={`#${id}`} startOffset="2%">{`${stamp.en.toUpperCase()} · VOTAGEX`}</textPath></text>
      <text className="mid" x="30" y="33" textAnchor="middle">{date}</text>
      {[22, 30, 38].map((y) => <path key={y} d={`M57,${y} q6,-4 12,0 t12,0 t12,0`} />)}
    </svg>
  );
}

// a stamp, `w` wide: its photo (or pattern) in a white perforated frame, its names, number and year
export function Stamp({ stamp, w = W, i = 0, press = false }) {
  const h = (w * H) / W;
  const path = useMemo(() => perforated(w, h, (4 * w) / W, (13 * w) / W), [w, h]);
  const rot = (seeded(stamp.key) - 0.5) * 12;
  return (
    <div className={`pt-stamp${press ? ' press' : ''}`} style={{ width: w, height: h, fontSize: w / 14.8, '--rot': `${rot.toFixed(1)}deg`, '--i': i, '--prot': `${(-18 + seeded(stamp.key, 3) * 22).toFixed(1)}deg` }}>
      <div className="pt-stamp-paper" style={{ clipPath: `path('${path}')` }}>
        <div className="pt-stamp-art">
          {stamp.photo ? <img className="pt-stamp-photo" src={stamp.photo} alt="" draggable="false" /> : <Pattern stamp={stamp} />}
          <span className="pt-stamp-en">{stamp.en}</span>
          <span className="pt-stamp-no">No.{String(stamp.no).padStart(2, '0')}</span>
        </div>
        <div className="pt-stamp-foot"><b style={{ fontSize: `${Math.min(1.7, 15 / graphemes(stamp.name)).toFixed(2)}em` }}>{stamp.name}</b><span>{stamp.year}</span></div>
      </div>
      <Postmark stamp={stamp} id={`pm-${stamp.key}-${Math.round(w)}`} />
    </div>
  );
}

// a province not yet been to: the perforated outline, dashed, with its name
function Missing({ name, w = 72, note }) {
  const h = (w * H) / W;
  const path = useMemo(() => perforated(w - 2, h - 2, (4 * w) / W, (13 * w) / W), [w, h]);
  return (
    <div className={`pt-stamp-missing${note ? ' soon' : ''}`} style={{ width: w, height: h }}>
      <svg width={w} height={h}><path d={path} transform="translate(1 1)" /></svg>
      <span>{name}</span>
      {note && <em>{note}</em>}
    </div>
  );
}

// on the plans page ("ผ่านมาแล้ว"): the book's count and its latest stamps, pressed in as it shows
export function StampStrip({ onOpen }) {
  const { provinces, countries } = useStamps();
  const latest = [...provinces, ...countries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).reverse();
  return (
    <button className="pt-stampstrip" onClick={onOpen}>
      <span className="pt-stampstrip-text">
        <span className="pt-strong">สมุดแสตมป์ <Icon name="next" size={16} /></span>
        <span className="pt-stampstrip-count"><b>{provinces.length}</b>/77</span>
        <span className="pt-muted sm">จังหวัด{countries.length ? ` · ${countries.length} ประเทศ` : ''}</span>
      </span>
      <span className="pt-stampstrip-pile">
        {latest.map((s, i) => <span key={s.key} style={{ left: `${i * 24}%`, top: `${(seeded(s.key, 5) - 0.5) * 14}px` }}><Stamp stamp={s} w={70} i={i} press /></span>)}
      </span>
    </button>
  );
}

// the book, over everything: the count, the stamps collected, the provinces still to go, abroad
export function StampBook({ onClose }) {
  const { provinces, countries, missing, soon } = useStamps();
  const [open, setOpen] = useState(null); // { stamp, from: DOMRect }
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const pick = (stamp) => (e) => setOpen({ stamp, from: e.currentTarget.getBoundingClientRect() });
  const page = (list, offset = 0) => (
    <div className="pt-book-page">
      {list.map((s, i) => (
        <button key={s.key} className="pt-book-slot" onClick={pick(s)} aria-label={s.name}
          style={{ translate: `${((seeded(s.key, 7) - 0.5) * 18).toFixed(0)}px ${((seeded(s.key, 8) - 0.5) * 16).toFixed(0)}px` }}>
          <Stamp stamp={s} w={136} i={i + offset} press />
        </button>
      ))}
    </div>
  );
  return createPortal(
    <div className="pt-book" role="dialog" aria-label="สมุดแสตมป์">
      <div className="pt-book-head">
        <button className="pt-round-btn" aria-label="ปิด" onClick={onClose}><Icon name="close" size={20} /></button>
        <span className="pt-book-title">สมุดแสตมป์</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="pt-scroll pt-book-scroll">
        <div className="pt-book-hero">
          <b>{provinces.length}</b><span>/77</span>
          <div>จังหวัดที่ไปมาแล้ว{countries.length ? <><br />และอีก {countries.length} ประเทศ</> : null}</div>
        </div>
        {page(provinces)}
        {countries.length > 0 && <><div className="pt-book-label">ต่างประเทศ</div>{page(countries, provinces.length)}</>}
        {soon.length > 0 && (
          <>
            <div className="pt-book-label">รอปั๊ม</div>
            <div className="pt-book-missing">{soon.map((c) => <Missing key={c.code} name={c.name} w={96} note={`อีก ${c.days} วัน`} />)}</div>
          </>
        )}
        <div className="pt-book-label">ยังไม่ได้ไป · {missing.length}</div>
        <div className="pt-book-missing">{missing.map((m) => <Missing key={m.name} name={m.name} />)}</div>
      </div>
      {open && <StampView {...open} onClose={() => setOpen(null)} onLeave={onClose} />}
    </div>,
    document.body,
  );
}

// one stamp on a dark ground: it flies up from where it was tapped as paper, then turns to black metal
function StampView({ stamp, from, onClose, onLeave }) {
  const navigate = useNavigate();
  const stage = useRef(null);
  const canvas = useRef(null);
  const light = useRef(null);
  const [struck, setStruck] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useLayoutEffect(() => {
    const el = stage.current; const to = el.getBoundingClientRect();
    const k = from.width / to.width;
    el.animate([
      { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${k}) rotate(${(seeded(stamp.key) - 0.5) * 12}deg)` },
      { transform: 'none' },
    ], { duration: 560, easing: 'cubic-bezier(.2, 1.15, .35, 1)' });
  }, [from, stamp.key]);
  useEffect(() => {
    const s = strike(canvas.current, stamp);
    light.current = s;
    let live = true;
    // the metal strikes once the stamp has landed (and its relief is worked out)
    Promise.all([s.ready, new Promise((ok) => { setTimeout(ok, 620); })]).then(() => live && setStruck(true)).catch(() => {});
    return () => { live = false; s.stop(); };
  }, [stamp]);
  const move = (e) => {
    const r = canvas.current.getBoundingClientRect();
    light.current?.setLight((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  };
  const close = () => { setLeaving(true); setTimeout(onClose, 200); };
  return (
    <div className={`pt-stampview${leaving ? ' leaving' : ''}`} onPointerMove={move} onPointerDown={move}>
      <div className="pt-stampview-head">
        <button className="pt-round-btn dark" aria-label="ปิด" onClick={close}><Icon name="back" size={20} /></button>
      </div>
      <div className={`pt-stampview-stage${struck ? ' struck' : ''}`} ref={stage}>
        <Stamp stamp={stamp} w={Math.min(280, window.innerWidth - 110)} />
        <canvas ref={canvas} className="pt-stampview-metal" />
      </div>
      <div className="pt-stampview-info">
        <div className="pt-stampview-en">{stamp.en} · No.{String(stamp.no).padStart(2, '0')}</div>
        <div className="pt-stampview-name">{stamp.name}</div>
        <div className="pt-stampview-when">{thaiShort(stamp.date)} {stamp.year}</div>
        {stamp.planId && (
          <button className="pt-stampview-trip" onClick={() => { onLeave(); navigate(`/proto/plan/${stamp.planId}`); }}>
            {stamp.from[0]} <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
