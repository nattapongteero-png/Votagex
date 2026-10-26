import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { PEOPLE, EXPENSE_CATS, tripTheme, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

// A past trip as a digital scrapbook you leaf through yourself. The pages turn with react-pageflip (MIT): drag
// a corner or swipe and the paper curls under your finger with its shadow, or tap a side. Closed, it shows
// its cloth cover, centred. Each page is laid out on a 360×520 card and scaled into the book: photos taped in
// with handwritten notes and arrows, the route doodled beside a ticket of stops, the receipt and stickers, a
// last note.

const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const year = (d) => parseISO(d).getFullYear() + 543;
const ARROW = 'M10 10 C 40 0, 70 20, 80 54 M68 44 L80 56 L88 40';
const HEART = 'M50 82 C 18 60, 8 40, 22 26 C 34 14, 48 22, 50 34 C 52 22, 66 14, 78 26 C 92 40, 82 60, 50 82 Z';
const SUN = 'M70 50 A20 20 0 1 1 69.9 46 M50 4 V18 M50 82 V96 M4 50 H18 M82 50 H96 M17 17 L27 27 M73 73 L83 83 M83 17 L73 27 M27 73 L17 83';

/* ---------------- scrapbook bits (in page units: 360×520) ---------------- */

const Tape = ({ x, y, r = 0, w = 90, tone = 'yellow' }) => <i className={`sb-tape ${tone}`} style={{ left: x, top: y, width: w, transform: `rotate(${r}deg)` }} />;
const Ink = ({ d, x, y, size = 60, r = 0, flip, color = 'var(--sb-ink)', width = 3.5 }) => (
  <svg className="sb-doodle" viewBox="0 0 100 100" style={{ left: x, top: y, width: size, height: size, transform: `rotate(${r}deg)${flip ? ' scaleX(-1)' : ''}` }}>
    <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Photo = ({ src, x, y, w, h, r = 0, frame }) => (
  <span className={`sb-photo${frame ? ' framed' : ''}`} style={{ left: x, top: y, width: w, height: h, transform: `rotate(${r}deg)`, backgroundImage: `url(${src})` }} />
);
const Hand = ({ x, y, w, size = 26, color, align, r = 0, children }) => (
  <p className="sb-hand" style={{ left: x, top: y, width: w, fontSize: size, color, textAlign: align, transform: r ? `rotate(${r}deg)` : undefined }}>{children}</p>
);

/* ---------------- pages ---------------- */

function Cover({ d }) {
  return (
    <div className="sb-cover" style={{ '--book': d.theme.color }}>
      <span className="sb-cover-frame" />
      <span className="sb-cover-kicker">SCRAPBOOK</span>
      <span className="sb-cover-title" style={{ fontSize: Math.min(24, 112 / ([...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(d.title)].length * 0.62)) }}>{d.title}</span>
      <span className="sb-cover-date">{d.dateCode}</span>
      <i className="sb-cover-band" />
    </div>
  );
}
const BackCover = ({ d }) => <div className="sb-cover back" style={{ '--book': d.theme.color }}><span className="sb-cover-mark">VOTAGEX</span></div>;

function Intro({ d }) {
  return (
    <>
      <Hand x={30} y={34} w={300} size={22} color="var(--sb-red)">{d.dateLong}</Hand>
      <Hand x={30} y={72} w={300} size={26}>วันนี้ไป</Hand>
      <Hand x={30} y={104} w={310} size={Math.min(52, 300 / ([...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(d.title)].length * 0.62))} r={-2}><b style={{ whiteSpace: 'nowrap' }}>{d.title}</b></Hand>
      <Hand x={30} y={190} w={300} size={26}>{d.crew.length > 1 ? 'กับแก๊งนี้' : 'คนเดียวก็ได้'}</Hand>
      <Ink d={SUN} x={268} y={30} size={66} color="var(--sb-red)" />
      {d.crew.slice(0, 4).map((c, i) => (
        <span key={c.id} className="sb-mini" style={{ left: 34 + (i % 2) * 150, top: 250 + Math.floor(i / 2) * 130 + (i % 2) * 14, transform: `rotate(${i % 2 ? 5 : -6}deg)` }}>
          <img src={c.avatar} alt="" /><em>{c.name}</em>
        </span>
      ))}
      <Tape x={64} y={240} r={-8} />
      <span className="sb-stamp" style={{ right: 22, bottom: 26 }}>{d.to}<small>{d.dateCode}</small></span>
    </>
  );
}

function Route({ d }) {
  const box = { x: 60, y: 90, w: 240, h: 170 };
  const la = d.stops.map((s) => s.lat); const ln = d.stops.map((s) => s.lng);
  const k = Math.min(box.w / Math.max(Math.max(...ln) - Math.min(...ln), 1e-4), box.h / Math.max(Math.max(...la) - Math.min(...la), 1e-4));
  const cx = (Math.max(...ln) + Math.min(...ln)) / 2; const cy = (Math.max(...la) + Math.min(...la)) / 2;
  const pts = d.stops.map((s) => ({ x: box.x + box.w / 2 + (s.lng - cx) * k, y: box.y + box.h / 2 - (s.lat - cy) * k }));
  const path = pts.map((p, i) => (i ? `Q${(pts[i - 1].x + p.x) / 2 + (i % 2 ? 26 : -26)},${(pts[i - 1].y + p.y) / 2 + (i % 2 ? -20 : 20)} ${p.x},${p.y}` : `M${p.x},${p.y}`)).join(' ');
  return (
    <>
      <Hand x={30} y={30} w={300} size={34}><b>เส้นทางวันนั้น</b></Hand>
      <svg className="sb-route" viewBox="0 0 360 290">
        <path d={path} fill="none" stroke="var(--sb-ink)" strokeWidth="3" strokeDasharray="8 8" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="15" fill="#fff" stroke="var(--sb-red)" strokeWidth="3" />
            <text x={p.x} y={p.y + 6} textAnchor="middle" className="sb-route-n">{i + 1}</text>
          </g>
        ))}
      </svg>
      <div className="sb-ticket" style={{ top: 300 }}>
        {d.stops.slice(0, 5).map((s, i) => (
          <span key={s.id} className="sb-ticket-row"><b>{i + 1}</b><em>{s.time || '—'}</em><span>{s.name}</span></span>
        ))}
        <span className="sb-ticket-foot">รวม ~{d.stats.km.toFixed(1)} กม.</span>
      </div>
      <Tape x={130} y={288} r={-3} w={100} tone="red" />
    </>
  );
}

// photos, collage style: one large and one small, each with a handwritten note and an arrow pointing at it
function Photos({ pair, n }) {
  const [a, b] = pair;
  const flip = n % 2 === 1;
  return (
    <>
      <Photo src={a.src} x={flip ? 120 : 30} y={40} w={210} h={250} r={flip ? 2 : -2} frame />
      <Tape x={flip ? 180 : 90} y={28} r={-10} />
      <Hand x={flip ? 18 : 250} y={60} w={100} size={22} r={flip ? -6 : 6}>{a.text.split(' ')[0] || a.date}</Hand>
      <Ink d={ARROW} x={flip ? 40 : 238} y={110} size={64} flip={!flip} />
      {b ? (
        <>
          <Photo src={b.src} x={flip ? 30 : 140} y={316} w={190} h={160} r={flip ? -3 : 3} frame />
          <Tape x={flip ? 70 : 250} y={306} r={14} tone="blue" />
          <Hand x={flip ? 230 : 18} y={360} w={116} size={20} r={flip ? 5 : -5}>{b.text.split(' ')[0] || b.date}</Hand>
          <Ink d={ARROW} x={flip ? 214 : 70} y={410} size={56} r={160} flip={flip} />
        </>
      ) : (
        <Hand x={30} y={320} w={300} size={24}>{a.text}<br /><span style={{ color: 'var(--sb-red)' }}>— {a.by}</span></Hand>
      )}
      <span className="sb-dots" style={{ left: flip ? 240 : 40, top: 484 }}>
        {['#C9B79C', '#8E7F9C', '#4F6D7A', '#2F3B4C', '#5E6B3A'].map((c) => <i key={c} style={{ background: c }} />)}
      </span>
    </>
  );
}

function Spend({ d }) {
  const stickers = [
    { n: d.stats.days, u: 'วัน', bg: '#FF6B4A', x: 236, y: 40, r: 10 },
    { n: d.stats.stops, u: 'จุด', bg: '#4F46E5', x: 262, y: 140, r: -8 },
    { n: d.stats.photos, u: 'รูป', bg: '#16A34A', x: 236, y: 240, r: 6 },
  ];
  return (
    <>
      <Hand x={30} y={30} w={200} size={34}><b>ค่าใช้จ่าย</b></Hand>
      <div className="sb-receipt" style={{ left: 30, top: 96 }}>
        <span className="sb-receipt-head">RECEIPT</span>
        {d.spend.cats.map((c) => <span key={c.label} className="sb-receipt-row"><span>{c.label}</span><span>{baht(c.amount)}</span></span>)}
        {!d.spend.cats.length && <span className="sb-receipt-row"><span>ไม่ได้จดไว้</span></span>}
        <span className="sb-receipt-row total"><span>รวม</span><span>{baht(d.spend.total)}</span></span>
      </div>
      <Tape x={70} y={84} r={-6} />
      {stickers.map((s) => <span key={s.u} className="sb-sticker" style={{ left: s.x, top: s.y, background: s.bg, transform: `rotate(${s.r}deg)` }}><b>{s.n}</b>{s.u}</span>)}
      <Hand x={30} y={384} w={310} size={40} color="var(--sb-red)" r={-3}><b>รวม {baht(d.spend.total)}</b></Hand>
      {d.spend.total > 0 && <Hand x={30} y={444} w={300} size={24}>คนละ ~{baht(d.spend.total / Math.max(1, d.crew.length))}</Hand>}
    </>
  );
}

function End({ d }) {
  return (
    <>
      <span className="sb-note" style={{ right: 26, top: 30 }}>{d.label}</span>
      <Hand x={20} y={150} w={320} size={50} align="center"><b>ไว้ไปด้วยกัน<br />อีกนะ</b></Hand>
      <Ink d={HEART} x={140} y={300} size={80} color="var(--sb-red)" />
      <Hand x={20} y={396} w={320} size={24} color="var(--sb-red)" align="center">{d.crew.map((c) => c.name).join(' · ')}</Hand>
    </>
  );
}

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
      title: plan.name, label, theme: tripTheme(plan),
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
    const pairs = [];
    for (let i = 0; i < d.photos.length; i += 2) pairs.push(d.photos.slice(i, i + 2));
    const inside = [
      <Intro key="intro" d={d} />,
      d.stops.length > 0 && <Route key="route" d={d} />,
      ...pairs.map((pair, i) => <Photos key={`ph${i}`} pair={pair} n={i} />),
      <Spend key="spend" d={d} />,
      <End key="end" d={d} />,
    ].filter(Boolean);
    if (inside.length % 2 === 1) inside.push(null); // a blank page so the back cover lands on a back
    return [{ cover: <Cover d={d} /> }, ...inside.map((el) => ({ el })), { cover: <BackCover d={d} /> }];
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
      <div className="sb-stage">
        <div className="sb-book" style={{ transform: `translateX(${shift}px)` }}>
          <HTMLFlipBook width={pw} height={ph} size="fixed" showCover usePortrait={false} drawShadow maxShadowOpacity={0.45}
            flippingTime={700} mobileScrollSupport={false} showPageCorners className="sb-flip" ref={book}
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
