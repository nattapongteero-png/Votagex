import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { slide } from '@remotion/transitions/slide';

const DUR = 560; // ms
const ease = (t) => 1 - (1 - t) ** 3;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const meAt = (box, page) => box?.querySelector(`${page} .ds-me`)?.offsetLeft;

// The day scene (DayScene.jsx), changing over to the next when another profile is picked: the park slides
// across (Remotion's slide, @remotion/transitions, driven here frame by frame as its TransitionSeries would),
// in from the side the profile was picked on. I stay where I am on the page through it, gliding to my place in
// the next; the friends of the one going walk off to the right as it goes; once the next is in, its friends
// come in from the right, and only then say hi (CSS, .ds-swap-*). The next waits, unseen, until its people are
// drawn (onReady: at once if they've been seen before, never more than 0.7 s). Anything else (the weather
// coming in, a new note) changes the scene on show in place. With reduced motion, it just changes.
export default function SceneSwap({ at, children }) {
  const clip = useRef(null);
  const [width, setWidth] = useState(0);
  const [shown, setShown] = useState({ at, el: children }); // the scene on show, as last drawn
  const [out, setOut] = useState(null); // { at, el, from }: the one going
  const [p, setP] = useState(1); // how far the change has come, 0–1
  const [shift, setShift] = useState(0); // px from where I'll be to where I was
  const [arrived, setArrived] = useState(false); // the change just done: the next one's friends come in
  const frame = useRef(0);
  const run = useRef(0); // which change is going (a quick second pick starts another)
  const waiting = useRef(0); // the change waiting for its scene to be drawn

  if (at !== shown.at) {
    setShown({ at, el: children });
    if (!reduced()) {
      setOut({ at: shown.at, el: shown.el, from: at > shown.at ? 'right' : 'left' });
      setP(0);
      setArrived(false);
    }
  } else if (children !== shown.el) setShown({ at, el: children });

  const go = useCallback((id = waiting.current) => {
    if (!id || waiting.current !== id) return;
    waiting.current = 0;
    const was = meAt(clip.current, '.ds-swap-out'); const will = meAt(clip.current, '.ds-swap-coming');
    setShift(was != null && will != null ? was - will : 0);
    const t0 = performance.now();
    const tick = (t) => {
      if (run.current !== id) return;
      const k = Math.min(1, (t - t0) / DUR);
      setP(ease(k));
      if (k < 1) frame.current = requestAnimationFrame(tick);
      else {
        setOut(null);
        setArrived(true);
        // (only for their coming in: later changes of pose, as the weather comes in, just show)
        setTimeout(() => run.current === id && setArrived(false), 800);
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, []);
  const onReady = useCallback(() => go(), [go]);
  // a change begun (before the next scene's own effects, so its onReady is heard)
  useLayoutEffect(() => {
    if (!out) return undefined;
    run.current += 1;
    const id = run.current;
    cancelAnimationFrame(frame.current);
    waiting.current = id;
    const t = setTimeout(() => go(id), 700);
    return () => clearTimeout(t);
  }, [out, go]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // the page's width, how far the park slides
  useLayoutEffect(() => {
    const el = clip.current;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const from = out?.from || 'right';
  const { component: Slide, props } = slide({ direction: `from-${from}` });
  const side = from === 'right' ? 1 : -1;
  // (each scene keeps its key from coming in to going, so the one going is the same one, not drawn afresh;
  // --swap-off is how far its page has slid, for what stays put against it; --swap-k the time gone, 0–1, so
  // the friends going walk off at an even pace while the park slides fast then slow. The one going is on top:
  // its friends walk off over the next one sliding in, and its me, gliding the same way, covers the next's)
  return (
    <div className="ds-swap">
      <div className="ds-swap-clip" ref={clip}>
        <Slide key={`s${shown.at}`} presentationDirection="entering" presentationProgress={out ? p : 1} passedProps={props}>
          <div className={`ds-swap-page${out ? ' ds-swap-coming' : arrived ? ' ds-swap-arrived' : ''}`}
            style={out ? { '--swap-off': `${side * (1 - p) * width}px`, '--me-shift': `${shift * (1 - p)}px` } : undefined}>
            {cloneElement(children, { onReady })}
          </div>
        </Slide>
        {out && (
          <Slide key={`s${out.at}`} presentationDirection="exiting" presentationProgress={p} passedProps={props}>
            <div className="ds-swap-page ds-swap-out"
              style={{ '--swap-off': `${-side * p * width}px`, '--swap-k': 1 - Math.cbrt(1 - p), '--me-shift': `${-shift * p}px` }}>{out.el}</div>
          </Slide>
        )}
      </div>
    </div>
  );
}
