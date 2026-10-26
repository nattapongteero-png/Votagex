import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import Icon from './icons';
import RecapFilm from './RecapFilm';
import { FPS, lengthOf, shotsFor } from './recapShots';
import { PEOPLE, EXPENSE_CATS, tripTheme, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

// A past trip played back as a short film (RecapFilm). A bar per shot up top; tap the left third for the shot
// before, elsewhere for the next; hold to pause. "ดูทริปนี้" opens the plan any time; at the end, the full recap.
export default function RecapViewer({ plan, memories, expenses, label, onClose }) {
  const navigate = useNavigate();
  const player = useRef(null);
  const [frame, setFrame] = useState(0);
  const [size, setSize] = useState(() => ({ w: Math.min(430, window.innerWidth), h: window.innerHeight }));
  const hold = useRef({ timer: null, held: false });

  const film = useMemo(() => {
    const stops = plan.stops.filter((s) => s.date && s.lat != null && !s.skip).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
    const km = stops.reduce((t, s, i) => (i ? t + distanceKm(stops[i - 1], s) : 0), 0);
    const photos = memories.filter((m) => m.photos?.length)
      .flatMap((m) => m.photos.map((src) => ({ src, text: m.text, by: PEOPLE[m.by]?.name, date: `${thaiShort(m.date)} ${parseISO(m.date).getFullYear() + 543}` })));
    const total = expenses.reduce((t, e) => t + toTHB(e), 0);
    const cats = Object.entries(expenses.reduce((o, e) => ({ ...o, [e.cat]: (o[e.cat] || 0) + toTHB(e) }), {}))
      .sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ label: EXPENSE_CATS[cat]?.label || cat, color: EXPENSE_CATS[cat]?.color || '#6B7280', amount }));
    const start = parseISO(plan.startDate);
    return {
      title: plan.name, label, kind: plan.kind, theme: tripTheme(plan),
      cover: plan.cover?.img || photos[0]?.src || null,
      ago: label,
      dateLong: `วัน${DAYS[start.getDay()]}ที่ ${thaiShort(plan.startDate)} ${start.getFullYear() + 543}`,
      dateCode: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear() + 543}`,
      dateShort: thaiShort(plan.startDate),
      crew: plan.members.map((id) => ({ id, name: PEOPLE[id]?.name, avatar: PEOPLE[id]?.avatar })).filter((c) => c.avatar),
      stops: stops.map((s) => ({ id: s.id, name: s.name, time: s.time, lat: s.lat, lng: s.lng })),
      photos,
      spend: { total, cats },
      stats: { days: plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1, stops: stops.length, photos: photos.length, km },
    };
  }, [plan, memories, expenses, label]);
  const shots = useMemo(() => shotsFor(film), [film]);
  const total = lengthOf(shots);
  const W = 1080;
  const H = Math.round(Math.min(2400, Math.max(1600, (W * size.h) / size.w)));
  const at = shots.reduce((k, s, i) => (frame >= s.from + 7 ? i : k), 0);
  const done = frame >= total - 1;
  // between the cover opening and shutting we're on paper: the bars and title switch to ink
  const onPaper = frame > shots[0].dur - 12 && frame < shots[shots.length - 1].from + 125;

  const jump = (by) => {
    const p = player.current;
    if (!p) return;
    // back: to the start of this shot, or the one before when it has only just begun
    const k = by < 0 && frame - shots[at].from > 30 ? at : Math.max(0, Math.min(shots.length - 1, at + by));
    // a seek while playing resumes by itself; calling play too leaves a resume pending that restarts the film at its end
    const playing = p.isPlaying();
    p.seekTo(shots[k].from + 7);
    if (!playing) p.play();
  };
  useEffect(() => {
    const p = player.current;
    if (!p) return undefined;
    const onFrame = (e) => setFrame(e.detail.frame);
    p.addEventListener('frameupdate', onFrame);
    p.play(); // not autoPlay: that plays again on the last frame, which sends the film back to the start
    return () => p.removeEventListener('frameupdate', onFrame);
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') jump(1);
      if (e.key === 'ArrowLeft') jump(-1);
    };
    const onResize = () => setSize({ w: Math.min(430, window.innerWidth), h: window.innerHeight });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  });

  const down = () => {
    hold.current.held = false;
    hold.current.timer = setTimeout(() => { hold.current.held = true; player.current?.pause(); }, 220);
  };
  const up = (e) => {
    clearTimeout(hold.current.timer);
    if (hold.current.held) { player.current?.play(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    jump(e.clientX - r.left < r.width / 3 ? -1 : 1);
  };
  const open = (path) => { onClose(); navigate(path); };

  return createPortal(
    <div className={`pt-story${onPaper ? ' on-paper' : ''}`} role="dialog" aria-label={`สรุปทริป ${plan.name}`}>
      <Player ref={player} component={RecapFilm} inputProps={film} durationInFrames={total} fps={FPS}
        compositionWidth={W} compositionHeight={H} loop={false} moveToBeginningWhenEnded={false} acknowledgeRemotionLicense
        clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div className="pt-story-tap" onPointerDown={down} onPointerUp={up} onPointerCancel={() => clearTimeout(hold.current.timer)} />
      <div className="pt-story-bars">
        {shots.map((s, i) => (
          <span key={s.key} className="pt-story-bar">
            <i style={{ width: `${i < at ? 100 : i > at ? 0 : Math.min(100, ((frame - s.from) / (s.dur - 14)) * 100)}%` }} />
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
      <div className="pt-story-foot">
        <button className="pt-btn light sm" onClick={() => open(`/proto/plan/${plan.id}`)}>ดูทริปนี้ <Icon name="next" size={16} /></button>
        {done && (
          <>
            <button className="pt-btn light sm" onClick={() => { player.current?.seekTo(0); player.current?.play(); }}><Icon name="back" size={16} /> ดูอีกครั้ง</button>
            <button className="pt-btn sm pt-story-cta" onClick={() => open(`/proto/plan/${plan.id}/recap`)}>สรุปทั้งหมด <Icon name="next" size={16} /></button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
