import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProto, useCollection } from '../useProto';
import Icon, { Flag, SourceBadge } from '../icons';
import MapView from '../MapView';
import { CatIcon, Chip } from '../ui';
import { PLACE_CATS, SOURCES, HOME, distanceKm, fmtKm, directionsUrl, planStatus, countryOf } from '../data';

export default function MapPage() {
  const { places, plans, today, openSheet } = useProto();
  const navigate = useNavigate();
  const { provinces } = useCollection();
  const [status, setStatus] = useState('want');
  const [region, setRegion] = useState('TH');
  const [cat, setCat] = useState('all');
  const [sel, setSel] = useState(null);
  const railRef = useRef(null);

  // saved places + checked-in stops from past plans (the "been there" layer)
  const all = useMemo(() => {
    const visitedStops = plans.filter((p) => planStatus(p, today) === 'past').flatMap((p) => p.stops
      .filter((s) => Object.keys(s.checkIns || {}).length)
      .map((s) => ({ id: `stop-${s.id}`, name: s.name, area: s.area, country: p.country, lat: s.lat, lng: s.lng, cat: s.cat, status: 'visited', source: { type: 'plan' }, note: '', planId: p.id, planName: p.name })));
    return [...places.map((p) => ({ ...p, country: p.country || 'TH' })), ...visitedStops];
  }, [places, plans, today]);

  const regions = [...new Set(all.map((p) => p.country))];
  const list = all
    .filter((p) => p.country === region && (status === 'all' || p.status === status) && (cat === 'all' || p.cat === cat))
    .map((p) => ({ ...p, km: region === 'TH' ? distanceKm(HOME, p) : null }))
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0));

  const select = (id) => {
    setSel(id);
    const el = railRef.current?.querySelector(`[data-id="${id}"]`);
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  return (
    <div className="pt-page pt-map-page">
      <MapView className="pt-map-full" points={list} selectedId={sel} onSelect={select} fitKey={`${region}-${status}-${cat}`} padding={{ top: 190, bottom: 260, left: 40, right: 40 }} me={region === 'TH'} />

      <div className="pt-map-top">
        <div className="pt-map-bar">
          <div>
            <div className="pt-title sm">แผนที่ของฉัน</div>
            <div className="pt-sub">{list.length} แห่ง · {status === 'want' ? 'ที่อยากไป' : status === 'visited' ? 'ที่เคยไป' : 'ทั้งหมด'}</div>
          </div>
          <button className="pt-pill-btn" onClick={() => openSheet('savePlace')}><Icon name="bookmark" size={16} /> เซฟสถานที่</button>
        </div>
        <div className="pt-chip-row scroll">
          <Chip active={status === 'want'} onClick={() => setStatus('want')}>อยากไป</Chip>
          <Chip active={status === 'visited'} onClick={() => setStatus('visited')}>เคยไป</Chip>
          <Chip active={status === 'all'} onClick={() => setStatus('all')}>ทั้งหมด</Chip>
          <button className="pt-chip trophy" onClick={() => openSheet('provinces')}><Icon name="trophy" size={14} /> {provinces.length}/77 จังหวัด</button>
          <span className="pt-chip-sep" />
          {regions.map((r) => <Chip key={r} active={region === r} onClick={() => { setRegion(r); setSel(null); }}><Flag code={r} /> {countryOf(r).name}</Chip>)}
        </div>
        <div className="pt-chip-row scroll">
          <Chip active={cat === 'all'} onClick={() => setCat('all')}>ทุกหมวด</Chip>
          {Object.entries(PLACE_CATS).filter(([k]) => k !== 'move').map(([k, c]) => <Chip key={k} active={cat === k} color={c.color} onClick={() => setCat(k)}>{c.label}</Chip>)}
        </div>
      </div>

      <div className="pt-rail" ref={railRef}>
        {list.map((p) => (
          <div key={p.id} data-id={p.id} className={`pt-place-card${sel === p.id ? ' selected' : ''}`} onClick={() => setSel(p.id)}>
            <div className="pt-place-top">
              <CatIcon cat={p.cat} size={44} />
              <div className="pt-grow">
                <div className="pt-strong ellipsis">{p.name}</div>
                <div className="pt-muted sm ellipsis">{p.area}{p.km != null ? ` · ${fmtKm(p.km)}` : ''}</div>
              </div>
              {p.source?.type !== 'plan' && <SourceBadge type={p.source?.type || 'manual'} size={24} />}
            </div>
            <div className="pt-place-note ellipsis">
              {p.source?.type === 'plan' ? `เคยไปใน “${p.planName}”` : p.note || `บันทึกจาก ${SOURCES[p.source?.type]?.label || 'ค้นหาเอง'}${p.source?.author ? ` ${p.source.author}` : ''}`}
            </div>
            <div className="pt-row-actions">
              <a className="pt-btn light sm" href={directionsUrl(p)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><Icon name="nav" size={15} /> นำทาง</a>
              {p.source?.type === 'plan' ? (
                <button className="pt-btn sm" onClick={(e) => { e.stopPropagation(); navigate(`/proto/plan/${p.planId}?tab=memories`); }}>ดูความทรงจำ</button>
              ) : (
                <button className="pt-btn sm" onClick={(e) => { e.stopPropagation(); openSheet('addToPlan', { placeId: p.id }); }}>เพิ่มลงแผน</button>
              )}
            </div>
          </div>
        ))}
        {!list.length && (
          <div className="pt-place-card empty">
            <div className="pt-strong">ยังไม่มีสถานที่</div>
          </div>
        )}
      </div>
    </div>
  );
}
