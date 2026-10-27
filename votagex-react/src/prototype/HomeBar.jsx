import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from './useProto';
import Icon from './icons';
import { Empty, Sheet } from './ui';
import { useActivity } from './activity';
import { ME, PEOPLE, diffDays } from './data';

// The home page's top bar, as Instagram's: + (make something) on the left, the name in the middle, and a
// bell on the right for what came in (activity.js), with a red dot while something there is unseen. What's
// been seen is remembered on this device only.

const SEEN = 'votagex.proto.activitySeen';
const readSeen = () => { try { return JSON.parse(localStorage.getItem(SEEN)) || []; } catch { return []; } };
const after = (close, fn) => { close(); setTimeout(fn, 320); };

// onRecap(planId): play a trip's film (the home page holds the player)
export default function HomeBar({ onRecap }) {
  const { openSheet } = useProto();
  const items = useActivity();
  const [seen, setSeen] = useState(readSeen);
  const fresh = items.filter((it) => !seen.includes(it.id)).map((it) => it.id);
  const open = () => {
    const ids = items.map((it) => it.id);
    try { localStorage.setItem(SEEN, JSON.stringify(ids)); } catch { /* the dot comes back next time */ }
    setSeen(ids);
    openSheet('activity', { fresh, onRecap });
  };
  return (
    <div className="pt-topbar">
      <button className="pt-topbar-btn" aria-label="สร้าง" onClick={() => openSheet('create')}><Icon name="plus" size={26} stroke={2} /></button>
      <span className="pt-topbar-logo">VOTAGEX</span>
      <button className="pt-topbar-btn" aria-label={fresh.length ? `กิจกรรม ${fresh.length} รายการใหม่` : 'กิจกรรม'} onClick={open}>
        <Icon name="bell" size={25} stroke={2} />
        {fresh.length > 0 && <i className="pt-topbar-dot" />}
      </button>
    </div>
  );
}

function Row({ icon, label, sub, onClick }) {
  return (
    <button className="pt-result" onClick={onClick}>
      <span className="pt-menu-icon"><Icon name={icon} size={18} /></span>
      <span className="pt-grow"><span className="pt-strong">{label}</span>{sub && <span className="pt-muted sm">{sub}</span>}</span>
    </button>
  );
}

// +: what there is to make, the trip under way's things first while there is one
export function CreateSheet({ onClose }) {
  const { activePlan: live, postcards, openSheet } = useProto();
  const sent = live && postcards.some((x) => x.planId === live.id && x.by === ME);
  const rows = [
    live && ['wallet', 'จดรายจ่าย', live.name, () => openSheet('expense')],
    live && ['camera', 'เพิ่มรูป / โน้ต', live.name, () => openSheet('memory')],
    live && !sent && ['mail', 'เขียนโปสการ์ดถึงตัวเอง', live.name, () => openSheet('postcard', { planId: live.id })],
    ['link', 'วางลิงก์ TikTok / IG', null, () => openSheet('savePlace')],
    ['plans', 'สร้างแผน', null, () => openSheet('createPlan')],
    !live && ['wallet', 'จดรายจ่าย', null, () => openSheet('expense')],
  ].filter(Boolean);
  return (
    <Sheet title="สร้าง" onClose={onClose}>
      {(close) => (
        <div className="pt-results">
          {rows.map(([icon, label, sub, go]) => <Row key={label} icon={icon} label={label} sub={sub} onClick={() => after(close, go)} />)}
        </div>
      )}
    </Sheet>
  );
}

const when = (date, today) => {
  const n = diffDays(date, today);
  return n <= 0 ? 'วันนี้' : n === 1 ? 'เมื่อวาน' : `${n} วันก่อน`;
};

// the bell: what came in, today's first; what's new since last time is tinted
export function ActivitySheet({ onClose, fresh = [], onRecap }) {
  const { today, openSheet } = useProto();
  const navigate = useNavigate();
  const items = useActivity();
  const go = (close, { go: to }) => after(close, () => {
    if (to.sheet) openSheet(...to.sheet);
    else if (to.plan) navigate(`/proto/plan/${to.plan[0]}?tab=${to.plan[1]}`);
    else if (to.recap) onRecap?.(to.recap);
  });
  const sections = [['วันนี้', items.filter((it) => it.date >= today)], ['ก่อนหน้านี้', items.filter((it) => it.date < today)]].filter(([, list]) => list.length);
  return (
    <Sheet title="กิจกรรม" onClose={onClose} tall>
      {(close) => (items.length ? (
        <div className="pt-act">
          {sections.map(([label, list]) => (
            <section key={label}>
              <div className="pt-label">{label}</div>
              {list.map((it) => (
                <button key={it.id} className={`pt-act-row${fresh.includes(it.id) ? ' new' : ''}`} onClick={() => go(close, it)}>
                  <span className="pt-act-who">
                    {it.who ? <img src={PEOPLE[it.who]?.avatar} alt="" /> : <Icon name={it.icon} size={22} />}
                    {it.who && <i className="pt-act-badge"><Icon name={it.icon} size={12} stroke={2.2} /></i>}
                  </span>
                  <span className="pt-grow">
                    <span className="pt-act-text">{it.who && <b>{PEOPLE[it.who]?.name} </b>}{it.text}</span>
                    <span className="pt-muted sm">{it.where ? `${it.where} · ` : ''}{when(it.date, today)}</span>
                  </span>
                  {it.action ? <span className="pt-pill-btn sm">{it.action}</span> : it.thumb && <i className="pt-act-thumb" style={{ backgroundImage: `url(${it.thumb})` }} />}
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : <Empty>ยังไม่มีอะไรใหม่</Empty>)}
    </Sheet>
  );
}
