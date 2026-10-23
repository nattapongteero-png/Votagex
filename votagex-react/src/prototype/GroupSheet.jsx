import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto } from './useProto';
import { Sheet, Avatar } from './ui';
import Icon from './icons';
import { ME, PEOPLE, GROUP_COLORS, GROUP_ICONS, planStatus, thaiRange, sendInvite } from './data';

const INVITE = 'https://votagex.app/g/AB12CD'; // demo link

function PeoplePicker({ members, setMembers }) {
  return (
    <div className="pt-people">
      {Object.values(PEOPLE).map((p) => (
        <button key={p.id} className={`pt-person check${members.includes(p.id) ? ' active' : ''}`} disabled={p.id === ME}
          onClick={() => setMembers((m) => (m.includes(p.id) ? m.filter((x) => x !== p.id) : [...m, p.id]))}>
          <Avatar id={p.id} size={40} /><span>{p.id === ME ? 'ฉัน' : p.name}</span>
          {members.includes(p.id) && <i className="pt-person-check"><Icon name="check" size={12} stroke={3} /></i>}
        </button>
      ))}
      <button className="pt-person invite" onClick={() => navigator.clipboard?.writeText(INVITE).catch(() => {})}>
        <span className="pt-invite-icon"><Icon name="link" size={18} /></span><span>ชวนด้วยลิงก์</span>
      </button>
    </div>
  );
}

// A new travel group; home then switches to it
export function NewGroupSheet({ onClose }) {
  const { groups, actions, showToast, cloud } = useProto();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('users');
  const [color, setColor] = useState(GROUP_COLORS[groups.length % GROUP_COLORS.length]);
  const [members, setMembers] = useState([ME]);

  const create = (close) => {
    const id = actions.addGroup({ name: name.trim(), icon, color, members });
    actions.setSetting('scope', id);
    showToast(`สร้างกลุ่ม “${name.trim()}” แล้ว`);
    close();
    if (cloud) setTimeout(() => actions.invite({ id, name: name.trim() }).then((link) => sendInvite(link, name.trim(), showToast)).catch(() => {}), 400);
  };

  return (
    <Sheet title="กลุ่มใหม่" onClose={onClose} tall
      footer={name.trim() ? (close) => <button className="pt-btn block" onClick={() => create(close)}>สร้างกลุ่ม</button> : null}>
      <div className="pt-group-preview">
        <span className="pt-group-badge lg" style={{ background: color }}><Icon name={icon} size={26} /></span>
        <input className="pt-input" autoFocus placeholder="ชื่อกลุ่ม" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="pt-label">ไอคอน</div>
      <div className="pt-chip-row wrap">
        {GROUP_ICONS.map((k) => (
          <button key={k} className={`pt-icon-pick${icon === k ? ' active' : ''}`} onClick={() => setIcon(k)} aria-label={k}><Icon name={k} size={20} /></button>
        ))}
      </div>
      <div className="pt-label">สี</div>
      <div className="pt-chip-row">
        {GROUP_COLORS.map((c) => (
          <button key={c} className={`pt-color-pick${color === c ? ' active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} aria-label={c} />
        ))}
      </div>
      {/* signed in, friends join through the invite link once the group exists */}
      {!cloud && (
        <>
          <div className="pt-label">สมาชิก</div>
          <PeoplePicker members={members} setMembers={setMembers} />
        </>
      )}
    </Sheet>
  );
}

// A group: who's in it, its trips, the invite link; whoever made it can delete it
export function GroupSheet({ onClose, groupId }) {
  const { groups, plans, today, actions, showToast, openSheet } = useProto();
  const [inviting, setInviting] = useState(false);
  const navigate = useNavigate();
  const g = groups.find((x) => x.id === groupId);
  if (!g) return null;
  const trips = plans.filter((p) => p.groupId === g.id).sort((a, b) => (b.startDate || '9').localeCompare(a.startDate || '9'));

  return (
    <Sheet title={g.name} subtitle={`${g.members.length} คน`} onClose={onClose} tall>
      {(close) => (
        <>
          <div className="pt-people">
            {g.members.map((id) => (
              <span key={id} className="pt-person"><Avatar id={id} size={40} /><span>{id === ME ? 'ฉัน' : PEOPLE[id]?.name}</span></span>
            ))}
            <button className="pt-person invite" disabled={inviting} onClick={() => {
              setInviting(true);
              actions.invite(g).then((link) => sendInvite(link, g.name, showToast)).catch(() => showToast('สร้างลิงก์ไม่สำเร็จ')).finally(() => setInviting(false));
            }}>
              <span className="pt-invite-icon"><Icon name="link" size={18} /></span><span>ชวนเพื่อน</span>
            </button>
          </div>

          <div className="pt-label">แผนของกลุ่ม</div>
          <div className="pt-results">
            <button className="pt-result accent" onClick={() => { close(); setTimeout(() => openSheet('createPlan', { groupId: g.id }), 320); }}>
              <span className="pt-cat-icon" style={{ width: 36, height: 36, background: g.color, color: '#fff' }}><Icon name="plus" size={18} /></span>
              <span className="pt-grow"><span className="pt-strong">แผนใหม่</span></span>
            </button>
            {trips.map((p) => (
              <button key={p.id} className="pt-result" onClick={() => { close(); setTimeout(() => navigate(`/proto/plan/${p.id}`), 320); }}>
                <span className="pt-grow">
                  <span className="pt-strong">{p.name}</span>
                  <span className="pt-muted">{p.startDate ? thaiRange(p.startDate, p.endDate) : 'ยังไม่กำหนดวัน'}{planStatus(p, today) === 'past' ? ' · ไปแล้ว' : ''}</span>
                </span>
                <Icon name="next" size={18} />
              </button>
            ))}
          </div>

          {g.createdBy === ME ? (
            <button className="pt-btn light block pt-ev-remove" onClick={() => { actions.removeGroup(g.id); showToast(`ลบกลุ่ม “${g.name}” แล้ว ทริปยังอยู่`); close(); }}>ลบกลุ่ม</button>
          ) : (
            <button className="pt-btn light block pt-ev-remove" onClick={() => { actions.leaveGroup(g.id); actions.setSetting('scope', 'me'); showToast(`ออกจาก “${g.name}” แล้ว`); close(); }}>ออกจากกลุ่ม</button>
          )}
        </>
      )}
    </Sheet>
  );
}
