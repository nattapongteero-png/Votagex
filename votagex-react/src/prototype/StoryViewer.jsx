import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import Icon from './icons';
import { Avatar } from './ui';
import { PEOPLE, diffDays } from './data';

// Memories from this day in past years, played like a story: one photo at a time, full screen, a bar per photo
// filling over 5s. Tap the left third to go back, elsewhere for the next; hold to pause. The last one closes it.
// items: [{ m: memory, photo, plan }]
export default function StoryViewer({ items, today, onClose }) {
  const navigate = useNavigate();
  const [at, setAt] = useState(0);
  const [held, setHeld] = useState(false);
  const it = items[at];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setAt((i) => (i + 1 < items.length ? i + 1 : (onClose(), i)));
      if (e.key === 'ArrowLeft') setAt((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length, onClose]);

  const next = () => (at + 1 < items.length ? setAt(at + 1) : onClose());
  const tap = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX - r.left < r.width / 3) setAt(Math.max(0, at - 1));
    else next();
  };
  const years = Math.max(1, Math.round(diffDays(it.m.date, today) / 365));
  const who = PEOPLE[it.m.by];

  return createPortal(
    <div className="pt-story" role="dialog" aria-label="ความทรงจำวันนี้">
      <div className="pt-story-photo" style={{ backgroundImage: `url(${it.photo})` }}
        onClick={tap} onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)} />
      <div className="pt-story-bars">
        {items.map((x, i) => (
          <span key={`${x.m.id}-${i}`} className="pt-story-bar">
            {i < at && <i style={{ width: '100%' }} />}
            {i === at && <i key={at} className="run" style={{ animationPlayState: held ? 'paused' : 'running' }} onAnimationEnd={next} />}
          </span>
        ))}
      </div>
      <div className="pt-story-top">
        {who && <Avatar id={it.m.by} size={32} />}
        <span className="pt-grow">
          <span className="pt-strong ellipsis">{who?.name}</span>
          <span className="pt-muted sm ellipsis">{years} ปีที่แล้ว · {it.plan?.name}</span>
        </span>
        <button className="pt-story-close" aria-label="ปิด" onClick={onClose}><Icon name="close" size={22} /></button>
      </div>
      <div className="pt-story-bottom">
        {it.m.text && <p><Icon name={it.m.mood} size={18} className="pt-inline-icon" /> {it.m.text}</p>}
        {it.plan && (
          <button className="pt-btn light sm" onClick={() => { onClose(); navigate(`/proto/plan/${it.plan.id}?tab=memories`); }}>
            ดูทริปนี้ <Icon name="next" size={16} />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
