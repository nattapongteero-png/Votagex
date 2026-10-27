import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import Icon from './icons';
import RecapFilm from './RecapFilm';
import { CUT, FPS, lengthOf, shotsFor } from './recapShots';
import { buildSound } from './recapSound';
import { PEOPLE, EXPENSE_CATS, byOrder, diffDays, distanceKm, parseISO, thaiShort, toTHB } from './data';

const pad = (n) => String(n).padStart(2, '0');

// A past trip played back as a film (RecapFilm) with its synthesized sound (recapSound), built when it opens
// (its stamp, when it has one, pressed in near the end);
// a speaker button mutes it. A bar per shot up top; tap the left third for the shot
// before, elsewhere for the next; hold to pause. "ดูทริปนี้" opens the plan any time; at the end, the full recap.
export default function RecapViewer({ plan, memories, expenses, label, stamp, onClose }) {
  const navigate = useNavigate();
  const player = useRef(null);
  const [frame, setFrame] = useState(0);
  const [size, setSize] = useState(() => ({ w: Math.min(430, window.innerWidth), h: window.innerHeight }));
  const hold = useRef({ timer: null, held: false });
  const [sound, setSound] = useState(null); // the synthesized track, once it's built
  const [muted, setMuted] = useState(false);
  const unlocked = useRef(false); // phones let sound play only after a tap reaches the player

  const film = useMemo(() => {
    const stops = plan.stops.filter((s) => s.date && s.lat != null && !s.skip).sort((a, b) => a.date.localeCompare(b.date) || byOrder(a, b));
    const km = stops.reduce((t, s, i) => (i ? t + distanceKm(stops[i - 1], s) : 0), 0);
    const photos = memories.filter((m) => m.photos?.length)
      .flatMap((m) => m.photos.map((src) => {
        const t = parseISO(m.date);
        return { src, text: m.text, by: PEOPLE[m.by]?.name, byAvatar: PEOPLE[m.by]?.avatar, date: `${thaiShort(m.date)} ${t.getFullYear() + 543}` };
      }));
    const total = expenses.reduce((t, e) => t + toTHB(e), 0);
    const cats = Object.entries(expenses.reduce((o, e) => ({ ...o, [e.cat]: (o[e.cat] || 0) + toTHB(e) }), {}))
      .sort((a, b) => b[1] - a[1]).map(([cat, amount]) => ({ label: EXPENSE_CATS[cat]?.label || cat, color: EXPENSE_CATS[cat]?.color || '#6B7280', amount }));
    const start = parseISO(plan.startDate);
    return {
      title: plan.name, label,
      cover: plan.cover?.img || photos[0]?.src || null,
      ago: label,
      dateFull: `${thaiShort(plan.startDate)} ${start.getFullYear() + 543}`,
      dateCode: `${pad(start.getDate())}.${pad(start.getMonth() + 1)}.${start.getFullYear() + 543}`,
      crew: plan.members.map((id) => ({ id, name: PEOPLE[id]?.name, avatar: PEOPLE[id]?.avatar })).filter((c) => c.avatar),
      stops: stops.map((s) => ({ id: s.id, name: s.name, time: s.time, lat: s.lat, lng: s.lng })),
      photos,
      spend: { total, cats },
      stats: { days: plan.endDate ? diffDays(plan.startDate, plan.endDate) + 1 : 1, stops: stops.length, photos: photos.length, km },
      stamp, // the trip's stamp from the stamp book, with how many of its kind are collected (stamp.total)
    };
  }, [plan, memories, expenses, label, stamp]);
  const shots = useMemo(() => shotsFor(film), [film]);
  const total = lengthOf(shots);
  useEffect(() => {
    let url = null; let live = true;
    buildSound(film, shots, total).then((r) => {
      url = r.url;
      if (live) setSound(r);
      else URL.revokeObjectURL(url);
    });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [film, shots, total]);
  const inputProps = useMemo(() => ({ ...film, sound: sound?.url }), [film, sound]);
  // the film is laid out 1080 wide (RecapFilm) but played in a frame the screen's own size, so it draws at the
  // phone's real resolution: Safari keeps a 1080 frame scaled down at full size, and ran out of memory
  const H = Math.round(Math.min(2400, Math.max(1600, (1080 * size.h) / size.w)));
  const W = size.w;
  const frameH = Math.round((H * W) / 1080);
  const at = shots.reduce((k, s, i) => (frame >= s.from + (s.cut ? CUT : 0) ? i : k), 0);
  const done = frame >= total - 1;

  const jump = (by) => {
    const p = player.current;
    if (!p) return;
    // back: to the start of this shot, or the one before when it has only just begun
    const k = by < 0 && frame - shots[at].from > 30 ? at : Math.max(0, Math.min(shots.length - 1, at + by));
    // land just after the shot's cut, not halfway through it with the shot before still on screen
    const to = shots[k].from + (shots[k].cut ? CUT : 0) + 2;
    // a seek while playing resumes by itself; calling play too leaves a resume pending that restarts the film at its end
    const playing = p.isPlaying();
    p.seekTo(to);
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
  // dev only: seek to any frame for contact sheets (the film is a pure function of its frame)
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    window.__recap = { seek: (fr) => { player.current?.pause(); player.current?.seekTo(fr); }, shots, total, sound };
    return () => { delete window.__recap; };
  }, [shots, total, sound]);
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
  // the first tap that reaches the player starts it again from inside that tap, which lets phones play its sound
  const unlock = (e) => {
    if (unlocked.current || !player.current) return;
    unlocked.current = true;
    player.current.pause();
    player.current.play(e);
  };
  const toggleSound = (e) => {
    unlock(e);
    const p = player.current;
    if (!p) return;
    if (muted) p.unmute(); else p.mute();
    setMuted(!muted);
  };
  const up = (e) => {
    clearTimeout(hold.current.timer);
    unlock(e);
    if (hold.current.held) { player.current?.play(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    jump(e.clientX - r.left < r.width / 3 ? -1 : 1);
  };
  const open = (path) => { onClose(); navigate(path); };

  return createPortal(
    <div className={`pt-story${shots[at]?.light ? ' on-light' : ''}`} role="dialog" aria-label={`สรุปทริป ${plan.name}`}>
      <Player ref={player} component={RecapFilm} inputProps={inputProps} durationInFrames={total} fps={FPS}
        compositionWidth={W} compositionHeight={frameH} loop={false} moveToBeginningWhenEnded={false} acknowledgeRemotionLicense
        clickToPlay={false} doubleClickToFullscreen={false} spaceKeyToPlayOrPause={false}
        errorFallback={({ error }) => (
          <div className="pt-story-error"><b>เล่นต่อไม่ได้</b><span>{error?.message}</span></div>
        )}
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
        <button className="pt-story-close" aria-label={muted ? 'เปิดเสียง' : 'ปิดเสียง'} onClick={toggleSound}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H3v6h3l5 4V5z" />{muted ? <path d="m22 9-6 6M16 9l6 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />}
          </svg>
        </button>
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
