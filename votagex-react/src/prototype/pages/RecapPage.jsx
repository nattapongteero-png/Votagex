import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import MapView from '../MapView';
import { Avatar, Avatars } from '../ui';
import { PEOPLE, EXPENSE_CATS, countryOf, thaiRange, thaiShort, dayList, byTime, distanceKm, fmtKm, fmtMoney, toTHB, myShare } from '../data';

// Auto-generated story of a finished plan: route, numbers, best photos and notes
export default function RecapPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { plans, memories, expenses, showToast } = useProto();
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return <Navigate to="/proto/plans" replace />;

  const days = dayList(plan.startDate, plan.endDate);
  const stops = plan.stops.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || byTime(a, b));
  const km = stops.reduce((s, st, i) => (i ? s + distanceKm(stops[i - 1], st) : 0), 0);
  const mems = memories.filter((m) => m.planId === plan.id).sort((a, b) => a.date.localeCompare(b.date));
  const photos = mems.filter((m) => m.photos?.length);
  const exp = expenses.filter((e) => e.planId === plan.id);
  const total = exp.reduce((s, e) => s + toTHB(e), 0);
  const perPerson = exp.reduce((s, e) => s + myShare(e), 0);
  const topCat = Object.entries(exp.reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + toTHB(e) }), {})).sort((a, b) => b[1] - a[1])[0];
  const hero = photos[0]?.photos[0] || plan.cover?.img;
  const c = countryOf(plan.country);

  const share = async () => {
    const text = `${plan.name} · ${days.length} วัน ${stops.length} ที่ ${fmtKm(km)} — สรุปจาก VOTAGEX`;
    try {
      if (navigator.share) await navigator.share({ title: plan.name, text });
      else { await navigator.clipboard.writeText(text); showToast('คัดลอกข้อความสรุปแล้ว'); }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="pt-page">
      <div className="pt-scroll flush">
        <div className="pt-recap-hero" style={hero ? { backgroundImage: `url(${hero})` } : { background: plan.cover?.tint }}>
          <div className="pt-recap-hero-top">
            <button className="pt-round-btn" aria-label="ย้อนกลับ" onClick={() => navigate(-1)}><Icon name="back" size={20} /></button>
            <button className="pt-round-btn" aria-label="แชร์" onClick={share}><Icon name="share" size={18} /></button>
          </div>
          <div className="pt-recap-hero-text">
            <span className="pt-badge glass"><Flag code={c.code} /> สรุปทริป</span>
            <div className="pt-recap-title">{plan.name}</div>
            <div>{thaiRange(plan.startDate, plan.endDate)} {plan.startDate ? Number(plan.startDate.slice(0, 4)) + 543 : ''}</div>
            <Avatars ids={plan.members} size={28} />
          </div>
        </div>

        <div className="pt-recap-body">
          <div className="pt-recap-stats">
            <div><b>{days.length}</b><span>วัน</span></div>
            <div><b>{stops.length}</b><span>จุดแวะ</span></div>
            <div><b>{fmtKm(km)}</b><span>ระยะทางรวม</span></div>
            <div><b>{fmtMoney(perPerson)}</b><span>ต่อคน</span></div>
          </div>

          <MapView className="pt-map-card" points={stops.map((s, i) => ({ id: s.id, lat: s.lat, lng: s.lng, cat: s.cat, label: i + 1 }))} route interactive={false} fitKey={plan.id} />

          {photos.length > 0 && (
            <>
              <div className="hp-section-title">โมเมนต์ที่ชอบ</div>
              <div className="pt-recap-photos">
                {photos.map((m) => (
                  <div key={m.id} className="pt-recap-photo" style={{ backgroundImage: `url(${m.photos[0]})` }}>
                    <span><Icon name={m.mood} size={14} className="pt-inline-icon" /> {plan.stops.find((s) => s.id === m.stopId)?.name || thaiShort(m.date)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {mems.length > 0 && (
            <>
              <div className="hp-section-title">เสียงจากทริป</div>
              {mems.map((m) => (
                <div key={m.id} className="pt-quote">
                  <Avatar id={m.by} size={32} />
                  <div><div>“{m.text}”</div><div className="pt-muted sm">{PEOPLE[m.by].name} · {thaiShort(m.date)}</div></div>
                </div>
              ))}
            </>
          )}

          <div className="hp-tile pt-recap-fact">
            <Icon name="wallet" size={20} />
            <div>
              ทั้งทริปใช้ไป <b>{fmtMoney(total)}</b>{topCat ? <> · ส่วนใหญ่เป็น <b>{EXPENSE_CATS[topCat[0]].label}</b> ({Math.round((topCat[1] / total) * 100)}%)</> : null}
            </div>
          </div>

          <button className="pt-btn block" onClick={share}><Icon name="share" size={18} /> แชร์สรุปทริป</button>
        </div>
      </div>
    </div>
  );
}
