import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto, useCollection } from '../useProto';
import Icon from '../icons';
import { Seg, SectionTitle, Progress, Avatars } from '../ui';
import { ME, PEOPLE, EXPENSE_CATS, parseISO, myShare, fmtMoney, planStatus, jarStats } from '../data';

const CAL_THEME_KEY = 'votagex.proto.calTheme'; // read by the home calendar
const CAL_THEMES = [['riso', 'Riso'], ['poster', 'โปสเตอร์ 1969']];

const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export default function MePage() {
  const { plans, expenses, places, jars, piggyLog, groups, today, simMode, settings, actions, openSheet, showToast, cloud, exit } = useProto();
  const navigate = useNavigate();
  const { provinces, countries } = useCollection();
  const [monthOffset, setMonthOffset] = useState(0);
  const [calTheme, setCalTheme] = useState(() => { try { return localStorage.getItem(CAL_THEME_KEY) || 'riso'; } catch { return 'riso'; } });
  const pickTheme = (k) => { setCalTheme(k); try { localStorage.setItem(CAL_THEME_KEY, k); } catch { /* private mode */ } };

  const month = useMemo(() => {
    const d = parseISO(today);
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}` };
  }, [today, monthOffset]);

  const monthExp = expenses.filter((e) => e.date?.startsWith(month.key));
  const total = monthExp.reduce((s, e) => s + myShare(e), 0);
  const byCat = Object.entries(monthExp.reduce((m, e) => ({ ...m, [e.cat]: (m[e.cat] || 0) + myShare(e) }), {})).sort((a, b) => b[1] - a[1]);
  const byPlan = Object.entries(monthExp.reduce((m, e) => ({ ...m, [e.planId]: (m[e.planId] || 0) + myShare(e) }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = byCat[0]?.[1] || 1;
  const pastPlans = plans.filter((p) => planStatus(p, today) === 'past').length;
  // demo: today's stops I could pretend to be standing at
  const todayStops = plans.flatMap((p) => (p.startDate && today >= p.startDate && today <= (p.endDate || p.startDate) ? p.stops.filter((s) => s.date === today) : []));
  const autoOn = settings.autoCheckIn !== false;

  return (
    <div className="me-page pt-me" style={{ display: 'flex' }}>
      <div className="me-header"><div className="me-header-top"><span className="me-title">ฉัน</span></div></div>
      <div className="me-content">
        <div className="me-panel me-profile">
          <span className="me-profile-avatar"><img src={PEOPLE[ME].avatar} alt="" /></span>
          <span className="me-profile-text">
            <span className="me-menu-label">{PEOPLE[ME].name}</span>
          </span>
        </div>

        <div className="me-stats">
          <div className="me-stat"><span className="me-stat-label">เที่ยวมาแล้ว</span><span className="me-stat-value">{pastPlans}</span><span className="me-stat-unit">แผน</span></div>
          <button className="me-stat pt-stat-btn" onClick={() => openSheet('provinces')}><span className="me-stat-label">จังหวัด</span><span className="me-stat-value">{provinces.length}<small>/77</small></span><span className="me-stat-unit">สะสมแล้ว</span></button>
          <div className="me-stat"><span className="me-stat-label">ที่อยากไป</span><span className="me-stat-value">{places.filter((p) => p.status === 'want').length}</span><span className="me-stat-unit">แห่ง · {countries.length} ประเทศ</span></div>
        </div>

        <div className="me-panel">
          <div className="me-panel-title">กลุ่มเที่ยว</div>
          {groups.map((g) => (
            <button key={g.id} className="me-row" onClick={() => openSheet('group', { groupId: g.id })}>
              <span className="me-row-icon" style={{ background: g.color, color: '#fff' }}><Icon name={g.icon} size={16} /></span>
              <span className="pt-grow">{g.name}</span>
              <Avatars ids={g.members} size={22} max={3} />
            </button>
          ))}
          <button className="me-row" onClick={() => openSheet('newGroup')}>
            <span className="me-row-icon"><Icon name="plus" size={16} /></span><span className="pt-grow">สร้างกลุ่ม</span>
          </button>
        </div>

        {/* every piggy, including ones not tied to a trip */}
        <div className="me-panel">
          <div className="me-panel-title">กระปุกเก็บเงิน</div>
          {jars.map((j) => {
            const st = jarStats(j, piggyLog, plans, expenses);
            return (
              <button key={j.id} className="me-row pt-me-jar" onClick={() => openSheet('piggy', { jarId: j.id })}>
                <span className="me-row-icon"><Icon name={j.icon || 'piggy'} size={16} /></span>
                <span className="pt-grow">
                  <span className="pt-jar-top"><span className="pt-strong ellipsis">{j.name}</span><span className="pt-strong">{fmtMoney(st.balance)}<span className="pt-muted sm"> / {fmtMoney(j.goal)}</span></span></span>
                  <Progress value={j.goal ? st.balance / j.goal : 0} color="var(--tw-brand)" />
                </span>
              </button>
            );
          })}
          <button className="me-row" onClick={() => openSheet('newJar')}>
            <span className="me-row-icon"><Icon name="plus" size={16} /></span><span className="pt-grow">กระปุกใหม่</span>
          </button>
        </div>

        <div className="me-panel pt-pad-panel">
          <div className="pt-month-head">
            <button className="pt-round-btn sm" aria-label="เดือนก่อน" onClick={() => setMonthOffset((m) => m - 1)}><Icon name="back" size={16} /></button>
            <div className="center">
              <div className="pt-muted sm">{month.label}</div>
              <div className="pt-spend-total">{fmtMoney(total)}</div>
            </div>
            <button className="pt-round-btn sm" aria-label="เดือนถัดไป" disabled={monthOffset >= 0} onClick={() => setMonthOffset((m) => m + 1)}><Icon name="next" size={16} /></button>
          </div>
          {byCat.length ? (
            <div className="pt-bars">
              {byCat.map(([k, v]) => (
                <div key={k} className="pt-bar-row">
                  <span className="pt-bar-label">{EXPENSE_CATS[k].label}</span>
                  <span className="pt-bar"><span style={{ width: `${(v / maxCat) * 100}%`, background: EXPENSE_CATS[k].color }} /></span>
                  <span className="pt-bar-value">{fmtMoney(v)}</span>
                </div>
              ))}
            </div>
          ) : <div className="pt-muted pad center">เดือนนี้ยังไม่มีรายจ่าย</div>}
          {byPlan.length > 0 && (
            <>
              <SectionTitle title="ตามแผน" />
              {byPlan.map(([id, v]) => {
                const p = plans.find((x) => x.id === id);
                return (
                  <button key={id} className="me-row" onClick={() => navigate(`/proto/plan/${id}?tab=money`)}>
                    <span className="pt-grow"><span className="pt-strong">{p?.name || 'แผนที่ลบไปแล้ว'}</span></span>
                    <span className="pt-strong">{fmtMoney(v)}</span>
                    <Icon name="next" size={16} className="me-chevron" />
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="me-panel">
          <div className="me-panel-title">ตั้งค่า</div>
          <div className="me-row"><span className="me-row-icon"><Icon name="wallet" size={16} /></span><span className="pt-grow">สกุลเงินหลัก</span><span className="pt-muted">THB ฿</span></div>
          <div className="me-row">
            <span className="me-row-icon"><Icon name="qr" size={16} /></span><span className="pt-grow">พร้อมเพย์รับเงินคืน</span><span className="pt-muted">ยังไม่ตั้ง</span>
          </div>
          <div className="me-row">
            <span className="me-row-icon"><Icon name="clock" size={16} /></span><span className="pt-grow">แจ้งเตือนก่อนถึงจุดแวะ</span><span className="pt-muted">30 นาที</span>
          </div>
          <button className="me-row" role="switch" aria-checked={autoOn} onClick={() => actions.setSetting('autoCheckIn', !autoOn)}>
            <span className="me-row-icon"><Icon name="pin" size={16} /></span><span className="pt-grow">เช็คอินอัตโนมัติเมื่อถึงที่</span>
            <span className={`pt-switch${autoOn ? ' on' : ''}`} />
          </button>
          <div className="me-row">
            <span className="me-row-icon"><Icon name="calendar" size={16} /></span><span className="pt-grow">ธีมปฏิทิน</span>
            <span className="pt-theme-pick">
              {CAL_THEMES.map(([k, label]) => (
                <button key={k} className={calTheme === k ? 'active' : ''} onClick={() => pickTheme(k)}>{label}</button>
              ))}
            </span>
          </div>
        </div>

        {/* free data sources; their terms ask for credit */}
        <div className="me-panel">
          <div className="me-panel-title">แหล่งข้อมูล</div>
          <div className="pt-credits">
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
            <a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>
            <a href="https://photon.komoot.io" target="_blank" rel="noreferrer">Photon</a>
            <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a>
            <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates by Exchange Rate API</a>
            <a href="https://calendar.google.com" target="_blank" rel="noreferrer">วันหยุด: Google Calendar</a>
          </div>
        </div>

        <div className="me-panel pt-demo">
          <div className="me-panel-title">{cloud ? 'บัญชี' : 'โหมดสาธิต (Prototype)'}</div>
          {!cloud && <div className="pt-pad-x">
            <Seg value={simMode} onChange={(v) => { actions.setSimMode(v); showToast(v === 'trip' ? 'จำลอง Day 2 ที่โอซาก้า' : 'กลับมาวันปกติ'); }} items={[
              { value: 'normal', label: 'วันปกติ' },
              { value: 'trip', label: 'กำลังเที่ยวโอซาก้า' },
            ]} />
          </div>}
          {autoOn && todayStops.length > 0 && (
            <div className="pt-pad-x pt-sim-loc">
              <div className="pt-muted sm">จำลองว่าอยู่ที่</div>
              <div className="pt-chip-row wrap">
                {todayStops.map((s) => (
                  <button key={s.id} className={`pt-chip${settings.simStop === s.id ? ' active' : ''}`} disabled={!!s.checkIns?.[ME]}
                    onClick={() => actions.setSetting('simStop', settings.simStop === s.id ? null : s.id)}>{s.name}</button>
                ))}
              </div>
            </div>
          )}
          <button className="me-row" onClick={() => { actions.reset(); showToast('รีเซ็ตข้อมูลตัวอย่างแล้ว'); }}>
            <span className="me-row-icon"><Icon name="shuffle" size={16} /></span><span className="pt-grow">รีเซ็ตข้อมูลตัวอย่าง</span>
          </button>
          <button className="me-row" onClick={exit}>
            <span className="me-row-icon"><Icon name="back" size={16} /></span><span className="pt-grow">{cloud ? 'ออกจากระบบ' : 'ออกจากโหมดตัวอย่าง'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
