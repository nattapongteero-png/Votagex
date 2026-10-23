import { useProto } from './useProto';
import { Sheet, Chip, CatIcon, Avatar } from './ui';
import Icon, { SourceBadge } from './icons';
import MapView from './MapView';
import { SourcePreview } from './SavePlaceSheet';
import { parseShared } from './placeSearch';
import { EVENT_KINDS, HOME, PEOPLE, ME, SOURCES, addDays, distanceKm, fmtKm, directionsUrl, eventRange, eventEnded } from './data';

// One saved place: where it is, the post it came from, who it's shared with.
// With dates (an event): "ไปงานนี้" makes an outing that day; without: "เพิ่มลงแผน".
export default function PlaceSheet({ onClose, placeId }) {
  const { places, groups, actions, openSheet, today } = useProto();
  const p = places.find((x) => x.id === placeId);
  if (!p) return null;
  const kind = p.startDate && (EVENT_KINDS[p.kind] || EVENT_KINDS.other);
  const ended = eventEnded(p, today);
  const shared = p.source?.url ? { ...parseShared(p.source.url), author: p.source.author, caption: '' } : null;
  const mine = !p.by || p.by === ME;
  const then = (close, fn) => { close(); setTimeout(fn, 320); };

  // its own outing, never slipped into a trip that happens to cover the day; who comes is picked in the form
  const go = (close) => then(close, () => openSheet('createPlan', {
    type: 'outing', name: p.name, date: p.startDate >= today ? p.startDate : today, time: p.time || '', groupId: p.groupId,
    place: { ...p, name: p.name, area: p.venue || p.area },
  }));

  return (
    <Sheet title={p.name} subtitle={kind ? kind.label : SOURCES[p.source?.type]?.label} onClose={onClose} tall
      footer={(close) => (
        <div className="pt-foot-row">
          <a className="pt-btn light" href={directionsUrl(p)} target="_blank" rel="noreferrer"><Icon name="nav" size={16} /> นำทาง</a>
          {kind
            ? <button className="pt-btn" disabled={ended} onClick={() => go(close)}>ไปงานนี้</button>
            : <button className="pt-btn" onClick={() => then(close, () => openSheet('addToPlan', { placeId: p.id }))}>เพิ่มลงแผน</button>}
        </div>
      )}>
      {(close) => (
        <>
          <div className="pt-picked">
            <MapView className="pt-map-mini" points={[{ id: p.id, lat: p.lat, lng: p.lng, cat: p.cat }]} interactive={false} />
            <div className="pt-picked-row">
              <CatIcon cat={p.cat} size={40} />
              <div className="pt-grow">
                {kind && <div className="pt-strong">{eventRange(p)}{p.time ? ` · ${p.time} น.` : ''}</div>}
                <div className={kind ? 'pt-muted' : 'pt-strong'}>{p.venue || p.area}</div>
                <div className="pt-muted sm">ห่าง {fmtKm(distanceKm(HOME, p))}</div>
              </div>
              {p.source?.type && p.source.type !== 'web' && <SourceBadge type={p.source.type} size={28} />}
            </div>
          </div>
          {p.note && <div className="pt-note">“{p.note}”</div>}
          {!kind && mine && (
            <div className="pt-chip-row">
              <Chip active={p.status === 'want'} onClick={() => actions.updatePlace(p.id, { status: 'want' })}>อยากไป</Chip>
              <Chip active={p.status === 'visited'} onClick={() => actions.updatePlace(p.id, { status: 'visited' })}>เคยไปแล้ว</Chip>
            </div>
          )}
          {groups.length > 0 && mine && (
            <>
              <div className="pt-label">แชร์ให้กลุ่ม</div>
              <div className="pt-chip-row wrap">
                <Chip active={!p.groupId} onClick={() => actions.sharePlace(p.id, null)}>เฉพาะฉัน</Chip>
                {groups.map((g) => <Chip key={g.id} active={p.groupId === g.id} color={g.color} onClick={() => actions.sharePlace(p.id, g.id)}>{g.name}</Chip>)}
              </div>
            </>
          )}
          {shared && <SourcePreview shared={shared} />}
          <div className="pt-muted sm pt-ev-by">
            {!mine && <Avatar id={p.by} size={18} />} เก็บโดย {mine ? 'ฉัน' : PEOPLE[p.by]?.name || 'เพื่อน'}
            {ended ? ' · จบไปแล้ว' : kind && p.endDate && p.endDate !== p.startDate && p.endDate <= addDays(today, 2) && p.startDate <= today ? ' · ใกล้จบแล้ว' : ''}
          </div>
          {mine && <button className="pt-btn light block pt-ev-remove danger" onClick={() => { actions.removePlace(p.id); close(); }}><Icon name="trash" size={16} /> ลบ</button>}
        </>
      )}
    </Sheet>
  );
}
