import { useProto } from './useProto';
import { CatIcon } from './ui';
import Icon from './icons';
import { ME, checkInFrom, directionsUrl } from './data';

// One stop on a day, the same line on home and in the plan: the time, the category icon standing on the rail
// (a tick on it once I'm in), name and area; on the right, icon buttons: check in (the next stop only; grey until
// its window opens) and directions. Under the planned time: when it was checked in, left behind, not going.
// The plan adds the note and a drag handle.
// passed: left behind today (a later stop is checked in); checking in late is in the stop's sheet
// drag (plan): { rowRef, style, dragging, handle: pointer handlers or null }; only the stop moves, its time stays
export default function StopRow({ stop: s, planId, state: st, checkHere, passed = false, full = false, onOpen, drag }) {
  const { actions, showToast } = useProto();
  const whoIn = Object.keys(s.checkIns || {});
  const at = whoIn.length ? s.checkIns[whoIn.includes(ME) ? ME : whoIn[0]] : null;
  const mine = Boolean(s.checkIns?.[ME]);

  // under the planned time: when someone checked in, or that it was left behind / not going
  const under = at ? (
    <span className={`pt-line-at${st === 'late-done' ? ' late' : ''}`}>{at.at}</span>
  ) : passed ? <span className="pt-line-at muted">ข้ามไป</span> : st === 'skipped' ? <span className="pt-line-at muted">ไม่ไป</span> : null;

  return (
    <div ref={drag?.rowRef} className={`pt-line ${st}${drag?.dragging ? ' dragging' : ''}`}>
      <span className={`pt-line-time${s.time ? '' : ' empty'}`}>
        {s.time || 'ไม่ระบุ'}
        {under}
      </span>
      <div className="pt-line-body" role="button" tabIndex={0} style={drag?.style} onClick={onOpen}>
        <span className="pt-line-rail">
          <CatIcon cat={s.cat} size={34} />
          {mine && <i className="pt-line-tick"><Icon name="check" size={10} stroke={3.2} /></i>}
        </span>
        <span className="pt-grow">
          <span className="pt-strong ellipsis">{s.name}</span>
          <span className="pt-muted sm ellipsis">{s.area}</span>
          {full && s.note && <span className="pt-line-note ellipsis">{s.note}</span>}
        </span>
        <span className="pt-line-end" onClick={(e) => e.stopPropagation()}>
          {checkHere && !at && (
            st === 'early' ? (
              <button className="pt-icon-btn" aria-label={`เช็คอินได้ตั้งแต่ ${checkInFrom(s.time)}`}
                onClick={() => showToast(`เช็คอินได้ตั้งแต่ ${checkInFrom(s.time)} น.`)}>
                <Icon name="check" size={17} stroke={2.6} />
              </button>
            ) : (
              <button className={`pt-icon-btn check${st === 'due' ? ' due' : ''}`} aria-label={st === 'due' ? 'เลยเวลา เช็คอิน' : 'เช็คอิน'}
                onClick={() => actions.toggleCheckIn(planId, s.id, st === 'due')}>
                <Icon name="check" size={17} stroke={2.8} />
              </button>
            )
          )}
          <a className="pt-icon-btn" href={directionsUrl(s)} target="_blank" rel="noreferrer" aria-label="นำทาง"><Icon name="nav" size={16} /></a>
        </span>
        {drag?.handle && (
          <span className="pt-drag" aria-label="ลากเพื่อย้าย" onClick={(e) => e.stopPropagation()} {...drag.handle}>
            <Icon name="grip" size={18} />
          </span>
        )}
      </div>
    </div>
  );
}
