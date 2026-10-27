import useModalClose from '../hooks/useModalClose';
import Icon from './icons';
import { PEOPLE, PLACE_CATS } from './data';
import { avatarOf } from './peeps';

const COVER_ICON_COLOR = { globe: '#2563EB', plans: 'var(--tw-brand)' };

// Bottom sheet using the app's modal-overlay/modal-sheet animation
export function Sheet({ title, subtitle, onClose, children, footer, tall = false }) {
  const { isClosing, handleClose } = useModalClose(onClose);
  return (
    <div className={`modal-overlay active${isClosing ? ' closing' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={`modal-sheet pt-sheet${tall ? ' tall' : ''}`}>
        <div className="pt-sheet-head">
          <div>
            <div className="pt-sheet-title">{title}</div>
            {subtitle && <div className="pt-sheet-sub">{subtitle}</div>}
          </div>
          <button className="pt-round-btn sm" aria-label="ปิด" onClick={handleClose}><Icon name="close" size={18} /></button>
        </div>
        <div className="pt-sheet-body">{typeof children === 'function' ? children(handleClose) : children}</div>
        {footer && <div className="pt-sheet-foot">{typeof footer === 'function' ? footer(handleClose) : footer}</div>}
      </div>
    </div>
  );
}

export function Avatar({ id, size = 28 }) {
  const p = PEOPLE[id];
  return (
    <span className="pt-avatar" style={{ width: size, height: size }} title={p?.name}>
      {p ? <img src={avatarOf(id)} alt={p.name} /> : null}
    </span>
  );
}

// total: max counts the +n too (3 → two faces and +n once there are more than 3)
export function Avatars({ ids, size = 26, max = 4, total = false }) {
  const shown = total && ids.length > max ? max - 1 : max;
  return (
    <span className="pt-avatars">
      {ids.slice(0, shown).map((id) => <Avatar key={id} id={id} size={size} />)}
      {ids.length > shown && <span className="pt-avatar more" style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.3)) }}>+{ids.length - shown}</span>}
    </span>
  );
}

export function CatIcon({ cat, size = 40 }) {
  const c = PLACE_CATS[cat] || PLACE_CATS.sight;
  return (
    <span className="pt-cat-icon" style={{ width: size, height: size, background: c.bg, color: c.color }}>
      <Icon name={cat in PLACE_CATS ? cat : 'sight'} size={Math.round(size * 0.5)} />
    </span>
  );
}

export function Cover({ cover, className = '', children }) {
  if (cover?.img) {
    return <div className={`pt-cover ${className}`} style={{ backgroundImage: `url(${cover.img})` }}>{children}</div>;
  }
  const icon = cover?.icon || 'plans';
  return (
    <div className={`pt-cover tinted ${className}`} style={{ background: cover?.tint || 'var(--tw-sunken)', color: PLACE_CATS[icon]?.color || COVER_ICON_COLOR[icon] || 'var(--tw-brand)' }}>
      <span className="pt-cover-icon"><Icon name={icon} stroke={1.6} /></span>
      {children}
    </div>
  );
}

export function Seg({ items, value, onChange }) {
  return (
    <div className="pt-seg" role="tablist">
      {items.map((it) => (
        <button key={it.value} role="tab" aria-selected={value === it.value} className={`pt-seg-btn${value === it.value ? ' active' : ''}`} onClick={() => onChange(it.value)}>
          {it.label}
          {it.count != null && <span className="pt-seg-count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Chip({ active, onClick, children, color }) {
  return (
    <button className={`pt-chip${active ? ' active' : ''}`} onClick={onClick} style={active && color ? { background: color, borderColor: color } : undefined}>
      {children}
    </button>
  );
}

export function Progress({ value, color }) {
  return (
    <div className="pt-progress"><span style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, background: color }} /></div>
  );
}

export function SectionTitle({ title, action, onAction }) {
  return (
    <div className="hp-tile-title">
      <span className="hp-section-title">{title}</span>
      {action && <button className="hp-tile-link" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="pt-empty">{children}</div>;
}
