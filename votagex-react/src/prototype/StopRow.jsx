import { useProto } from './useProto';
import { Avatars, CatIcon } from './ui';
import Icon from './icons';
import { ME, checkInFrom } from './data';

// One stop on a day, the same line on home and in the plan: the time, the category icon standing on the rail
// (a tick on it once I'm in), name and area, and on the right what to do or what happened: the check-in button
// on the next stop only, when check-in opens, who checked in and when, left behind, not going.
// The plan adds the note and a drag handle; directions are in the stop's sheet, a tap away.
// passed: left behind today (a later stop is checked in); checking in late is in the stop's sheet
// drag (plan): { rowRef, style, dragging, handle: pointer handlers or null }; only the stop moves, its time stays
export default function StopRow({ stop: s, planId, state: st, checkHere, passed = false, full = false, onOpen, drag }) {
  const { actions } = useProto();
  const whoIn = Object.keys(s.checkIns || {});
  const at = whoIn.length ? s.checkIns[whoIn.includes(ME) ? ME : whoIn[0]] : null;
  const mine = Boolean(s.checkIns?.[ME]);

  return (
    <div ref={drag?.rowRef} className={`pt-line ${st}${drag?.dragging ? ' dragging' : ''}`}>
      <span className={`pt-line-time${s.time ? '' : ' empty'}`}>{s.time || 'ไม่ระบุ'}</span>
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
          {at ? (
            <span className={`pt-line-done${st === 'late-done' ? ' late' : ''}`}>
              {whoIn.length > 1 && <Avatars ids={whoIn} size={16} max={3} />}
              <Icon name="check" size={13} stroke={2.6} /> {at.at}
            </span>
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
        {drag?.handle && (
          <span className="pt-drag" aria-label="ลากเพื่อย้าย" onClick={(e) => e.stopPropagation()} {...drag.handle}>
            <Icon name="grip" size={18} />
          </span>
        )}
      </div>
    </div>
  );
}
