import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon from '../icons';
import { ME } from '../data';
import { joinGroup, readInvite } from '../cloud';

// /proto/join/:code — an invite link from a friend: who's inviting where, then join with one tap
export default function JoinPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { groups, actions, showToast } = useProto();
  const [invite, setInvite] = useState(undefined); // undefined: loading, null: bad or expired link
  const [busy, setBusy] = useState(false);
  useEffect(() => { readInvite(code).then(setInvite); }, [code]);

  const already = invite && groups.some((g) => g.id === invite.groupId);
  const open = () => { actions.setSetting('scope', invite.groupId); navigate('/proto/today', { replace: true }); };
  const join = async () => {
    setBusy(true);
    try {
      await joinGroup(ME, invite);
      showToast(`เข้าร่วม “${invite.groupName}” แล้ว`);
      open();
    } catch {
      showToast('เข้าร่วมไม่สำเร็จ ลิงก์อาจหมดอายุ');
      setBusy(false);
    }
  };

  return (
    <div className="pt-login">
      <div className="pt-login-hero">
        <span className="pt-group-badge lg pt-join-badge"><Icon name="users" size={26} /></span>
        {invite === undefined && <div className="pt-login-tag">กำลังเปิดลิงก์…</div>}
        {invite === null && <div className="pt-login-tag">ลิงก์นี้ใช้ไม่ได้หรือหมดอายุแล้ว ขอลิงก์ใหม่จากเพื่อนนะ</div>}
        {invite && <><div className="pt-login-tag">เพื่อนชวนเข้ากลุ่ม</div><div className="pt-login-logo sm">{invite.groupName}</div></>}
      </div>
      <div className="pt-login-actions">
        {invite && (already
          ? <button className="pt-login-btn primary" onClick={open}>เปิดกลุ่ม</button>
          : <button className="pt-login-btn primary" disabled={busy} onClick={join}>เข้าร่วมกลุ่ม</button>)}
        <button className="pt-login-demo" onClick={() => navigate('/proto/today', { replace: true })}>ไปหน้าแรก</button>
      </div>
    </div>
  );
}
