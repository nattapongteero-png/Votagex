import { useEffect, useLayoutEffect, useRef } from 'react';

const HANDLE_ZONE = 24; // frame starts this far above the first card (room for the grab handle)
const BASE_PADDING = 120; // .hp-content bottom padding (clears the dock)

/**
 * ThaiWell home "2-step sheet" on the web.
 * Step 1: cards sit low over the stage. Step 2: the sheet rises to just under the header,
 * then the list scrolls normally. Stopping in between snaps to a step in the scroll direction:
 * moving up past 20% → step 2, moving down past 20% → step 1 (same rule as ThaiWell).
 *
 * Expects inside pageRef: .hp-pill-row (or .hp-header-top when there is none), .hp-content > .hp-stage-spacer + first card,
 * and .hp-sheet-frame > .hp-sheet-bg.
 */
// Browsers with scroll-driven animations can move the sheet frame on the compositor, in step with the scroll
// (the page's CSS does it from --sheet-range); elsewhere it follows scroll events and lags a frame behind.
const CSS_DRIVEN = typeof CSS !== 'undefined' && CSS.supports?.('animation-timeline: scroll()');

export default function useSheetSnap(pageRef, { cssDriven = false } = {}) {
  const s = useRef({ range: 0, wheelAt: -1e9, lastY: 0, up: true, touching: false, timer: null });
  const byCss = cssDriven && CSS_DRIVEN;

  const apply = (y) => {
    const page = pageRef.current;
    const { range } = s.current;
    if (!page) return;
    page.classList.toggle('sheet-open', range > 0 && y >= range - 2);
    // how far the list has scrolled on past open, up to 48px: the prototype's fade under the handle grows with it
    const fade = Math.round(Math.min(48, Math.max(0, y - range)));
    if (s.current.fade !== fade) { s.current.fade = fade; page.style.setProperty('--hp-fade', `${fade}px`); }
    if (byCss) return;
    const p = Math.min(Math.max(y, 0), range);
    const frame = page.querySelector('.hp-sheet-frame');
    const bg = page.querySelector('.hp-sheet-bg');
    if (frame) frame.style.transform = `translateY(${-p}px)`;
    if (bg) bg.style.opacity = range ? String(Math.min(1, Math.max(0, (p - range * 0.2) / (range * 0.8)))) : '0';
    page.style.setProperty('--sheet-p', range ? (p / range).toFixed(3) : '0'); // 0 resting → 1 open, for CSS
  };

  // Measure every render (cheap reads) so the steps follow content and font changes
  useLayoutEffect(() => {
    const page = pageRef.current;
    const content = page?.querySelector('.hp-content');
    const spacer = page?.querySelector('.hp-stage-spacer');
    const pills = page?.querySelector('.hp-pill-row') || page?.querySelector('.hp-header-top');
    const frame = page?.querySelector('.hp-sheet-frame');
    const first = spacer?.nextElementSibling;
    if (!content || !pills || !frame || !first) return;

    const pageTop = page.getBoundingClientRect().top;
    const stopTop = pills.getBoundingClientRect().bottom - pageTop + 10; // frame top at step 2
    const restTop = first.offsetTop - HANDLE_ZONE; // frame top at step 1
    const range = Math.max(0, Math.round(restTop - stopTop));
    s.current.range = range;
    frame.style.top = `${restTop}px`;
    page.style.setProperty('--hp-mask-top', `${stopTop + HANDLE_ZONE - 6}px`);
    page.style.setProperty('--sheet-range', `${Math.max(1, range)}px`);

    // Short lists still need enough scroll room to reach step 2. Measured from the padding already there, never
    // by setting it back first: that would shrink the list mid-scroll and the browser would pull it back down
    const pad = parseFloat(content.style.paddingBottom) || BASE_PADDING;
    const missing = range - (content.scrollHeight - pad + BASE_PADDING - content.clientHeight);
    const want = BASE_PADDING + Math.max(0, missing);
    if (Math.abs(want - pad) > 0.5) content.style.paddingBottom = `${want}px`;
    apply(content.scrollTop);
  });

  useEffect(() => {
    const page = pageRef.current;
    const el = page?.querySelector('.hp-content');
    if (!el) return undefined;
    const st = s.current;

    const snap = () => {
      const y = el.scrollTop;
      const { range } = st;
      if (st.touching || !range || y <= 2 || y >= range - 2) return;
      const to = st.up ? (y > range * 0.2 ? range : 0) : (y < range * 0.8 ? 0 : range);
      el.scrollTo({ top: to, behavior: 'smooth' });
    };
    // snap once the scroll has really come to rest (momentum included), so it never pulls against a fling;
    // browsers without `scrollend` fall back to a short pause. A mouse wheel ends a scroll at every notch,
    // so after wheel input it waits for the wheel to go quiet instead.
    const hasEnd = 'onscrollend' in window;
    const later = (ms) => { clearTimeout(st.timer); st.timer = setTimeout(snap, ms); };
    const schedule = () => { if (!hasEnd) later(160); };
    const onEnd = () => (performance.now() - st.wheelAt < 350 ? later(350) : snap());
    const onScroll = () => {
      const y = el.scrollTop;
      st.up = y > st.lastY ? true : y < st.lastY ? false : st.up;
      st.lastY = y;
      apply(y);
      clearTimeout(st.timer); // still moving (momentum after a touch, too)
      schedule();
    };
    const onTouchStart = () => { st.touching = true; };
    const onWheel = () => { st.wheelAt = performance.now(); };
    // a drag may also start outside the list (e.g. a stage that forwards it), so touches are watched on the page;
    // without momentum no scrollend follows, so a touch also ends in a snap unless scrolling carries on
    const onTouchEnd = () => { st.touching = false; later(hasEnd ? 220 : 160); };
    const onResize = () => apply(el.scrollTop);

    el.addEventListener('scroll', onScroll, { passive: true });
    if (hasEnd) el.addEventListener('scrollend', onEnd);
    page.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    page.addEventListener('touchend', onTouchEnd, { passive: true });
    page.addEventListener('touchcancel', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(st.timer);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onEnd);
      page.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('wheel', onWheel);
      page.removeEventListener('touchend', onTouchEnd);
      page.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
