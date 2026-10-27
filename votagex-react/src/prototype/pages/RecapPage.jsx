import { useRef } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useProto } from '../useProto';
import Icon, { Flag } from '../icons';
import MapView from '../MapView';
import { Avatar, Avatars } from '../ui';
import { PEOPLE, EXPENSE_CATS, countryOf, thaiRange, thaiShort, dayList, byOrder, distanceKm, fmtKm, fmtMoney, toTHB, myShare } from '../data';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Auto-generated story of a finished plan: route, numbers, best photos and notes
export default function RecapPage() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { plans, memories, expenses, showToast } = useProto();
  const cover = useRef(null);
  const bar = useRef(null);
  const body = useRef(null);
  const head = useRef(null);
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return <Navigate to="/proto/plans" replace />;

  const days = dayList(plan.startDate, plan.endDate);
  const stops = plan.stops.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || byOrder(a, b));
  const km = stops.reduce((s, st, i) => (i ? s + distanceKm(stops[i - 1], st) : 0), 0);
  const mems = memories.filter((m) => m.planId === plan.id).sort((a, b) => a.date.localeCompare(b.date));
  const photos = mems.filter((m) => m.photos?.length);
  const exp = expenses.filter((e) => e.planId === plan.id);
  const total = exp.reduce((s, e) => s + toTHB(e), 0);
  const perPerson = exp.reduce((s, e) => s + myShare(e), 0);
  const topCat = Object.entries(exp.reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + toTHB(e) }), {})).sort((a, b) => b[1] - a[1])[0];
  const hero = photos[0]?.photos[0] || plan.cover?.img;
  const c = countryOf(plan.country);

  const onScroll = (e) => {
    if (!bar.current) return;
    const y = e.currentTarget.scrollTop;
    // where the title and the card are below the bar, read before anything changes
    const edge = bar.current.getBoundingClientRect().bottom;
    const title = head.current.getBoundingClientRect().top - edge;
    const card = body.current.getBoundingClientRect().top - edge;
    // pulled down past the top (iOS lets the page overscroll), the photo grows upward into the gap and, being
    // cover-sized, zooms as it does; only its height changes (a scale spilled it sideways and let the page pan)
    cover.current.style.top = y < 0 ? `${y}px` : '';
    // the title fades out over its last 60px to the bar, so it never runs under the buttons; the bar turns
    // solid, with the trip's name, over the card's last 40px
    head.current.style.opacity = clamp01(title / 60);
    bar.current.style.setProperty('--solid', clamp01(1 - card / 40));
  };

  const share = async () => {
    const text = `${plan.name} · ${days.length} วัน ${stops.length} ที่ ${fmtKm(km)} — สรุปจาก VOTAGEX`;
    try {
      if (navigator.share) await navigator.share({ title: plan.name, text });
      else { await navigator.clipboard.writeText(text); showToast('คัดลอกข้อความสรุปแล้ว'); }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="pt-page">
      <div ref={bar} className="pt-recap-bar">
        <button className="pt-round-btn" aria-label="ย้อนกลับ" onClick={() => navigate(-1)}><Icon name="back" size={20} /></button>
        <span className="pt-recap-bar-title ellipsis">{plan.name}</span>
        <button className="pt-round-btn" aria-label="แชร์" onClick={share}><Icon name="share" size={18} /></button>
      </div>
      <div className="pt-scroll flush" onScroll={onScroll}>
        <div className="pt-recap-cover"><i ref={cover} style={hero ? { backgroundImage: `url(${hero})` } : { background: plan.cover?.tint }} /></div>
        <div className="pt-recap-hero">
          <div ref={head} className="pt-recap-hero-text">
            <span className="pt-badge glass"><Flag code={c.code} /> สรุปทริป</span>
            <div className="pt-recap-title">{plan.name}</div>
            <div>{thaiRange(plan.startDate, plan.endDate)} {plan.startDate ? Number(plan.startDate.slice(0, 4)) + 543 : ''}</div>
            <Avatars ids={plan.members} size={28} />
          </div>
        </div>

        <div ref={body} className="pt-recap-body">
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
