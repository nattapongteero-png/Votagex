import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { PEOPLE, EXPENSE_CATS, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

// A past trip as a digital scrapbook you leaf through yourself. The pages turn with react-pageflip (MIT): swipe,
// drag a corner (the paper curls under your finger), drag slowly anywhere, or tap. Shut, it sits centred on its
// kraft cover. Pages are quiet and airy like a paper journal: photos in thin white borders laid out as a collage,
// notes in a calligraphy hand (Charm) with little arrows, the route as a pen sketch beside its stops, the spend as
// a receipt, a last line. Each page is laid out on a 360×520 card and scaled into the book.

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const year = (d) => parseISO(d).getFullYear() + 543;
const graphemes = (t) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(t || '')].length;
const clip = (t, n) => { const g = [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(t || '')].map((x) => x.segment); return g.length > n ? `${g.slice(0, n).join('')}…` : g.join(''); };
const ARROW = 'M8 12 C 30 2, 62 10, 74 44 M62 36 L75 46 L82 31';
const HEART = 'M50 82 C 18 60, 8 40, 22 26 C 34 14, 48 22, 50 34 C 52 22, 66 14, 78 26 C 92 40, 82 60, 50 82 Z';
const PALETTE = ['#D9C7A7', '#B79C86', '#8C9A86', '#5F7470', '#2F3B4C'];

/* ---------------- bits (in page units: 360×520) ---------------- */

const Tape = ({ x, y, r = 0, w = 70, tone = 'sage' }) => <i className={`sb-tape ${tone}`} style={{ left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />;
const Arrow = ({ x, y, size = 44, r = 0, flip }) => (
  <svg className="sb-arrow" viewBox="0 0 90 60" style={{ left: x, top: y, width: size, height: size * 0.66, transform: `rotate(${r}deg)${flip ? ' scaleX(-1)' : ''}` }}>
    <path d={ARROW} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Photo = ({ src, x, y, w, h, r = 0 }) => <span className="sb-photo" style={{ left: x, top: y, width: w, height: h, transform: `rotate(${r}deg)`, backgroundImage: `url(${src})` }} />;
const Note = ({ x, y, w, size = 26, align = 'left', r = 0, children }) => (
  <p className="sb-note" style={{ left: x, top: y, width: w, fontSize: size, textAlign: align, transform: r ? `rotate(${r}deg)` : undefined }}>{children}</p>
);
const Palette = ({ x, y }) => <span className="sb-dots" style={{ left: x, top: y }}>{PALETTE.map((c) => <i key={c} style={{ background: c }} />)}</span>;

/* ---------------- pages ---------------- */

function Cover({ d }) {
  return (
    <div className="sb-cover">
      {d.cover && (
        <span className="sb-cover-photo"><span style={{ backgroundImage: `url(${d.cover})` }} /><i className="sb-tape sage" /></span>
      )}
      <span className="sb-cover-label">
        <b style={{ fontSize: Math.min(30, 150 / (graphemes(d.title) * 0.55)) }}>{d.title}</b>
        <small>{d.dateCode}</small>
      </span>
    </div>
  );
}
const BackCover = () => <div className="sb-cover back"><span className="sb-cover-mark">VOTAGEX</span></div>;

function Intro({ d }) {
  const fit = Math.min(64, 300 / (graphemes(d.title) * 0.55));
  return (
    <>
      <span className="sb-kicker" style={{ left: 32, top: 40 }}>TRAVEL JOURNAL · {d.dateCode}</span>
      <Note x={30} y={70} w={310} size={fit}><b>{d.title}</b></Note>
      <span className="sb-sub" style={{ left: 32, top: 82 + fit * 1.5 }}>{d.dateLong}</span>
      <Note x={34} y={250} w={170} size={24} r={-3}>{d.crew.length > 1 ? 'ไปกับแก๊งนี้' : 'ไปคนเดียว'}</Note>
      <Arrow x={150} y={286} size={50} r={30} />
      <span className="sb-crew" style={{ left: 32, top: 340 }}>
        {d.crew.slice(0, 4).map((c) => <span key={c.id}><img src={c.avatar} alt="" /><em>{c.name}</em></span>)}
      </span>
      <Palette x={32} y={474} />
    </>
  );
}

function Route({ d }) {
  const box = { x: 50, y: 92, w: 260, h: 170 };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 24 : -24)},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? -18 : 18)} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  return (
    <>
      <Note x={30} y={30} w={300} size={38}><b>เส้นทางวันนั้น</b></Note>
      <svg className="sb-route" viewBox="0 0 360 290">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}><circle cx={p.x} cy={p.y} r="11" fill="currentColor" /><text x={p.x} y={p.y + 4.5} textAnchor="middle" className="sb-route-n">{i + 1}</text></g>
        ))}
      </svg>
      <span className="sb-stops" style={{ left: 32, top: 300 }}>
        {d.stops.slice(0, 5).map((s, i) => (
          <span key={s.id}><b>{i + 1}</b><span>{s.name}</span><em>{s.time}</em></span>
        ))}
      </span>
      <Note x={190} y={462} w={150} size={22} align="right" r={-2}>~{d.stats.km.toFixed(1)} กม.</Note>
    </>
  );
}

// a collage of up to three photos, captions in hand with arrows into the white space
function Photos({ set, n }) {
  const [a, b, c] = set;
  const cap = (p, max) => clip(p.text, max);
  if (!b) {
    return (
      <>
        <Photo src={a.src} x={34} y={44} w={292} h={330} r={n % 2 ? 1.2 : -1.2} />
        <Tape x={150} y={32} r={-4} />
        <Note x={34} y={394} w={290} size={24}>{cap(a, 40)}</Note>
        <span className="sb-by" style={{ right: 36, top: 470 }}>— {a.by} · {a.date}</span>
      </>
    );
  }
  if (!c) {
    return (
      <>
        <Photo src={a.src} x={32} y={40} w={200} h={230} r={-1.5} />
        <Tape x={84} y={28} r={-8} tone="blush" />
        <Note x={240} y={70} w={104} size={21} r={4}>{cap(a, 18)}</Note>
        <Arrow x={238} y={150} size={40} r={110} />
        <Photo src={b.src} x={136} y={292} w={192} h={180} r={1.8} />
        <Tape x={250} y={282} r={10} />
        <Note x={22} y={330} w={110} size={21} r={-4}>{cap(b, 18)}</Note>
        <Arrow x={78} y={420} size={44} r={-20} flip />
      </>
    );
  }
  return (
    <>
      <Photo src={a.src} x={30} y={36} w={300} h={186} r={-0.8} />
      <Tape x={140} y={24} r={-3} />
      <Photo src={b.src} x={30} y={240} w={142} h={170} r={-1.6} />
      <Photo src={c.src} x={188} y={256} w={142} h={170} r={1.6} />
      <Tape x={232} y={246} r={12} tone="blush" />
      <Note x={30} y={430} w={150} size={20} r={-2}>{cap(b, 16)}</Note>
      <Note x={190} y={444} w={140} size={20} align="right" r={2}>{cap(c, 16)}</Note>
    </>
  );
}

function Spend({ d }) {
  return (
    <>
      <Note x={30} y={30} w={300} size={38}><b>ค่าใช้จ่าย</b></Note>
      <div className="sb-receipt" style={{ left: 46, top: 100 }}>
        <span className="sb-receipt-head">RECEIPT · {d.dateCode}</span>
        {d.spend.cats.map((c) => <span key={c.label} className="sb-receipt-row"><span>{c.label}</span><span>{baht(c.amount)}</span></span>)}
        {!d.spend.cats.length && <span className="sb-receipt-row"><span>ไม่ได้จดไว้</span></span>}
        <span className="sb-receipt-row total"><span>รวม</span><span>{baht(d.spend.total)}</span></span>
      </div>
      <Tape x={140} y={88} r={-3} w={80} tone="blush" />
      <Note x={30} y={350} w={300} size={46}><b>{baht(d.spend.total)}</b></Note>
      {d.spend.total > 0 && <Note x={32} y={414} w={300} size={22}>คนละ ~{baht(d.spend.total / Math.max(1, d.crew.length))} คุ้มมาก</Note>}
      <span className="sb-sub" style={{ left: 32, top: 472 }}>{d.stats.days} วัน · {d.stats.stops} จุด · {d.stats.photos} รูป · {d.crew.length} คน</span>
    </>
  );
}

function End({ d }) {
  return (
    <>
      <Note x={20} y={150} w={320} size={50} align="center"><b>ไว้ไปด้วยกัน<br />อีกนะ</b></Note>
      <svg className="sb-heart" viewBox="0 0 100 100" style={{ left: 160, top: 300 }}><path d={HEART} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      <span className="sb-sub center" style={{ left: 20, right: 20, top: 360 }}>{d.crew.map((c) => c.name).join(' · ')}</span>
      <span className="sb-kicker center" style={{ left: 20, right: 20, top: 392 }}>{d.label}</span>
      <Palette x={133} y={474} />
    </>
  );
}

const Notes = () => <span className="sb-ruled" />;

/* ---------------- the book ---------------- */

// one page of the book: a hard cloth cover or soft paper, its contents scaled from the 360×520 layout
const Page = forwardRef(({ face, scale }, ref) => (
  <div ref={ref} className="sb-pg" data-density={face.cover ? 'hard' : 'soft'}>
    {face.cover || <div className="sb-paper"><div className="sb-paper-in" style={{ transform: `scale(${scale})` }}>{face.el}</div></div>}
  </div>
));
Page.displayName = 'Page';

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
      title: plan.name, label, cover: plan.cover?.img || photos[0]?.src || null,
      dateCode: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${String(start.getFullYear() + 543).slice(2)}`,
      dateLong: `วัน${DAYS[start.getDay()]}ที่ ${thaiShort(plan.startDate)} ${year(plan.startDate)}`,
      to: plan.destination?.name || stops[0]?.prov || plan.name,
      crew: plan.members.map((id) => ({ id, name: PEOPLE[id]?.name, avatar: PEOPLE[id]?.avatar })).filter((c) => c.avatar),
      stops, photos, spend: { total, cats },
      stats: { days: plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1, stops: stops.length, photos: photos.length, km: stops.reduce((t, s, i) => (i ? t + distanceKm(stops[i - 1], s) : 0), 0) },
    };
  }, [plan, memories, expenses, label]);

  // the faces in reading order; leaf i carries face 2i on its front (a right page) and 2i+1 on its back
  const faces = useMemo(() => {
    const sets = [];
    for (let i = 0; i < d.photos.length; i += 3) sets.push(d.photos.slice(i, i + 3));
    const fixed = 3 + (d.stops.length > 0 ? 1 : 0); // intro, route, spend, end (route optional)
    if ((fixed + sets.length) % 2 === 1) { // odd: split a set so the back cover lands on a back, else a ruled page
      const k = sets.findIndex((x) => x.length >= 2);
      if (k >= 0) sets.splice(k, 1, sets[k].slice(0, 1), sets[k].slice(1));
    }
    const inside = [
      <Intro key="intro" d={d} />,
      d.stops.length > 0 && <Route key="route" d={d} />,
      ...sets.map((set, i) => <Photos key={`ph${i}`} set={set} n={i} />),
      <Spend key="spend" d={d} />,
      <End key="end" d={d} />,
    ].filter(Boolean);
    if (inside.length % 2 === 1) inside.push(<Notes key="notes" />);
    return [{ cover: <Cover d={d} /> }, ...inside.map((el) => ({ el })), { cover: <BackCover /> }];
  }, [d]);

  // a page is half the screen's width, the book two of them side by side
  const [pw] = useState(() => Math.floor((Math.min(430, window.innerWidth) - 28) / 2));
  const ph = Math.round(pw * 1.44);
  const book = useRef(null);
  const [at, setAt] = useState(0); // the page index showing on the right (0: the cover)
  const last = faces.length - 1;
  const go = (by) => { const f = book.current?.pageFlip(); if (f) (by > 0 ? f.flipNext() : f.flipPrev()); };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // the library turns a page on a quick swipe or a drag from a corner; a slower drag elsewhere it ignores, so
  // once the finger lifts, if the page didn't turn, turn it
  const drag = useRef(null);
  const down = (e) => { drag.current = { x: e.clientX, y: e.clientY, page: book.current?.pageFlip()?.getCurrentPageIndex() }; };
  const up = (e) => {
    const g = drag.current;
    drag.current = null;
    const dx = e.clientX - (g?.x ?? e.clientX);
    if (!g || Math.abs(dx) < 48 || Math.abs(e.clientY - g.y) > 80) return;
    setTimeout(() => {
      const f = book.current?.pageFlip();
      if (f && f.getState() === 'read' && f.getCurrentPageIndex() === g.page) go(dx < 0 ? 1 : -1);
    }, 120);
  };

  // shut, the book sits centred on its front or back cover; open, the spine is in the middle
  const shift = at === 0 ? -pw / 2 : at >= last ? pw / 2 : 0;
  const pageNo = at === 0 ? 'ปก' : at >= last ? 'ปกหลัง' : `${at}–${at + 1}`;

  return createPortal(
    <div className="sb" role="dialog" aria-label={`สมุดทริป ${plan.name}`}>
      <header className="sb-head">
        <button className="sb-icon" aria-label="ปิดสมุด" onClick={onClose}><Icon name="close" size={20} /></button>
        <span className="sb-title">
          <b>{plan.name}</b>
          <small><Icon name="check" size={12} stroke={2.6} /> {faces.length - 2} หน้า · {label}</small>
        </span>
        <span className="sb-icon ghost" />
      </header>
      <div className="sb-stage" onPointerDown={down} onPointerUp={up} onPointerCancel={up}>
        <div className={`sb-book${at > 0 && at < last ? ' open' : ''}`} style={{ transform: `translateX(${shift}px)` }}>
          <HTMLFlipBook width={pw} height={ph} size="fixed" showCover usePortrait={false} drawShadow maxShadowOpacity={0.35} swipeDistance={20}
            flippingTime={700} showPageCorners className="sb-flip" ref={book}
            onFlip={(e) => setAt(e.data)}>
            {faces.map((f, i) => <Page key={i} face={f} scale={pw / 360} />)}
          </HTMLFlipBook>
        </div>
      </div>
      <footer className="sb-foot">
        <button className="sb-round" aria-label="หน้าก่อน" disabled={at === 0} onClick={() => go(-1)}><Icon name="back" size={18} /></button>
        <span className="sb-page-no">{pageNo}</span>
        <button className="sb-round" aria-label="หน้าถัดไป" disabled={at >= last} onClick={() => go(1)}><Icon name="next" size={18} /></button>
        <button className="sb-pill" onClick={() => { onClose(); navigate(`/proto/plan/${plan.id}`); }}>เปิดแผนทริป</button>
      </footer>
    </div>,
    document.body,
  );
}
