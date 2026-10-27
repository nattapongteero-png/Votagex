import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useProto } from './useProto';
import Icon from './icons';
import { Sheet } from './ui';
import { InkDefs, Postmark, Stamp } from './StampBook';
import { stampToSend, useStamps } from './stamps';
import { playStamp } from './recapSound';
import { addYear, thaiShort, thaiYear } from './data';

// A trip as a postcard. On its back, what I wrote to myself while I was there: it arrives on the trip's first
// anniversary, and until then (or when nothing was written) the back carries the trip's numbers instead; the
// trip's name and date where the address goes; and its stamp from the stamp book, the postmark struck across
// the stamp onto the card. On its front, a photo from the trip. The home page's look-back is one (it turns
// over under the finger), a sheet writes one during a trip, and the recap film closes on it.
//
// A postcard is 24 × 16 em (3:2, as A6) and everything on it is in em of its width / 24, so one set of rules
// draws it at any size.

const STAMP = 5.2; // the stamp's width, in the card's em
// which face is toward you at a turn: shown by hand rather than left to backface-visibility, which not every
// WebKit honours
const sideAt = (deg) => (Math.cos((deg * Math.PI) / 180) >= 0 ? 'back' : 'front');

// a postcard `w` wide, turned `flip` degrees (0 its back, 180 its front). `press` presses its stamp in and
// strikes the postmark (CSS); the film moves them frame by frame through `stampStyle`, `stampShadow` and
// `markStyle`. `write` makes the back a place to write ({ value, onChange })
export function Postcard({ card, w, flip = 0, press = false, mark = true, write, stampStyle, stampShadow, markStyle, cardRef, className = '', children }) {
  const stampW = (w * STAMP) / 24;
  return (
    <div className={`pt-pc${press ? ' press' : ''} ${className}`} style={{ width: w, height: w / 1.5, fontSize: w / 24 }}>
      <div className="pt-pc-card" ref={cardRef} data-side={sideAt(flip)} style={flip ? { transform: `rotateY(${flip}deg)` } : undefined}>
        <div className="pt-pc-face pt-pc-back">
          <div className="pt-pc-msg">
            {card.label && <div className="pt-pc-kicker">{card.label}</div>}
            {write ? (
              <textarea className="pt-pc-text pt-pc-write" value={write.value} maxLength={140} placeholder="ถึงตัวเองปีหน้า…" readOnly={write.readOnly}
                onChange={(e) => write.onChange(e.target.value)} />
            ) : card.note ? (
              <>
                <p className="pt-pc-text">{card.note.text}</p>
                <div className="pt-pc-by">{card.note.avatar && <img src={card.note.avatar} alt="" />}<span>{card.note.name} · {card.note.on}</span></div>
              </>
            ) : (
              <div className="pt-pc-numbers">
                {card.numbers.map(([n, unit]) => <span key={unit}><b>{n.toLocaleString('en-US')}</b>{unit}</span>)}
              </div>
            )}
          </div>
          <i className="pt-pc-rule" />
          <div className="pt-pc-to">
            <b>{card.title}</b>
            <span>{card.date}</span>
            <span className="en">{card.where}</span>
          </div>
          {card.stamp && (
            <div className="pt-pc-stamp" style={stampStyle}>
              <Stamp stamp={card.stamp} w={stampW} press={press} mark={false} style={stampShadow} />
            </div>
          )}
          {card.mark && mark && <Postmark stamp={card.mark} id={`pm-${card.mark.key}-${Math.round(w)}`} className="pt-postmark pt-pc-mark" style={markStyle} />}
        </div>
        <div className="pt-pc-face pt-pc-front">
          {card.photo && <img src={card.photo} alt="" draggable="false" />}
          {card.where && <span className="pt-pc-caption">{card.where}</span>}
        </div>
      </div>
      {children}
    </div>
  );
}

// an element's width, kept up to date
function useWidth(ref) {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// on the home page: the postcard lands back up, its stamp pressed in; a tap turns it over, and so does a drag
// sideways, the card following the finger and springing onto the nearer face (or the one it was flicked to),
// carrying the flick's speed. The play button opens the film
export default function PostcardTile({ card, onPlay }) {
  const box = useRef(null);
  const face = useRef(null);
  const w = useWidth(box);
  const at = useRef(0); // the card's turn, in degrees
  const drag = useRef(null);
  const spin = useRef(0); // the settling spring's frame
  useEffect(() => () => cancelAnimationFrame(spin.current), []);
  const show = (deg) => {
    at.current = deg;
    face.current.style.transform = `rotateY(${deg}deg)`;
    face.current.dataset.side = sideAt(deg);
  };
  // a spring (a little under critically damped, so it overshoots a touch) from where the card is to `to`, v in deg/s
  const turn = (to, v = 0) => {
    cancelAnimationFrame(spin.current);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(to); return; }
    let x = at.current; let speed = v; let last = performance.now();
    const step = (now) => {
      const dt = Math.min(32, now - last) / 1000; last = now;
      speed += (-170 * (x - to) - 20 * speed) * dt; x += speed * dt;
      if (Math.abs(x - to) < 0.05 && Math.abs(speed) < 1) { show(to); return; }
      show(x);
      spin.current = requestAnimationFrame(step);
    };
    spin.current = requestAnimationFrame(step);
  };
  const flipOver = () => turn(Math.round(at.current / 180) * 180 + 180);
  const down = (e) => {
    cancelAnimationFrame(spin.current);
    drag.current = { x: e.clientX, y: e.clientY, from: at.current, moved: false, v: 0, t: e.timeStamp, last: e.clientX };
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(e.clientY - d.y) > Math.abs(dx)) { drag.current = null; return; } // a scroll
      d.moved = true;
      box.current.setPointerCapture(e.pointerId);
    }
    const dt = e.timeStamp - d.t;
    if (dt > 0) d.v = (((e.clientX - d.last) / w) * 180) / dt; // deg per ms
    d.t = e.timeStamp; d.last = e.clientX;
    show(d.from + (dx / w) * 180);
  };
  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) { flipOver(); return; }
    const to = Math.round((at.current + d.v * 140) / 180) * 180;
    turn(Math.max(d.from - 180, Math.min(d.from + 180, to)), d.v * 1000);
  };
  return (
    <div className="pt-pc-tile" ref={box} role="button" tabIndex={0} aria-label="พลิกโปสการ์ด"
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; turn(Math.round(at.current / 180) * 180); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipOver(); } }}>
      <InkDefs />
      {w > 0 && <Postcard card={card} w={w} press cardRef={face} />}
      <button className="pt-pc-play" aria-label="ดูหนังสรุปทริป" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onPlay(); }}>
        <Icon name="play" size={18} />
      </button>
    </div>
  );
}

// during a trip (and a few days after): a postcard to myself, written on its back, the trip's stamp on it.
// Sending strikes the postmark; it arrives on the trip's first anniversary, as the home page's look-back
export function PostcardSheet({ onClose, planId }) {
  const { plans, today, actions, showToast } = useProto();
  const stamps = useStamps();
  const plan = plans.find((p) => p.id === planId);
  const box = useRef(null);
  const w = useWidth(box);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  if (!plan) return null;
  const deliver = addYear(plan.startDate);
  const stamp = stampToSend(stamps, plan, today);
  const card = {
    key: `send-${plan.id}`, title: plan.name,
    date: `${thaiShort(plan.startDate)} ${thaiYear(plan.startDate)}`,
    where: stamp ? (stamp.kind === 'prov' ? `${stamp.en} · Thailand` : stamp.en) : plan.destination?.name || '',
    stamp,
    mark: stamp && { ...stamp, key: `send-${plan.id}`, date: today, year: thaiYear(today) },
  };
  const send = (close) => {
    setSent(true);
    playStamp();
    setTimeout(() => {
      actions.writePostcard({ planId: plan.id, text: text.trim(), on: today });
      showToast(`ส่งแล้ว · ถึง ${thaiShort(deliver)} ${thaiYear(deliver)}`);
      close();
    }, 950);
  };
  return (
    <Sheet title="โปสการ์ดถึงตัวเอง" subtitle={`ถึง ${thaiShort(deliver)} ${thaiYear(deliver)}`} onClose={onClose}
      footer={(close) => <button className="pt-btn block" disabled={!text.trim() || sent} onClick={() => send(close)}>ส่ง</button>}>
      <div className="pt-pc-compose" ref={box}>
        <InkDefs />
        {w > 0 && <Postcard card={card} w={w} mark={sent} className={sent ? 'sent' : ''} write={{ value: text, onChange: setText, readOnly: sent }} />}
      </div>
    </Sheet>
  );
}
