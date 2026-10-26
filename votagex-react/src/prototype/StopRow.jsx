import { useProto } from './useProto';
import { Avatars, CatIcon } from './ui';
import Icon from './icons';
import { ME, directionsUrl } from './data';

// One stop on a day, the same on home (compact: a line each, no note or directions) and in the plan (a card).
// Time and the numbered rail on the left; the dot turns to a tick once I'm in. Under the stop: who's checked in,
// and on the next stop only, the check-in button; in the plan, directions on the right.
// drag (plan page): { rowRef, style, dragging, handle: pointer handlers or null }
export default function StopRow({ stop: s, index, planId, state: st, checkHere, compact = false, onOpen, drag }) {
  const { actions } = useProto();
  const whoIn = Object.keys(s.checkIns || {});
  const mine = Boolean(s.checkIns?.[ME]);
  return (
    <div ref={drag?.rowRef} className={`pt-stop ${st}${compact ? ' compact' : ''}${drag?.dragging ? ' dragging' : ''}`}>
      <div className={`pt-stop-time${s.time ? '' : ' empty'}`}>{s.time || 'ไม่ระบุ'}</div>
      <div className="pt-stop-rail"><span className="pt-stop-dot">{mine ? <Icon name="check" size={12} stroke={3} /> : index + 1}</span></div>
      {/* only the card moves when dragged; the time and the numbered rail stay with their slot */}
      <div className="pt-stop-card" role="button" tabIndex={0} style={drag?.style} onClick={onOpen}>
        <div className="pt-stop-top">
          <CatIcon cat={s.cat} size={compact ? 32 : 40} />
          <div className="pt-grow">
            <div className={`pt-strong${compact ? ' ellipsis' : ''}`}>{s.name}</div>
            <div className="pt-muted sm ellipsis">{s.area}</div>
            {!compact && s.note && <div className="pt-note ellipsis">{s.note}</div>}
          </div>
          {drag?.handle && (
            <span className="pt-drag" aria-label="ลากเพื่อย้าย" onClick={(e) => e.stopPropagation()} {...drag.handle}>
              <Icon name="grip" size={18} />
            </span>
          )}
        </div>
        {/* the card always has its footer (check-in on the left, directions on the right), so cards line up */}
        {(!compact || whoIn.length > 0 || checkHere) && (
          <div className="pt-stop-foot" onClick={(e) => e.stopPropagation()}>
            {whoIn.length > 0 && (
              <span className="pt-stop-who"><Avatars ids={whoIn} size={18} /> {st === 'late-done' ? 'มาสาย' : 'เช็คอินแล้ว'} {s.checkIns[whoIn[0]].at}</span>
            )}
            {checkHere && (
              <button className={`pt-stop-checkin${st === 'due' ? ' due' : ''}`} onClick={() => actions.toggleCheckIn(planId, s.id, st === 'due')}>
                <Icon name="check" size={16} stroke={2.6} /> {st === 'due' ? 'ถึงเวลาแล้ว · เช็คอิน' : 'เช็คอิน'}
              </button>
            )}
            {!compact && (
              <a className="pt-btn light sm pt-stop-nav" href={directionsUrl(s)} target="_blank" rel="noreferrer"><Icon name="nav" size={15} /> นำทาง</a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
