import { parseISO } from './data';
import HOLIDAYS from './thHolidays.json';

// Calendar theme after 1960s Polish pharmaceutical wall calendars: a bold flat artwork on top, then the
// year, the month in several languages and a grid of condensed numbers with bilingual weekday headers.

const MONTH_NAMES = {
  th: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
  en: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  fr: ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'],
  zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
};
const DAY_NAMES = [ // Monday first: th, en, fr, ja, ko (the grid header shows th + en)
  ['จันทร์', 'MONDAY', 'LUNDI', '月曜日', '월요일'],
  ['อังคาร', 'TUESDAY', 'MARDI', '火曜日', '화요일'],
  ['พุธ', 'WEDNESDAY', 'MERCREDI', '水曜日', '수요일'],
  ['พฤหัสฯ', 'THURSDAY', 'JEUDI', '木曜日', '목요일'],
  ['ศุกร์', 'FRIDAY', 'VENDREDI', '金曜日', '금요일'],
  ['เสาร์', 'SATURDAY', 'SAMEDI', '土曜日', '토요일'],
  ['อาทิตย์', 'SUNDAY', 'DIMANCHE', '日曜日', '일요일'],
];

// [composition, palette] per month — palettes follow the month's mood in Thailand
const ART = [
  ['bands', ['#2F5DA8', '#7FB3E0', '#E8EEF2', '#3E8E8A', '#F2C94C']], // ม.ค. หมอกหนาว
  ['tiles', ['#E5487A', '#F7A1C0', '#F6E3B4', '#8E3B8F', '#F06A3F']], // ก.พ. ดอกไม้ชมพู
  ['bands', ['#F2A93B', '#E9552E', '#3BA7D6', '#F7D35B', '#1E6FB8']], // มี.ค. ร้อน ทะเล
  ['cross', ['#1E9BD7', '#5ED0E8', '#F4D03F', '#E94F37', '#2B4C9B']], // เม.ย. สงกรานต์
  ['tiles', ['#F7C531', '#7DBB42', '#F28C28', '#2E8B57', '#E8452C']], // พ.ค. มะม่วง
  ['arches', ['#3A5BA0', '#6E8FD1', '#A7C7E7', '#2D3E70', '#E4572E']], // มิ.ย. ฝน
  ['bands', ['#3E9B4F', '#A3CF62', '#F2D04B', '#1F6E43', '#6BB3D9']], // ก.ค. นาข้าว
  ['arches', ['#8E44AD', '#E8A0C8', '#F5C2D5', '#4A2C82', '#2E9E6A']], // ส.ค. ดอกบัว
  ['cross', ['#1F8A8A', '#53C2B0', '#E94F37', '#F4D35E', '#3B5BA5']], // ก.ย. ฝนชุก
  ['cross', ['#E8552D', '#F2A13A', '#5B3A8C', '#3F7D4E', '#2E5DA8']], // ต.ค. โคม
  ['arches', ['#24306E', '#4F5FB5', '#F4C430', '#E8E3D3', '#C0392B']], // พ.ย. คืนเพ็ญ
  ['tiles', ['#D7263D', '#F4C430', '#2E86AB', '#1B998B', '#F46036']], // ธ.ค. ปีใหม่
];

// black lines between shapes; the view box is cropped 4 units in so no line runs along the outer edge
const line = { stroke: '#111', strokeWidth: 7, strokeLinejoin: 'round' };

function Art({ month }) {
  const [kind, [c0, c1, c2, c3, c4]] = ART[month];
  let body;
  if (kind === 'cross') {
    // four triangles meeting in the middle, each with a band and a circle
    const tri = (pts, fill, band) => (
      <>
        <polygon points={pts} fill={band} {...line} />
        <polygon points={pts} fill={fill} transform="translate(150 100) scale(.78) translate(-150 -100)" {...line} strokeWidth={5} />
      </>
    );
    body = (
      <>
        {tri('0,0 300,0 150,100', c3, c0)}
        {tri('0,0 150,100 0,200', c1, c0)}
        {tri('300,0 150,100 300,200', c4, c2)}
        {tri('0,200 150,100 300,200', c2, c0)}
        <circle cx="150" cy="30" r="24" fill={c2} {...line} />
        <circle cx="42" cy="100" r="26" fill={c4} {...line} />
        <circle cx="258" cy="100" r="26" fill={c0} {...line} />
        <circle cx="150" cy="168" r="24" fill={c1} {...line} />
      </>
    );
  } else if (kind === 'arches') {
    body = (
      <>
        <rect width="300" height="200" fill={c0} />
        {[[175, c1], [135, c2], [95, c4], [55, c3]].map(([r, f]) => (
          <path key={r} d={`M${150 - r} 205A${r} ${r} 0 0 1 ${150 + r} 205Z`} fill={f} {...line} />
        ))}
        <circle cx="252" cy="44" r="24" fill={c2} {...line} />
      </>
    );
  } else if (kind === 'bands') {
    const wave = (y, a) => `M-10 ${y}Q40 ${y - a} 90 ${y}T190 ${y}T290 ${y}T390 ${y}V210H-10Z`;
    body = (
      <>
        <rect width="300" height="200" fill={c2} />
        <circle cx="205" cy="70" r="44" fill={c4} {...line} />
        <path d={wave(105, 22)} fill={c1} {...line} />
        <path d={wave(140, 18)} fill={c0} {...line} />
        <path d={wave(172, 14)} fill={c3} {...line} />
      </>
    );
  } else {
    // 2×2 tiles, a circle in each
    const tiles = [[0, 0, c0, c2], [150, 0, c1, c3], [0, 100, c3, c4], [150, 100, c4, c1]];
    body = tiles.map(([x, y, bg, dot]) => (
      <g key={`${x}${y}`}>
        <rect x={x} y={y} width="150" height="100" fill={bg} {...line} />
        <circle cx={x + 75} cy={y + 50} r="30" fill={dot} {...line} />
      </g>
    ));
  }
  return (
    <svg className="pt-poster-art" viewBox="4 4 292 192" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {body}
    </svg>
  );
}

export function PosterPage({ ym, weeks, keep, today, selected, stopsOn, onSelect, renderWx, className = '', style, ...rest }) {
  const [y, m] = ym.split('-').map(Number);
  return (
    <div className={`pt-riso-page pt-poster ${className}`} style={style} {...rest}>
      <div className="pt-fold-away pt-poster-art-wrap"><Art month={m - 1} /></div>
      <div className="pt-poster-body">
        <div className="pt-poster-side">
          <div className="pt-poster-year">{y + 543}</div>
          <div className="pt-poster-months">
            <b>{MONTH_NAMES.th[m - 1]}</b>
            <span>{[MONTH_NAMES.en[m - 1], MONTH_NAMES.zh[m - 1], `${m}月`, `${m}월`].join('  ·  ')}</span>
          </div>
        </div>
        <div className="pt-poster-grid">
          <div className="pt-poster-week">
            {DAY_NAMES.map((names, i) => (
              <div key={names[1]} className={`pt-poster-dow${i === 6 ? ' sun' : ''}`}>
                {names.slice(0, 2).map((n) => <span key={n}>{n}</span>)}
              </div>
            ))}
          </div>
          {weeks.map((cells, w) => (
            <div key={cells[0]} className={`pt-poster-week${w === keep ? '' : ' pt-fold-away'}`}>
              {cells.map((d) => {
                const dow = (parseISO(d).getDay() + 6) % 7;
                const cls = `pt-poster-day${dow === 6 ? ' sun' : ''}${d.slice(0, 7) !== ym ? ' other' : ''}${d === today ? ' today' : ''}${d === selected ? ' selected' : ''}${d < today ? ' past' : ''}${stopsOn[d] ? ' plan' : ''}${HOLIDAYS[d] ? ' holiday' : ''}`;
                return (
                  <button key={d} className={cls} title={HOLIDAYS[d]} onClick={() => onSelect(d)}>
                    <b>{Number(d.slice(8))}</b>
                    {renderWx(d)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
