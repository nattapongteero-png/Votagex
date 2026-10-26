import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { Avatar, Avatars, CatIcon } from './ui';
import MapView from './MapView';
import { PEOPLE, EXPENSE_CATS, byOrder, diffDays, fmtMoney, parseISO, thaiShort, toTHB } from './data';

const SLIDE_MS = 5000;
const yearTh = (d) => parseISO(d).getFullYear() + 543;

// A past trip played back like a story: its cover, the numbers, the route, each photo, the spend, then a way in.
// Every slide but the last runs 5s (a bar each up top); tap the left third to go back, elsewhere for the next,
// hold to pause. "ดูทริปนี้" opens the plan any time; the last slide leads to the trip's full recap page.
export default function RecapViewer({ plan, memories, expenses, label, onClose }) {
  const navigate = useNavigate();
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);

  const stops = plan.stops.filter((s) => s.date).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
  const visited = stops.filter((s) => Object.keys(s.checkIns || {}).length);
  const photos = memories.filter((m) => m.photos?.length).flatMap((m) => m.photos.map((photo) => ({ m, photo })));
  const spent = expenses.reduce((t, e) => t + toTHB(e), 0);
  const byCat = Object.entries(expenses.reduce((o, e) => ({ ...o, [e.cat]: (o[e.cat] || 0) + toTHB(e) }), {})).sort((a, b) => b[1] - a[1]);
  const days = plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1;
  const cover = plan.cover?.img || photos[0]?.photo;
  const pins = stops.filter((s) => s.lat != null);
  const dates = days > 1 ? `${thaiShort(plan.startDate)} – ${thaiShort(plan.endDate)} ${yearTh(plan.endDate)}` : `${thaiShort(plan.startDate)} ${yearTh(plan.startDate)}`;

  const slides = [
    { key: 'cover', bg: cover, body: (
      <div className="pt-rc-cover">
        <span className="pt-rc-kicker">{label}</span>
        <h2>{plan.name}</h2>
        <span className="pt-rc-sub">{dates}</span>
        <Avatars ids={plan.members} size={36} max={5} />
      </div>
    ) },
    { key: 'stats', bg: cover, dim: true, body: (
      <div className="pt-rc-stats">
        <span className="pt-rc-kicker">ทริปนี้เรา…</span>
        <div><b>{days}</b><span>วัน</span></div>
        <div><b>{visited.length || stops.length}</b><span>จุดที่แวะ</span></div>
        <div><b>{photos.length}</b><span>รูป</span></div>
        <div><b>{plan.members.length}</b><span>คน</span></div>
      </div>
    ) },
    pins.length > 0 && { key: 'route', body: (
      <div className="pt-rc-route">
        <span className="pt-rc-kicker">เส้นทางวันนั้น</span>
        <div className="pt-rc-map">
          <MapView points={pins.map((s, i) => ({ id: s.id, lat: s.lat, lng: s.lng, cat: s.cat, label: i + 1 }))}
            route={pins.length > 1} interactive={false} padding={36} fitKey={pins.map((s) => s.id).join()} />
        </div>
        <ol>
          {stops.slice(0, 5).map((s) => (
            <li key={s.id}><CatIcon cat={s.cat} size={28} /><span className="ellipsis">{s.name}</span><small>{s.time}</small></li>
          ))}
        </ol>
      </div>
    ) },
    ...photos.map(({ m, photo }, i) => ({ key: `p${i}`, bg: photo, body: (
      <div className="pt-rc-photo">
        <span className="pt-rc-by"><Avatar id={m.by} size={28} /> {PEOPLE[m.by]?.name}</span>
        {m.text && <p><Icon name={m.mood} size={18} className="pt-inline-icon" /> {m.text}</p>}
      </div>
    ) })),
    spent > 0 && { key: 'spend', bg: cover, dim: true, body: (
      <div className="pt-rc-spend">
        <span className="pt-rc-kicker">ใช้ไปทั้งหมด</span>
        <b>{fmtMoney(spent)}</b>
        <span className="pt-rc-sub">คนละ ~{fmtMoney(spent / plan.members.length)}</span>
        <ul>
          {byCat.map(([cat, n]) => (
            <li key={cat}>
              <span>{EXPENSE_CATS[cat]?.label || cat}</span>
              <i><em style={{ width: `${(n / spent) * 100}%`, background: EXPENSE_CATS[cat]?.color }} /></i>
              <small>{fmtMoney(n)}</small>
            </li>
          ))}
        </ul>
      </div>
    ) },
    { key: 'end', bg: cover, dim: true, last: true, body: (
      <div className="pt-rc-end">
        <h2>{plan.name}</h2>
        <span className="pt-rc-sub">{dates}</span>
        <button className="pt-btn" onClick={(e) => { e.stopPropagation(); onClose(); navigate(`/proto/plan/${plan.id}/recap`); }}>
          ดูสรุปทริปทั้งหมด <Icon name="next" size={16} />
        </button>
      </div>
    ) },
  ].filter(Boolean);
  const s = slides[at];

  const next = () => setAt((i) => Math.min(i + 1, slides.length - 1));
  const back = () => setAt((i) => Math.max(0, i - 1));
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setAt((i) => Math.min(i + 1, slides.length - 1));
      if (e.key === 'ArrowLeft') setAt((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slides.length, onClose]);

  const tap = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) back();
    else next();
  };

  return createPortal(
    <div className="pt-story" role="dialog" aria-label={`สรุปทริป ${plan.name}`}>
      <div key={s.key} className={`pt-story-photo${s.bg ? '' : ' plain'}${s.dim ? ' dim' : ''}`} style={s.bg ? { backgroundImage: `url(${s.bg})` } : undefined}
        onClick={tap} onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)}>
        <div className="pt-story-body">{s.body}</div>
      </div>
      <div className="pt-story-bars">
        {slides.map((x, i) => (
          <span key={x.key} className="pt-story-bar">
            {(i < at || (i === at && x.last)) && <i style={{ width: '100%' }} />}
            {i === at && !x.last && <i key={at} className="run" style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: held ? 'paused' : 'running' }} onAnimationEnd={next} />}
          </span>
        ))}
      </div>
      <div className="pt-story-top">
        <span className="pt-grow">
          <span className="pt-strong ellipsis">{plan.name}</span>
          <span className="pt-muted sm ellipsis">{label}</span>
        </span>
        <button className="pt-story-close" aria-label="ปิด" onClick={onClose}><Icon name="close" size={22} /></button>
      </div>
      {!s.last && (
        <button className="pt-btn light sm pt-story-open" onClick={() => { onClose(); navigate(`/proto/plan/${plan.id}`); }}>
          ดูทริปนี้ <Icon name="next" size={16} />
        </button>
      )}
    </div>,
    document.body,
  );
}
