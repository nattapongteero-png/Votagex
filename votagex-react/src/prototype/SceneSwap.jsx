import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SCENE_SWAPS } from './sceneSwaps';

const DUR = 560; // ms
const ease = (t) => 1 - (1 - t) ** 3;
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The day scene (DayScene.jsx), changing over to the next with one of Remotion's transitions (sceneSwaps.js)
// when another profile is picked: `at` is its place along the profile row, so the next comes in from the side
// it was picked on. The one going stays as it was last drawn; the next waits, unseen, until its people are
// drawn (onReady: at once if they've been seen before, never more than 0.7 s), then the two change over, the
// transition driven here frame by frame as Remotion's TransitionSeries would. Anything else (the weather coming
// in, a new note) changes the scene on show in place. With reduced motion, it just changes.
export default function SceneSwap({ at, kind = 'slide', children }) {
  const clip = useRef(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [shown, setShown] = useState({ at, el: children }); // the scene on show, as last drawn
  const [out, setOut] = useState(null); // { at, el, from }: the one going
  const [p, setP] = useState(1); // how far the change has come, 0–1
  const frame = useRef(0);
  const run = useRef(0); // which change is going (a quick second pick starts another)
  const waiting = useRef(0); // the change waiting for its scene to be drawn

  if (at !== shown.at) {
    setShown({ at, el: children });
    if (!reduced()) {
      setOut({ at: shown.at, el: shown.el, from: at > shown.at ? 'right' : 'left' });
      setP(0);
    }
  } else if (children !== shown.el) setShown({ at, el: children });

  const go = useCallback((id = waiting.current) => {
    if (!id || waiting.current !== id) return;
    waiting.current = 0;
    const t0 = performance.now();
    const tick = (t) => {
      if (run.current !== id) return;
      const k = Math.min(1, (t - t0) / DUR);
      setP(ease(k));
      if (k < 1) frame.current = requestAnimationFrame(tick);
      else setOut(null);
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

  // the box's size, for the transitions drawn round its middle (iris, clock wipe)
  useLayoutEffect(() => {
    const el = clip.current;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { component: Swap, props } = (SCENE_SWAPS.find(([k]) => k === kind) || SCENE_SWAPS[0])[2](out?.from || 'right', size);
  // (each scene keeps its key from coming in to going, so the one going is the same one, not drawn afresh)
  return (
    <div className="ds-swap">
      <div className="ds-swap-clip" ref={clip}>
        {out && (
          <Swap key={`s${out.at}`} presentationDirection="exiting" presentationProgress={p} passedProps={props}>
            <div className="ds-swap-page ds-swap-out">{out.el}</div>
          </Swap>
        )}
        <Swap key={`s${shown.at}`} presentationDirection="entering" presentationProgress={out ? p : 1} passedProps={props}>
          <div className="ds-swap-page">{cloneElement(children, { onReady })}</div>
        </Swap>
      </div>
    </div>
  );
}
