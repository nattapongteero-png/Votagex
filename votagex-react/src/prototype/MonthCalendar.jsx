import { Fragment, useRef, useState } from 'react';
import Icon from './icons';
import { useWeather, weatherKind } from './weather';
import { PosterPage } from './posterTheme';
import { loopPath, swipePath } from './sketch';
import { HOME, RISO_INKS, addDays, diffDays, iso, parseISO } from './data';
import HOLIDAYS from './thHolidays.json';

const ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const LABELS = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];
const EN_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const FORECAST_DAYS = 16;
const THEME_KEY = 'votagex.proto.calTheme'; // picked on the profile page
const read = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const SWIPE = 50; // px sideways to turn the page
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const monthOf = (ym, n) => { const [y, m] = ym.split('-').map(Number); return iso(new Date(y, m - 1 + n, 1)).slice(0, 7); };

// Ragged edge along the top of a page torn off the binding
const TORN = `polygon(${Array.from({ length: 41 }, (_, i) => `${i * 2.5}% ${i % 2 ? 0 : 5}px`).join(', ')}, 100% 100%, 0 100%)`;

function Starburst() {
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 30 : 50;
    return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
  }).join(' ');
  return <svg className="pt-riso-burst" viewBox="0 0 100 100" aria-hidden="true"><polygon points={pts} /></svg>;
}

// Two-colour risograph wall calendar on grainy paper: huge month letters, circles on Saturdays and
// starbursts on Sundays, public holidays in the accent ink like Sundays, inks picked per month. Changing
// month tears the page off (or sticks the previous one back on). Shows plan markers and the forecast (trip
// destination that day, else home) for the next 16 days.
// It always lays out the whole month; the page's sheet folds it (CSS --fold, 0 → 1 as the sheet rises)
// down to the month header and the week holding the selected day.
export default function MonthCalendar({ selected, today, onSelect, stopsOn, plans }) {
  const root = useRef(null);
  const [theme] = useState(() => read(THEME_KEY, 'riso'));
  const [view, setView] = useState(() => selected.slice(0, 7)); // "YYYY-MM" shown
  const [flip, setFlip] = useState(null); // { month, dir: 'off' | 'on' } page being torn off / put back
  const month = view;
  const folded = () => root.current && parseFloat(getComputedStyle(root.current).getPropertyValue('--fold')) > 0.5;

  // swipe sideways: a month at a time, or a week at a time (moving the selected day) while folded
  const shift = (n) => {
    if (folded()) {
      const d = addDays(selected, n * 7);
      setFlip(null);
      setView(d.slice(0, 7));
      onSelect(d);
      return;
    }
    const cur = flip?.dir === 'on' ? flip.month : view; // tapping fast: finish the running flip first
    const next = monthOf(cur, n);
    if (reducedMotion()) { setFlip(null); setView(next); return; }
    const key = (flip?.key || 0) + 1;
    // poster: no tearing — the old month slides out and fades while the new one slides in
    if (theme === 'poster') { setFlip({ month: cur, dir: n > 0 ? 'out-next' : 'out-prev', key }); setView(next); return; }
    if (n > 0) { setFlip({ month: cur, dir: 'off', key }); setView(next); } // old page tears away over the new one
    else { setView(cur); setFlip({ month: next, dir: 'on', key }); } // previous page comes back on top, then becomes the view
  };
  const endFlip = () => {
    if (flip?.dir === 'on') setView(flip.month);
    setFlip(null);
  };

  // where to ask for weather on each forecast day
  const tripOn = (d) => plans.find((p) => p.kind !== 'outing' && p.destination?.lat && p.startDate && d >= p.startDate && d <= (p.endDate || p.startDate));
  const points = {};
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const d = addDays(today, i);
    points[d] = tripOn(d)?.destination || HOME;
  }
  const weather = useWeather(points);

  // whole weeks, Monday start; days of the next/previous month show as outlines
  const weeksOf = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    const first = iso(new Date(y, m - 1, 1));
    const start = addDays(first, -((new Date(y, m - 1, 1).getDay() + 6) % 7));
    const n = Math.ceil((diffDays(start, iso(new Date(y, m, 0))) + 1) / 7);
    return Array.from({ length: n }, (_, w) => Array.from({ length: 7 }, (_, i) => addDays(start, w * 7 + i)));
  };
  // the week left when folded: the selected day's, else today's, else the first
  const keepWeek = (weeks) => Math.max(0, [selected, today].map((d) => weeks.findIndex((w) => w.includes(d))).find((i) => i >= 0) ?? 0);
  const renderWx = (d) => {
    const w = weather[d];
    return <span className="pt-riso-wx">{w && <Icon name={weatherKind(w.code).icon} size={12} stroke={2} />}</span>;
  };

  const page = (ym, className = '', extra = {}, torn = false) => {
    const weeks = weeksOf(ym);
    const keep = keepWeek(weeks);
    if (theme === 'poster') {
      return (
        <PosterPage ym={ym} weeks={weeks} keep={keep} today={today} selected={selected} stopsOn={stopsOn} onSelect={onSelect}
          renderWx={renderWx} className={className} style={torn ? { clipPath: TORN } : undefined} {...extra} />
      );
    }
    const [y, m] = ym.split('-').map(Number);
    const [ink, accent] = RISO_INKS[m - 1];
    const dayClass = (d) => {
      const dow = parseISO(d).getDay();
      return `pt-riso-day${dow === 6 ? ' sat' : dow === 0 ? ' sun' : ''}${d.slice(0, 7) !== ym ? ' other' : ''}${d === today ? ' today' : ''}${d === selected ? ' selected' : ''}${d < today ? ' past' : ''}${HOLIDAYS[d] ? ' holiday' : ''}`;
    };
    return (
      <div className={`pt-riso-page ${className}`} style={{ '--ink': ink, '--accent': accent, clipPath: torn ? TORN : undefined }} {...extra}>
        <div className="pt-riso-head">
          <div className="pt-riso-tags">
            <span className="pt-riso-th">{MONTHS[m - 1]}</span>
            <span className="pt-riso-year">{y + 543}</span>
          </div>
          <span className="pt-riso-num">{m}</span>
          <div className="pt-riso-abbr">{ABBR[m - 1]}</div>
        </div>
        <div className="pt-riso-labels">
          {LABELS.map((l, i) => (
            <span key={l} className={i >= 5 ? 'end' : ''}><b>{l}</b><small>{EN_DAYS[i]}</small></span>
          ))}
        </div>
        <div className="pt-riso-grid">
          {weeks.map((cells, w) => (
            <div key={cells[0]} className={`pt-riso-week${w === keep ? '' : ' pt-fold-away'}`}>
              {cells.map((d) => {
                const seed = Number(d.replaceAll('-', ''));
                return (
                  <button key={d} className={dayClass(d)} title={HOLIDAYS[d]} onClick={() => onSelect(d)}>
                    {/* hand-written marks on the printed sheet: yellow swipe = today, red loop = selected */}
                    <span className="pt-riso-n">
                      {parseISO(d).getDay() === 0 && d.slice(0, 7) === ym && <Starburst />}
                      {d === today && <svg className="pt-sk-swipe" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={swipePath(seed)} /></svg>}
                      <b>{parseISO(d).getDate()}</b>
                      {d === selected && <svg className="pt-sk-loop" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d={loopPath(seed)} pathLength="1" /></svg>}
                    </span>
                    {renderWx(d)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const swipe = useRef(null);
  const down = (e) => { swipe.current = { x: e.clientX, y: e.clientY, used: false }; };
  const up = (e) => {
    const t = swipe.current;
    if (!t) return;
    const dx = e.clientX - t.x, dy = e.clientY - t.y;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) { t.used = true; shift(dx < 0 ? 1 : -1); }
  };
  // a swipe that ends on a day must not also pick it
  const eatClick = (e) => { if (swipe.current?.used) { e.stopPropagation(); swipe.current = null; } };

  return (
    <div ref={root} className={`pt-riso theme-${theme}`} onPointerDown={down} onPointerUp={up} onClickCapture={eatClick}>

      <div className="pt-riso-stack">
        <Fragment key={`page-${flip?.key ?? 0}`}>{page(month, flip && theme === 'poster' ? `pt-swap-in ${flip.dir}` : '')}</Fragment>
        {flip && <Fragment key={`flip-${flip.key}`}>{page(flip.month, `pt-riso-flip ${flip.dir}`, { onAnimationEnd: endFlip, 'aria-hidden': true }, theme === 'riso')}</Fragment>}
      </div>

    </div>
  );
}
