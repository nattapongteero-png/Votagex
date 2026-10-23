import { lazy, Suspense, useRef, useState } from 'react';
import { useProto } from './useProto';
import { fmtMoney, jarCoins, jarStats } from './data';

// three.js loads only where a piggy is shown
const PiggyBank = lazy(() => import('./PiggyBank'));

// The glass pig with its coins (colours, one per coin) and up to four coin stacks beside it, each with its
// label and amount underneath. rows: [{ id, label, color, value, count }].
export function PiggyView({ pileId, coins, rows, onOpen }) {
  const [pos, setPos] = useState({ stacks: [], base: null }); // screen spots from the 3D scene
  // the canvas takes all touches (to spin the pig), so an up/down drag scrolls the page by hand
  const box = useRef(null);
  const scrollPage = (dy) => {
    let el = box.current?.parentElement;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    (el || document.scrollingElement)?.scrollBy({ top: dy });
  };

  return (
    <div ref={box} className="pt-piggy-stage">
      <Suspense fallback={null}>
        <PiggyBank pileId={pileId} coins={coins} stacks={rows.map((r) => ({ color: r.color, count: r.count }))}
          onStackLayout={setPos} onTap={onOpen} onVerticalDrag={scrollPage} />
      </Suspense>
      {rows.map((r, i) => pos.stacks[i] && (
        <button key={r.id} className="pt-stack-label" style={{ left: pos.stacks[i].x, top: pos.stacks[i].y + 10, '--coin': r.color }} onClick={onOpen}>
          <span>{r.label}</span><b>{fmtMoney(r.value)}</b>
        </button>
      ))}
    </div>
  );
}

// A savings piggy: its coins, and a stack per category whose height follows that category's share of the money
export default function PiggyStage({ jar, onOpen }) {
  const { piggyLog, plans, expenses } = useProto();
  const stats = jarStats(jar, piggyLog, plans, expenses);
  const rows = stats.rows.filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 4)
    .map((r) => ({ ...r, value: r.balance, count: Math.max(1, Math.min(7, Math.round((r.balance / Math.max(1, stats.balance)) * 9))) }));
  return <PiggyView pileId={jar.id} coins={jarCoins(jar, piggyLog, plans, expenses)} rows={rows} onOpen={onOpen} />;
}
