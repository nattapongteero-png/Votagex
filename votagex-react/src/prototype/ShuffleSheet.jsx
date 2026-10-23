import { useEffect, useRef, useState } from 'react';
import { useProto } from './useProto';
import { Sheet, CatIcon } from './ui';
import Icon, { SourceBadge } from './icons';
import { EVENT_KINDS, ME, PLACE_CATS, fmtKm, shufflePool, thaiShort } from './data';

function pickFrom(pool, skip) {
  const left = pool.filter((p) => !skip.has(p.id));
  const from = left.length ? left : pool;
  let r = Math.random() * from.reduce((s, p) => s + p.weight, 0);
  return from.find((p) => (r -= p.weight) <= 0) || from[from.length - 1];
}

const ROLL_MS = 900;

export default function ShuffleSheet({ onClose, date }) {
  const { places, plans, groups, settings, actions, showToast, today } = useProto();
  const group = groups.find((g) => g.id === settings.scope) || null;
  const day = date && date >= today ? date : today;
  // the pool is fixed while the sheet is open, so the card doesn't jump when the plan gets made
  const [pool] = useState(() => shufflePool(places, plans, day, group));
  const seen = useRef(new Set());
  const [pick, setPick] = useState(null);
  const [flash, setFlash] = useState(null); // names flicking past while it rolls
  const timers = useRef([]);

  // names flick past, slowing down as it lands, like a slot machine
  const spin = (next) => {
    timers.current.forEach(clearTimeout);
    const still = pool.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let t = 0;
    timers.current = still ? [] : Array.from({ length: 9 }, (_, i) => {
      t += 50 + i * 12;
      return setTimeout(() => setFlash(pool[Math.floor(Math.random() * pool.length)]), t);
    });
    timers.current.push(setTimeout(() => { setFlash(null); setPick(next); }, still ? 0 : ROLL_MS));
  };
  const nextPick = () => {
    if (seen.current.size >= pool.length) seen.current.clear();
    const next = pickFrom(pool, seen.current);
    seen.current.add(next.id);
    return next;
  };
  const roll = () => { setPick(null); spin(nextPick()); };
  useEffect(() => {
    const list = timers.current;
    if (pool.length) spin(nextPick());
    return () => list.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // straight to an outing that day; the toast can take it back
  const go = (close) => {
    const p = pick;
    const cat = p.cat in PLACE_CATS ? p.cat : 'sight';
    const name = `ไป ${p.name}`;
    const id = actions.addPlan({
      name, kind: 'outing', country: 'TH', currency: 'THB',
      destination: { name: p.name, lat: p.lat, lng: p.lng },
      startDate: day, endDate: day, members: group ? group.members : [ME], groupId: group?.id || null, budget: 0,
      cover: { icon: cat, tint: PLACE_CATS[cat].bg },
      stops: [{ date: day, time: p.time || '', name: p.name, area: p.venue || p.area, prov: p.prov, lat: p.lat, lng: p.lng, cat, note: '', checkIns: {}, placeId: p.id }],
    });
    close();
    setTimeout(() => showToast(`${day === today ? 'วันนี้' : thaiShort(day)} ${name}`, { label: 'เลิกทำ', onClick: () => actions.discardPlan(id) }), 340);
  };

  const shown = flash || pick;
  const kind = shown?.startDate && (EVENT_KINDS[shown.kind] || EVENT_KINDS.other);

  return (
    <Sheet title="สุ่มที่เที่ยว" subtitle={day === today ? 'วันนี้' : thaiShort(day)} onClose={onClose}
      footer={pool.length ? (close) => (
        <div className="pt-foot-row">
          <button className="pt-btn light" disabled={!pick || pool.length < 2} onClick={roll}><Icon name="shuffle" size={16} /> สุ่มใหม่</button>
          <button className="pt-btn" disabled={!pick} onClick={() => go(close)}>ไปที่นี่</button>
        </div>
      ) : null}>
      {pool.length ? shown && (
        <div className={`hp-tile pt-shuffle-card${flash ? ' rolling' : ' landed'}`} key={flash ? 'roll' : pick.id}>
          <CatIcon cat={shown.cat} size={56} />
          <div className="pt-grow">
            {kind && <div className="pt-muted sm">{kind.label}{shown.time ? ` · ${shown.time} น.` : ''}</div>}
            <div className="pt-strong lg">{shown.name}</div>
            <div className="pt-muted">{shown.venue || shown.area} · ห่าง {fmtKm(shown.km)}</div>
            {!flash && shown.note && <div className="pt-note">“{shown.note}”</div>}
          </div>
          {!flash && shown.source?.type && shown.source.type !== 'web' && <SourceBadge type={shown.source.type} size={26} />}
        </div>
      ) : (
        <div className="pt-empty">ยังไม่มีที่อยากไปที่ยังไม่เคยไป</div>
      )}
    </Sheet>
  );
}
