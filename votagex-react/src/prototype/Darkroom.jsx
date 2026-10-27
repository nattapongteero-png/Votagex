import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { PEOPLE, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

// A past trip, developed again in a darkroom. Under the red safelight each photo slides into the developer tray
// as blank paper and comes up slowly, shadows first; rub the tray and it comes up faster (the liquid ripples
// under your finger), tap and it's done. Developed prints lift out and are pegged on the drying line overhead.
// When the last one is up the light switches on: the red drains away, every print shows its real colours at
// once, and the line becomes the trip's gallery with the summary underneath.

const baht = (n) => `฿${Math.round(n).toLocaleString('en-US')}`;
const MAX = 12; // prints developed one by one; the rest of a big trip waits in the gallery
const DEV_MS = 3400; // a print comes up on its own in this long; rubbing speeds it up
const SLOT = 64; // a print on the drying line, in px wide

export default function Darkroom({ plan, memories, expenses, label, onClose }) {
  const navigate = useNavigate();
  const d = useMemo(() => {
    const stops = plan.stops.filter((s) => s.date && s.lat != null && !s.skip).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
    const photos = memories.filter((m) => m.photos?.length)
      .flatMap((m) => m.photos.map((src) => ({ src, text: m.text || '', by: PEOPLE[m.by]?.name, date: thaiShort(m.date) })));
    const total = expenses.reduce((t, e) => t + toTHB(e), 0);
    const crew = plan.members.map((id) => ({ id, name: PEOPLE[id]?.name, avatar: PEOPLE[id]?.avatar })).filter((c) => c.avatar);
    const start = parseISO(plan.startDate);
    const pad = (n) => String(n).padStart(2, '0');
    return {
      title: plan.name, label, crew, photos, total,
      code: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${String(start.getFullYear() + 543).slice(2)}`,
      date: `${thaiShort(plan.startDate)} ${start.getFullYear() + 543}`,
      stats: { days: plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1, stops: stops.length, photos: photos.length, km: stops.reduce((t, s, i) => (i ? t + distanceKm(stops[i - 1], s) : 0), 0) },
    };
  }, [plan, memories, expenses, label]);

  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const seq = d.photos.slice(0, MAX);
  const [W] = useState(() => Math.min(430, window.innerWidth));
  const [H] = useState(() => window.innerHeight);
  // the phases: 'dark' (the safelight coming on), 'dev' (print `at` in the tray), 'lit' (lights on)
  const [phase, setPhase] = useState(still || !seq.length ? 'lit' : 'dark');
  const [at, setAt] = useState(0);
  const [hung, setHung] = useState(0); // prints already on the line
  const [ready, setReady] = useState(false); // the print in the tray is fully up
  const [ripples, setRipples] = useState([]);
  const [open, setOpen] = useState(null); // a print looked at closely, once the lights are on
  const prog = useRef(0);
  const rub = useRef(0);
  const printRef = useRef(null);
  const stageRef = useRef(null);
  const raf = useRef(0);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { cancelAnimationFrame(raf.current); timers.current.forEach(clearTimeout); }, []);

  useEffect(() => {
    if (phase !== 'dark') return undefined;
    const t = setTimeout(() => setPhase('dev'), 2300);
    return () => clearTimeout(t);
  }, [phase]);

  const paint = (p) => printRef.current?.style.setProperty('--p', p.toFixed(3));

  // the print in the tray comes up: a little on its own each frame, a lot more while it's being rubbed
  useEffect(() => {
    if (phase !== 'dev') return undefined;
    prog.current = 0; paint(0); // ready was cleared when the last print lifted out
    let last = performance.now();
    const t0 = last + 750; // it slides into the tray first
    const step = (now) => {
      const dt = now - last; last = now;
      if (now > t0) {
        rub.current = Math.max(0, rub.current - dt / 400);
        prog.current = Math.min(1, prog.current + (dt / DEV_MS) * (1 + rub.current * 3));
        paint(prog.current);
      }
      if (prog.current < 1) raf.current = requestAnimationFrame(step);
      else setReady(true);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, at]);

  const lightsOn = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setHung(seq.length); setPhase('lit');
  }, [seq.length]);

  // a developed print lifts out onto the line, and the next sheet goes in
  const lift = useCallback(() => {
    setReady(false);
    setHung((h) => h + 1);
    if (at + 1 >= seq.length) later(lightsOn, 1300);
    else later(() => setAt((i) => i + 1), 700);
  }, [at, seq.length, lightsOn]);

  useEffect(() => {
    if (!ready || phase !== 'dev') return undefined;
    const t = setTimeout(lift, 900);
    return () => clearTimeout(t);
  }, [ready, phase, lift]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') (open != null ? setOpen(null) : onClose()); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const lastRip = useRef(0);
  const agitate = (e) => {
    if (phase !== 'dev' || (e.pointerType === 'mouse' && !e.buttons)) return;
    rub.current = Math.min(1.5, rub.current + 0.12);
    const now = performance.now();
    if (now - lastRip.current < 90) return;
    lastRip.current = now;
    const r = stageRef.current.getBoundingClientRect();
    const id = now;
    setRipples((rs) => [...rs.slice(-6), { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    later(() => setRipples((rs) => rs.filter((x) => x.id !== id)), 1000);
  };
  const tapTray = () => {
    if (phase !== 'dev') return;
    if (prog.current < 1) { prog.current = 1; paint(1); } else lift();
  };

  // where each print is: in the tray, pegged on the line overhead, or (lights on) hung in rows of three
  const top = 'env(safe-area-inset-top, 0px)';
  const pw = Math.round(W * 0.6); const ph = Math.round(pw * 1.22);
  const trayY = Math.round(H * 0.5);
  const cols = 3; const gap = 14; const gw = Math.floor((W - 32 - gap * (cols - 1)) / cols);
  const rowH = Math.round(gw * 1.22) + 46;
  const lineShift = Math.max(0, hung - Math.floor((W - 24) / (SLOT + 10))) * (SLOT + 10);
  const place = (i) => {
    const tilt = ((i * 37) % 9) - 4;
    if (phase === 'lit') {
      const c = i % cols; const r = Math.floor(i / cols);
      return { x: 16 + c * (gw + gap), y: 116 + r * rowH, s: gw / pw, r: tilt * 0.6, on: true };
    }
    if (i < hung) return { x: 14 + i * (SLOT + 10) - lineShift, y: 60, s: SLOT / pw, r: tilt, on: true };
    if (i === at && phase === 'dev') return { x: (W - pw) / 2, y: trayY - ph / 2, s: 1, r: -1.5, on: false };
    return { x: (W - pw) / 2 - W, y: trayY - ph / 2 + 40, s: 1, r: -8, on: false, away: true };
  };
  const all = phase === 'lit' ? d.photos : seq;
  const galleryH = 116 + Math.ceil(all.length / cols) * rowH;

  return createPortal(
    <div className={`dk is-${phase}`} role="dialog" aria-label={d.title}>
      <div className="dk-room" onPointerMove={agitate} onPointerDown={agitate}>
        <div className="dk-scroll" style={{ paddingTop: top }}>
          <div className="dk-stage" ref={stageRef} style={{ height: phase === 'lit' ? galleryH : H }}>
            {phase !== 'lit' && <>
              <i className="dk-bulb" />
              <i className="dk-line" />
              <div className="dk-intro">
                <span className="dk-edge">VOTAGEX 400 &nbsp;▸ {d.code} &nbsp;▸ {String(seq.length).padStart(2, '0')} EXP</span>
                <h2>{d.title}</h2>
                <span>{d.label}</span>
              </div>
              <div className="dk-tray" style={{ left: (W - pw * 1.36) / 2, top: trayY - (pw * 1.5) / 2, height: pw * 1.5, width: pw * 1.36 }} onClick={tapTray}>
                <i className="dk-liquid" />
              </div>
              {phase === 'dev' && seq[at] && (
                <div className="dk-cap" style={{ top: trayY + pw * 0.75 + 18 }} key={at}>
                  <span className="dk-edge">{String(at + 1).padStart(2, '0')} / {String(seq.length).padStart(2, '0')} &nbsp;▸ {seq[at].date}</span>
                  {seq[at].text && <p>{seq[at].text}</p>}
                </div>
              )}
            </>}
            {phase === 'lit' && (
              <header className="dk-lit-head">
                <span className="dk-edge">{d.code} · {d.label}</span>
                <h2>{d.title}</h2>
              </header>
            )}
            {phase === 'lit' && Array.from({ length: Math.ceil(all.length / cols) }, (_, r) => <i key={r} className="dk-line" style={{ top: 106 + r * rowH }} />)}
            {all.map((p, i) => {
              const q = place(i);
              const cur = phase === 'dev' && i === at;
              return (
                <button type="button" key={i} ref={cur ? printRef : null}
                  className={`dk-print${q.on ? ' on' : ''}${cur ? ' cur' : ''}${q.away ? ' away' : ''}`}
                  style={{ width: pw, height: ph, '--p': i < hung || phase === 'lit' ? 1 : 0, transform: `translate(${q.x}px, ${q.y}px) rotate(${q.r}deg) scale(${q.s})`, transitionDelay: phase === 'lit' ? `${i * 60}ms` : '0ms' }}
                  onClick={(e) => { if (phase === 'lit') { e.stopPropagation(); setOpen(i); } else if (cur) tapTray(); }}
                  tabIndex={phase === 'lit' ? 0 : -1} aria-label={p.text || `ภาพที่ ${i + 1}`}>
                  <span className="dk-img" style={{ backgroundImage: `url(${p.src})` }} />
                  <i className="dk-peg" />
                </button>
              );
            })}
            {ripples.map((r) => <i key={r.id} className="dk-ripple" style={{ left: r.x, top: r.y }} />)}
            {phase === 'lit' && (
              <section className="dk-sum" style={{ top: galleryH }}>
                <div className="dk-faces">{d.crew.map((c) => <img key={c.id} src={c.avatar} alt={c.name} />)}</div>
                <div className="dk-tally">
                  <span><b>{d.stats.days}</b>วัน</span><span><b>{d.stats.stops}</b>ที่</span><span><b>{d.stats.photos}</b>ภาพ</span><span><b>{d.stats.km.toFixed(1)}</b>กม.</span>
                </div>
                {d.total > 0 && <p className="dk-spend"><b>{baht(d.total)}</b> · คนละ ~{baht(d.total / Math.max(1, d.crew.length))}</p>}
                <h3>ไว้ไปด้วยกันอีกนะ</h3>
                <button type="button" className="dk-plan" onClick={() => navigate(`/proto/plans/${plan.id}`)}><Icon name="map" size={16} /> ดูแผนทริป</button>
              </section>
            )}
          </div>
        </div>
        <i className="dk-red" />
        <i className="dk-flash" />
      </div>
      <div className="dk-bar" style={{ top: `calc(${top} + 8px)` }}>
        <button type="button" className="dk-btn" onClick={onClose} aria-label="ปิด"><Icon name="close" size={18} /></button>
        {phase !== 'lit' && <button type="button" className="dk-switch" onClick={lightsOn} aria-label="เปิดไฟ"><i /></button>}
      </div>
      {open != null && d.photos[open] && (
        <div className="dk-look" onClick={() => setOpen(null)}>
          <img src={d.photos[open].src} alt="" />
          {d.photos[open].text && <p>{d.photos[open].text}</p>}
          <span className="dk-edge">{d.photos[open].by} · {d.photos[open].date}</span>
        </div>
      )}
    </div>,
    document.body,
  );
}
