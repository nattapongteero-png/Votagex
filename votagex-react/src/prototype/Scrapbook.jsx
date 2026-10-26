import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { PEOPLE, EXPENSE_CATS, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

// A past trip as an artist's travel sketchbook. Its pages stand in a row like cards in a box: one large in the
// middle, the rest turned nearly edge-on either side, going back into the dark. Drag sideways (it follows your
// finger, carries on a little when flicked, settles on a page) or tap a page at the side to bring it forward.
// Inside, each photo is redone as a watercolour with pencil lines on rough paper, the real photo taped in the
// corner for reference and its colours dabbed out underneath; the route is an ink sketch; the people are pencil
// portraits; the spend is the receipt kept between the pages.

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const year = (d) => parseISO(d).getFullYear() + 543;
const FALLBACK = ['#C9B79C', '#8E9A86', '#5F7470', '#B9886B', '#2F3B4C'];

// a photo's five main colours, for the swatches an artist dabs beside a painting
function useSwatches(src) {
  const [cols, setCols] = useState(FALLBACK);
  useEffect(() => {
    if (!src) return undefined;
    let live = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas'); c.width = 24; c.height = 24;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, 24, 24);
        const px = g.getImageData(0, 0, 24, 24).data;
        const all = [];
        for (let i = 0; i < px.length; i += 4) all.push([px[i], px[i + 1], px[i + 2]]);
        all.sort((a, b) => (a[0] * 3 + a[1] * 6 + a[2]) - (b[0] * 3 + b[1] * 6 + b[2]));
        const pick = [0.1, 0.3, 0.5, 0.7, 0.9].map((q) => all[Math.floor(q * (all.length - 1))]);
        if (live) setCols(pick.map(([r, gg, b]) => `rgb(${r},${gg},${b})`));
      } catch { /* a photo from elsewhere without CORS: keep the default colours */ }
    };
    img.src = src;
    return () => { live = false; };
  }, [src]);
  return cols;
}

// the photo as a watercolour: edges shaken loose, colours pooled, pencil lines drawn over, on deckled paper
function Watercolor({ src, id }) {
  return (
    <svg className="jr-wc" viewBox="0 0 300 330" preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={`wc${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed={id + 2} result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="14" xChannelSelector="R" yChannelSelector="G" result="shaken" />
          <feGaussianBlur in="shaken" stdDeviation="1.2" result="soft" />
          <feComponentTransfer in="soft" result="pooled">
            <feFuncR type="discrete" tableValues="0.4 0.56 0.7 0.82 0.92 0.98" />
            <feFuncG type="discrete" tableValues="0.4 0.56 0.7 0.82 0.92 0.98" />
            <feFuncB type="discrete" tableValues="0.42 0.58 0.72 0.84 0.93 0.98" />
          </feComponentTransfer>
          <feColorMatrix in="pooled" type="saturate" values="1.15" result="pooled" />
          <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="grey" />
          <feConvolveMatrix in="grey" order="3" kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1" result="edges" />
          <feColorMatrix in="edges" type="matrix" values="-3.2 0 0 0 1  -3.2 0 0 0 1  -3.2 0 0 0 1  0 0 0 1 0" result="pencil" />
          <feBlend in="pooled" in2="pencil" mode="multiply" result="painted" />
          <feComponentTransfer in="painted"><feFuncA type="table" tableValues="0 0.92" /></feComponentTransfer>
        </filter>
        <filter id={`deckle${id}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed={id + 9} />
          <feDisplacementMap in="SourceGraphic" scale="12" />
        </filter>
        <mask id={`m${id}`}><rect x="14" y="14" width="272" height="302" rx="6" fill="#fff" filter={`url(#deckle${id})`} /></mask>
      </defs>
      <g mask={`url(#m${id})`}>
        <image href={src} x="6" y="6" width="288" height="318" preserveAspectRatio="xMidYMid slice" filter={`url(#wc${id})`} />
      </g>
    </svg>
  );
}

/* ---------------- pages ---------------- */

function Cover({ d }) {
  return (
    <div className="jr-page jr-cover">
      <i className="jr-band" />
      <span className="jr-label">
        <small>SKETCHBOOK · {d.dateCode}</small>
        <b>{d.title}</b>
      </span>
      <span className="jr-cover-foot">{d.label}</span>
    </div>
  );
}

function Crew({ d }) {
  return (
    <div className="jr-page jr-paper">
      <span className="jr-cap">{d.dateLong}</span>
      <h3 className="jr-h">{d.title}</h3>
      <div className="jr-faces">
        {d.crew.map((c) => <span key={c.id}><img src={c.avatar} alt="" /><em>{c.name}</em></span>)}
      </div>
      <div className="jr-tally">
        <span><b>{d.stats.days}</b>วัน</span><span><b>{d.stats.stops}</b>ที่</span><span><b>{d.stats.photos}</b>ภาพ</span><span><b>{d.stats.km.toFixed(1)}</b>กม.</span>
      </div>
    </div>
  );
}

function Route({ d }) {
  const box = { x: 40, y: 30, w: 220, h: 170 };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 22 : -22)},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? -16 : 16)} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  const wash = ['#D98E73', '#7FA7B5', '#C9A24E', '#8EA77C', '#B48AA8'];
  return (
    <div className="jr-page jr-paper">
      <span className="jr-cap">เส้นทาง · ~{d.stats.km.toFixed(1)} กม.</span>
      <svg className="jr-route" viewBox="0 0 300 230">
        <defs><filter id="ink"><feTurbulence baseFrequency="0.9" numOctaves="1" seed="3" /><feDisplacementMap in="SourceGraphic" scale="1.6" /></filter></defs>
        {pts.map((p, i) => <circle key={`w${i}`} cx={p.x + 4} cy={p.y + 3} r="17" fill={wash[i % wash.length]} opacity=".45" />)}
        <path d={path} fill="none" stroke="#2B2A28" strokeWidth="1.3" strokeLinecap="round" filter="url(#ink)" />
        <path d={path} fill="none" stroke="#2B2A28" strokeWidth=".6" strokeLinecap="round" opacity=".5" transform="translate(1.5 1)" />
        {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="3" fill="#2B2A28" /><text x={p.x + 8} y={p.y - 6} className="jr-route-n">{i + 1}</text></g>)}
      </svg>
      <ol className="jr-stops">
        {d.stops.slice(0, 6).map((s) => <li key={s.id}><span>{s.name}</span><em>{s.time}</em></li>)}
      </ol>
    </div>
  );
}

function PhotoPage({ p, i }) {
  const cols = useSwatches(p.src);
  return (
    <div className="jr-page jr-paper">
      <Watercolor src={p.src} id={i} />
      <span className="jr-ref" style={{ transform: `rotate(${i % 2 ? 6 : -5}deg)` }}><i style={{ backgroundImage: `url(${p.src})` }} /></span>
      <div className="jr-swatches">{cols.map((c, k) => <i key={k} style={{ background: c }} />)}</div>
      <p className="jr-note">{p.text}</p>
      <span className="jr-cap foot">{p.by} · {p.date}</span>
    </div>
  );
}

function Spend({ d }) {
  return (
    <div className="jr-page jr-paper">
      <span className="jr-cap">ค่าใช้จ่าย</span>
      <div className="jr-receipt">
        <small>RECEIPT · {d.dateCode}</small>
        {d.spend.cats.map((c) => <span key={c.label}><em>{c.label}</em><b>{baht(c.amount)}</b></span>)}
        {!d.spend.cats.length && <span><em>ไม่ได้จดไว้</em></span>}
        <span className="sum"><em>รวม</em><b>{baht(d.spend.total)}</b></span>
      </div>
      <h3 className="jr-h big">{baht(d.spend.total)}</h3>
      {d.spend.total > 0 && <span className="jr-cap" style={{ top: 360 }}>คนละ ~{baht(d.spend.total / Math.max(1, d.crew.length))}</span>}
    </div>
  );
}

function End({ d }) {
  return (
    <div className="jr-page jr-paper jr-endpage">
      <i className="jr-wash" />
      <h3 className="jr-h">ไว้ไปด้วยกัน<br />อีกนะ</h3>
      <span className="jr-cap">{d.crew.map((c) => c.name).join(' · ')}</span>
    </div>
  );
}

/* ---------------- the row of pages ---------------- */

// where a page sits for its distance from the one in front (rel, fractional while moving): the front page flat
// and large, the next ones turned nearly edge-on and packed tight, further back the further they are
function pose(rel, w) {
  const a = Math.abs(rel); const s = Math.sign(rel);
  const near = Math.min(a, 1); const far = Math.max(0, a - 1);
  return {
    x: s * (near * (w * 0.5 + 8) + far * 16),
    z: -(near * 90 + far * 12),
    r: -s * near * 70,
    sc: 1 - near * 0.08,
    o: a > 9 ? 0 : 1,
    dim: Math.min(0.6, near * 0.28 + far * 0.04),
  };
}

export default function Scrapbook({ plan, memories, expenses, label, onClose }) {
  const navigate = useNavigate();
  const d = useMemo(() => {
    const stops = plan.stops.filter((s) => s.date && s.lat != null && !s.skip).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
    const photos = memories.filter((m) => m.photos?.length)
      .flatMap((m) => m.photos.map((src) => ({ src, text: m.text || '', by: PEOPLE[m.by]?.name, date: `${thaiShort(m.date)} ${year(m.date)}` })));
    const total = expenses.reduce((t, e) => t + toTHB(e), 0);
    const cats = Object.entries(expenses.reduce((o, e) => ({ ...o, [e.cat]: (o[e.cat] || 0) + toTHB(e) }), {}))
      .sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ label: EXPENSE_CATS[cat]?.label || cat, amount }));
    const start = parseISO(plan.startDate);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      title: plan.name, label,
      dateCode: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${String(start.getFullYear() + 543).slice(2)}`,
      dateLong: `วัน${DAYS[start.getDay()]}ที่ ${thaiShort(plan.startDate)} ${year(plan.startDate)}`,
      crew: plan.members.map((id) => ({ id, name: PEOPLE[id]?.name, avatar: PEOPLE[id]?.avatar })).filter((c) => c.avatar),
      stops, photos, spend: { total, cats },
      stats: { days: plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1, stops: stops.length, photos: photos.length, km: stops.reduce((t, s, i) => (i ? t + distanceKm(stops[i - 1], s) : 0), 0) },
    };
  }, [plan, memories, expenses, label]);

  const pages = useMemo(() => [
    <Cover key="cover" d={d} />,
    <Crew key="crew" d={d} />,
    d.stops.length > 0 && <Route key="route" d={d} />,
    ...d.photos.map((p, i) => <PhotoPage key={`p${i}`} p={p} i={i} />),
    <Spend key="spend" d={d} />,
    <End key="end" d={d} />,
  ].filter(Boolean), [d]);
  const n = pages.length;

  const [w] = useState(() => Math.min(300, Math.round(Math.min(430, window.innerWidth) * 0.74)));
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const drag = useRef(null);
  const anim = useRef(0);
  useEffect(() => () => cancelAnimationFrame(anim.current), []);
  const set = (v) => { posRef.current = v; setPos(v); };
  const glide = (to) => {
    cancelAnimationFrame(anim.current);
    const from = posRef.current; const t0 = performance.now(); const dur = 320 + 200 * Math.min(3, Math.abs(to - from));
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      set(from + (to - from) * (1 - (1 - k) ** 3));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  };
  const go = (to) => glide(Math.max(0, Math.min(n - 1, to)));
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(Math.round(posRef.current) + 1);
      if (e.key === 'ArrowLeft') go(Math.round(posRef.current) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const down = (e) => {
    cancelAnimationFrame(anim.current);
    drag.current = { x: e.clientX, pos: posRef.current, moved: 0, v: 0, last: e.clientX, t: performance.now() };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const g = drag.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    g.moved = Math.max(g.moved, Math.abs(dx));
    const now = performance.now();
    g.v = (e.clientX - g.last) / Math.max(1, now - g.t); g.last = e.clientX; g.t = now;
    if (g.moved > 5) set(Math.max(-0.3, Math.min(n - 0.7, g.pos - dx / (w * 0.55))));
  };
  const up = (e) => {
    const g = drag.current;
    drag.current = null;
    if (!g) return;
    if (g.moved <= 5) { // a tap: a page at the side comes forward
      const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-i]');
      go(el ? Number(el.dataset.i) : Math.round(posRef.current));
      return;
    }
    // one page per drag (more if dragged further), and a quick flick always moves on at least one
    const delta = posRef.current - g.pos;
    const steps = Math.abs(delta) < 0.12 ? 0 : Math.max(1, Math.round(Math.abs(delta)));
    go(Math.round(g.pos) + Math.sign(delta) * steps);
  };

  const at = Math.round(pos);
  return createPortal(
    <div className="jr" role="dialog" aria-label={`สมุดสเก็ตช์ ${plan.name}`}>
      <header className="jr-head">
        <button className="jr-icon" aria-label="ปิด" onClick={onClose}><Icon name="close" size={18} /></button>
        <span className="jr-title"><b>{plan.name}</b><small>{n} หน้า · {label}</small></span>
        <button className="jr-icon" aria-label="เปิดแผนทริป" onClick={() => { onClose(); navigate(`/proto/plan/${plan.id}`); }}><Icon name="map" size={18} /></button>
      </header>
      <div className="jr-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; go(Math.round(posRef.current)); }}>
        <div className="jr-world">
          {pages.map((el, i) => {
            const p = pose(i - pos, w);
            const h = Math.round(w * 1.38);
            return (
              <div key={i} data-i={i} className="jr-card" style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2,
                transform: `translate3d(${p.x}px, 0, ${p.z}px) rotateY(${p.r}deg) scale(${p.sc})`, zIndex: 100 - Math.round(Math.abs(i - pos) * 10), opacity: p.o }}>
                <div className="jr-inner" style={{ transform: `scale(${w / 300})` }}>{el}</div>
                <i className="jr-dim" style={{ opacity: p.dim }} />
              </div>
            );
          })}
        </div>
      </div>
      <footer className="jr-foot">
        <button className="jr-round" aria-label="หน้าก่อน" disabled={at <= 0} onClick={() => go(at - 1)}><Icon name="back" size={18} /></button>
        <span className="jr-count">{at + 1} / {n}</span>
        <button className="jr-round" aria-label="หน้าถัดไป" disabled={at >= n - 1} onClick={() => go(at + 1)}><Icon name="next" size={18} /></button>
      </footer>
    </div>,
    document.body,
  );
}
