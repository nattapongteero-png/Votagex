import { useProto } from './useProto';
import { Avatars, CatIcon } from './ui';
import Icon from './icons';
import { ME, directionsUrl, checkInFrom } from './data';

// One stop on a day, the same on home (compact: a line each, no note or directions) and in the plan (a card).
// Time and the numbered rail on the left; the dot turns to a tick once I'm in. Under the stop: who's checked in,
// and on the next stop only, the check-in button; in the plan, directions on the right.
// drag (plan page): { rowRef, style, dragging, handle: pointer handlers or null }
// passed: left behind today (a later stop is checked in); checking in late is in the stop's sheet
export default function StopRow({ stop: s, index, planId, state: st, checkHere, passed = false, compact = false, onOpen, drag }) {
  const { actions } = useProto();
  const whoIn = Object.keys(s.checkIns || {});
  const mine = Boolean(s.checkIns?.[ME]);

  // home: one line each, the category icon standing on the rail, and what to do (or what happened) on the right
  if (compact) {
    const at = whoIn.length ? s.checkIns[whoIn[0]] : null;
    return (
      <div className={`pt-line ${st}`} role="button" tabIndex={0} onClick={onOpen}>
        <span className={`pt-line-time${s.time ? '' : ' empty'}`}>{s.time || 'ไม่ระบุ'}</span>
        <span className="pt-line-rail">
          <CatIcon cat={s.cat} size={34} />
          {mine && <i className="pt-line-tick"><Icon name="check" size={10} stroke={3.2} /></i>}
        </span>
        <span className="pt-grow">
          <span className="pt-strong ellipsis">{s.name}</span>
          <span className="pt-muted sm ellipsis">{s.area}</span>
        </span>
        <span className="pt-line-end" onClick={(e) => e.stopPropagation()}>
          {at ? (
            <span className={`pt-line-done${st === 'late-done' ? ' late' : ''}`}><Icon name="check" size={13} stroke={2.6} /> {at.at}</span>
          ) : checkHere && st === 'early' ? (
            <span className="pt-stop-when">เช็คอินได้ {checkInFrom(s.time)}</span>
          ) : checkHere ? (
            <button className={`pt-stop-checkin${st === 'due' ? ' due' : ''}`} onClick={() => actions.toggleCheckIn(planId, s.id, st === 'due')}>
              <Icon name="check" size={15} stroke={2.6} /> {st === 'due' ? 'เลยเวลา' : 'เช็คอิน'}
            </button>
          ) : passed ? (
            <span className="pt-stop-when">ข้ามไป</span>
          ) : st === 'skipped' ? (
            <span className="pt-stop-when">ไม่ไป</span>
          ) : null}
        </span>
      </div>
    );
  }

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
          </div>
          {drag?.handle && (
            <span className="pt-drag" aria-label="ลากเพื่อย้าย" onClick={(e) => e.stopPropagation()} {...drag.handle}>
              <Icon name="grip" size={18} />
            </span>
          )}
        </div>
        {!compact && s.note && <div className="pt-note pt-stop-note ellipsis">{s.note}</div>}
        {/* the card always has its footer (check-in on the left, directions on the right), so cards line up */}
        {(!compact || whoIn.length > 0 || checkHere || passed || st === 'skipped') && (
          <div className="pt-stop-foot" onClick={(e) => e.stopPropagation()}>
            {whoIn.length > 0 && (
              <span className="pt-stop-who"><Avatars ids={whoIn} size={18} /> {st === 'late-done' ? 'มาสาย' : 'เช็คอินแล้ว'} {s.checkIns[whoIn[0]].at}</span>
            )}
            {checkHere && st === 'early' && <span className="pt-stop-when">เช็คอินได้ตั้งแต่ {checkInFrom(s.time)}</span>}
            {checkHere && st !== 'early' && (
              <button className={`pt-stop-checkin${st === 'due' ? ' due' : ''}`} onClick={() => actions.toggleCheckIn(planId, s.id, st === 'due')}>
                <Icon name="check" size={16} stroke={2.6} /> {st === 'due' ? 'เลยเวลาแล้ว · เช็คอิน' : 'เช็คอิน'}
              </button>
            )}
            {passed && <span className="pt-stop-when">ข้ามไป</span>}
            {st === 'skipped' && <span className="pt-stop-when">ไม่ไปจุดนี้</span>}
            {!compact && (
              <a className="pt-btn light sm pt-stop-nav" href={directionsUrl(s)} target="_blank" rel="noreferrer"><Icon name="nav" size={15} /> นำทาง</a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
