import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { perforated, seeded, useStamps } from './stamps';
import { thaiShort } from './data';

// The stamp book: a postage stamp for each province and country you've been to (stamps.js). On the plans
// page a strip of the latest stamps opens it; in it each region is a page with a space for every province,
// the stamps you've collected pressed into theirs one after another, each with a postmark struck over its
// corner. A stamp opens large, tilting under the finger as paper would in the light.
//
// The stamps are made to read as printed paper, not drawings: fibrous off-white stock with close
// perforations, the photo printed (a little muted, a halftone screen over it, a keyline round it), a band of
// printer's ink with the name, the country and a value like a real issue, and a postmark of uneven ink.

const W = 148; const H = 184; // a stamp's own size; others are this scaled
// printer's inks, one per stamp by its name: duller than the app's colours, as inks on paper are
const INKS = ['#B5412F', '#1F3D6E', '#2D6A4F', '#B07A1E', '#5A3F8C', '#1E6C78', '#8C2F55'];
const graphemes = (s) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(s)].length;

// the shared ink filter: a postmark's lines broken where the ink didn't take, and a little wobbly; wherever
// stamps are drawn (the recap film too)
export function InkDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <filter id="pt-ink" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.4" xChannelSelector="R" yChannelSelector="G" result="wobbly" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="took" />
        <feComposite in="wobbly" in2="took" operator="in" />
      </filter>
    </svg>
  );
}

// a stamp with no photo: a printed sun and bands in its ink on the paper
function Pattern({ ink }) {
  return (
    <svg className="pt-stamp-photo" viewBox="0 0 130 124" preserveAspectRatio="xMidYMid slice">
      <rect width="130" height="124" fill="#F1E8D6" />
      {Array.from({ length: 18 }, (_, k) => (
        <path key={k} d={`M70,56 L${70 + Math.cos((k / 18) * Math.PI * 2) * 120},${56 + Math.sin((k / 18) * Math.PI * 2) * 120}`} stroke={ink} strokeWidth="5" opacity=".14" />
      ))}
      <circle cx="70" cy="56" r="26" fill={ink} opacity=".85" />
      <circle cx="70" cy="56" r="34" fill="none" stroke={ink} strokeWidth="1.5" strokeDasharray="2 3" />
      {[0, 1, 2].map((i) => <rect key={i} x="0" y={92 + i * 11} width="130" height="5" fill={ink} opacity={0.3 + i * 0.25} />)}
    </svg>
  );
}

// a cancellation: a double ring with the place and date, and wavy lines running off it, in uneven ink (over a
// stamp's corner, or struck across a postcard's: Postcard)
export function Postmark({ stamp, id, className = 'pt-postmark', style }) {
  const d = new Date(`${stamp.date}T00:00:00`);
  const date = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(stamp.year).slice(2)}`;
  return (
    <svg className={className} viewBox="0 0 108 60" aria-hidden="true" style={style}>
      <defs><path id={id} d="M30,30 m-21,0 a21,21 0 1,1 42,0 a21,21 0 1,1 -42,0" /></defs>
      <g filter="url(#pt-ink)">
        <circle cx="30" cy="30" r="26" /><circle cx="30" cy="30" r="16" />
        <text className="ring"><textPath href={`#${id}`} startOffset="2%">{`${stamp.en.toUpperCase()} · VOTAGEX`}</textPath></text>
        <text className="mid" x="30" y="33" textAnchor="middle">{date}</text>
        {[22, 30, 38].map((y) => <path key={y} d={`M57,${y} q6,-4 12,0 t12,0 t12,0 t12,0`} />)}
      </g>
    </svg>
  );
}

// a stamp, `w` wide; `press` presses it in (CSS), or a film moves it frame by frame through `style` (its
// shadow) and `markStyle` (its postmark)
export function Stamp({ stamp, w = W, i = 0, press = false, mark = true, style, markStyle }) {
  const h = (w * H) / W;
  const path = useMemo(() => perforated(w, h, (3.3 * w) / W, (10.6 * w) / W), [w, h]);
  const ink = INKS[Math.floor(seeded(stamp.key, 1) * INKS.length)];
  const rot = (seeded(stamp.key) - 0.5) * 8;
  return (
    <div className={`pt-stamp${press ? ' press' : ''}`} style={{ width: w, height: h, fontSize: w / 14.8, '--rot': `${rot.toFixed(1)}deg`, '--i': i, '--ink': ink,
      '--prot': `${(-20 + seeded(stamp.key, 3) * 24).toFixed(1)}deg`, ...style }}>
      <div className="pt-stamp-paper" style={{ clipPath: `path('${path}')` }}>
        <div className="pt-stamp-print">
          <div className="pt-stamp-art">
            {stamp.photo ? <img className="pt-stamp-photo" src={stamp.photo} alt="" draggable="false" /> : <Pattern ink={ink} />}
            <span className="pt-stamp-country">{stamp.kind === 'country' ? stamp.en : 'Thailand'}</span>
            <span className="pt-stamp-value"><b>{String(stamp.no).padStart(2, '0')}</b>{stamp.kind === 'prov' ? '/77' : ''}</span>
          </div>
          <div className="pt-stamp-band">
            <b style={{ fontSize: `${Math.min(1.6, 14 / graphemes(stamp.name)).toFixed(2)}em` }}>{stamp.name}</b>
            <span>{stamp.kind === 'prov' ? stamp.en : ''}{stamp.kind === 'prov' ? ' · ' : ''}{stamp.year}</span>
          </div>
        </div>
      </div>
      {mark && <Postmark stamp={stamp} id={`pm-${stamp.key}-${Math.round(w)}`} style={markStyle} />}
    </div>
  );
}

// an empty space in the book for a province not yet been to
function Space({ name, note }) {
  return (
    <div className={`pt-stamp-space${note ? ' soon' : ''}`}>
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
      <InkDefs />
      <span className="pt-stampstrip-text">
        <span className="pt-strong">สมุดแสตมป์ <Icon name="next" size={16} /></span>
        <span className="pt-stampstrip-count"><b>{provinces.length}</b>/77</span>
        <span className="pt-muted sm">จังหวัด{countries.length ? ` · ${countries.length} ประเทศ` : ''}</span>
      </span>
      <span className="pt-stampstrip-pile">
        {latest.map((s, i) => <span key={s.key} style={{ top: `${(seeded(s.key, 5) - 0.5) * 14}px` }}><Stamp stamp={s} w={70} i={i} press /></span>)}
      </span>
    </button>
  );
}

// the book, over everything: the count, then a page per region with a space for each province, then abroad
export function StampBook({ onClose }) {
  const { provinces, countries, regions, soon } = useStamps();
  const [open, setOpen] = useState(null); // { stamp, from: DOMRect }
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !open) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const pick = (stamp) => (e) => setOpen({ stamp, from: e.currentTarget.getBoundingClientRect() });
  const newest = [...provinces, ...countries].sort((a, b) => b.date.localeCompare(a.date))[0];
  // stamps press in in the order they appear down the book (after the newest, up top)
  const order = new Map([...regions.flatMap((r) => r.stamps), ...countries].map((s, k) => [s.key, k + 1]));
  const slot = (s) => (
    <button key={s.key} className="pt-book-slot" onClick={pick(s)} aria-label={s.name}>
      <Stamp stamp={s} w={100} i={order.get(s.key)} press />
    </button>
  );
  return createPortal(
    <div className="pt-book" role="dialog" aria-label="สมุดแสตมป์">
      <InkDefs />
      <div className="pt-book-head">
        <button className="pt-round-btn" aria-label="ปิด" onClick={onClose}><Icon name="close" size={20} /></button>
        <span className="pt-book-title">สมุดแสตมป์</span>
        <span style={{ width: 40 }} />
      </div>
      <div className="pt-scroll pt-book-scroll">
        <div className="pt-book-hero">
          <div className="pt-book-count">
            <div><b>{provinces.length}</b><span>/77</span></div>
            <div className="pt-book-sub">จังหวัด{countries.length ? ` · ${countries.length} ประเทศ` : ''}</div>
            <div className="pt-book-bar"><i style={{ width: `${(provinces.length / 77) * 100}%` }} /></div>
          </div>
          {newest && <button className="pt-book-newest" onClick={pick(newest)} aria-label={newest.name}><Stamp stamp={newest} w={124} press /></button>}
        </div>
        {regions.map((r) => (
          <section key={r.key} className="pt-book-region">
            <div className="pt-book-label"><span>{r.name}</span><span className="pt-muted">{r.stamps.length}/{r.total}</span></div>
            <div className="pt-book-grid">
              {r.stamps.map(slot)}
              {r.missing.map((m) => <Space key={m.name} name={m.name} />)}
            </div>
          </section>
        ))}
        {(countries.length > 0 || soon.length > 0) && (
          <section className="pt-book-region">
            <div className="pt-book-label"><span>ต่างประเทศ</span><span className="pt-muted">{countries.length}</span></div>
            <div className="pt-book-grid">
              {countries.map(slot)}
              {soon.map((c) => <Space key={c.code} name={c.name} note={`อีก ${c.days} วัน`} />)}
            </div>
          </section>
        )}
      </div>
      {open && <StampView {...open} onClose={() => setOpen(null)} onLeave={onClose} />}
    </div>,
    document.body,
  );
}

// one stamp, large: it lifts from where it was tapped and tilts under the finger, the light on its paper
// moving with it
function StampView({ stamp, from, onClose, onLeave }) {
  const navigate = useNavigate();
  const stage = useRef(null);
  const [leaving, setLeaving] = useState(false);
  useLayoutEffect(() => {
    const el = stage.current; const to = el.getBoundingClientRect();
    el.animate([
      { transform: `translate(${from.left + from.width / 2 - (to.left + to.width / 2)}px, ${from.top + from.height / 2 - (to.top + to.height / 2)}px) scale(${from.width / to.width})` },
      { transform: 'none' },
    ], { duration: 520, easing: 'cubic-bezier(.2, 1.1, .35, 1)' });
  }, [from]);
  const tilt = (e) => {
    const r = stage.current.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    stage.current.style.setProperty('--tx', x.toFixed(3));
    stage.current.style.setProperty('--ty', y.toFixed(3));
  };
  const close = () => { setLeaving(true); setTimeout(onClose, 200); };
  return (
    <div className={`pt-stampview${leaving ? ' leaving' : ''}`} onPointerMove={tilt} onPointerDown={tilt} onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="pt-stampview-head">
        <button className="pt-round-btn" aria-label="ปิด" onClick={close}><Icon name="close" size={20} /></button>
      </div>
      <div className="pt-stampview-stage" ref={stage}>
        <Stamp stamp={stamp} w={Math.min(250, window.innerWidth - 130)} />
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
