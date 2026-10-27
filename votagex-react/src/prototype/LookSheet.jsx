import { useState } from 'react';
import { useProto } from './useProto';
import { Seg, Sheet } from './ui';
import Icon from './icons';
import Peep from './Peep';
import { AVATAR_BOX, CHOICES, lookOf, pieceKey, piecesOf, usePeeps } from './peeps';
import { ME } from './data';

// How I'm drawn (Open Peeps, peeps.js): hair, face, beard, glasses and a light or dark top. The big one is me
// as I'll be in the day scene on home; each choice shows as my picture would (head and shoulders), which
// is my picture everywhere once kept (avatarOf). Kept on this phone (actions.setLook)

const TABS = [{ value: 'hair', label: 'ผม' }, { value: 'face', label: 'หน้า' }, { value: 'beard', label: 'หนวด' }, { value: 'glasses', label: 'แว่น' }, { value: 'tone', label: 'เสื้อ' }];
const TONE = { WB: 'เสื้อขาว', BW: 'เสื้อดำ' };
const body = (tone) => `standing/Resting${tone}`;
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default function LookSheet({ onClose }) {
  const { actions, showToast } = useProto();
  const [look, setLook] = useState(() => ({ beard: 'None', glasses: 'None', tone: 'BW', ...lookOf(ME) }));
  const [tab, setTab] = useState('hair');
  const options = CHOICES[tab];
  const tried = (v) => ({ ...look, [tab]: v });
  // my pieces first, then this tab's
  usePeeps(piecesOf(look, body(look.tone)));
  usePeeps(tab === 'tone' ? options.map(body) : options.map((v) => pieceKey(tab, v)));
  const shuffle = () => setLook({
    hair: pick(CHOICES.hair), face: pick(CHOICES.face.slice(0, 8)), tone: pick(CHOICES.tone),
    beard: Math.random() < 0.3 ? pick(CHOICES.beard.slice(1)) : 'None', glasses: Math.random() < 0.3 ? pick(CHOICES.glasses.slice(1, -1)) : 'None',
  });
  const keep = (close) => { actions.setLook(look); showToast('เปลี่ยนตัวละครแล้ว'); close(); };

  return (
    <Sheet title="ตัวละครของฉัน" onClose={onClose} tall footer={(close) => <button className="pt-btn block" onClick={() => keep(close)}>บันทึก</button>}>
      <div className="pt-look-stage">
        <svg viewBox="-60 0 1400 3000" aria-hidden="true"><Peep look={look} pose={body(look.tone)} /></svg>
        <button className="pt-round-btn sm pt-look-shuffle" aria-label="สุ่ม" onClick={shuffle}><Icon name="shuffle" size={18} /></button>
      </div>
      <Seg items={TABS} value={tab} onChange={setTab} />
      <div className="pt-look-grid">
        {options.map((v) => {
          const on = look[tab] === v;
          const l = tried(v);
          return (
            <button key={v} className={`pt-look-tile${on ? ' on' : ''}`} aria-pressed={on} aria-label={TONE[v] || v} onClick={() => setLook(l)}>
              <svg viewBox={AVATAR_BOX.join(' ')} aria-hidden="true"><Peep look={l} pose={body(l.tone)} /></svg>
              {(v === 'None' || TONE[v]) && <span>{TONE[v] || 'ไม่มี'}</span>}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
