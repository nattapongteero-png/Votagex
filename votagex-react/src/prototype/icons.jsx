import flagTH from 'flag-icons/flags/4x3/th.svg';
import flagJP from 'flag-icons/flags/4x3/jp.svg';
import flagKR from 'flag-icons/flags/4x3/kr.svg';
import flagTW from 'flag-icons/flags/4x3/tw.svg';
import flagSG from 'flag-icons/flags/4x3/sg.svg';
import flagHK from 'flag-icons/flags/4x3/hk.svg';
import flagVN from 'flag-icons/flags/4x3/vn.svg';
import flagFR from 'flag-icons/flags/4x3/fr.svg';
import flagUS from 'flag-icons/flags/4x3/us.svg';

// Line icons in the ThaiWell style: 24px grid, 1.8 round stroke, optional duotone `.tone` fill
const P = {
  today: (<><circle className="tone" cx="12" cy="12" r="4.2" /><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" /></>),
  plans: (<><path className="tone" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5Z" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" /></>),
  map: (<><path className="tone" d="M9 4.5 3.8 6.6v13l5.2-2.1 6 2.1 5.2-2.1v-13L15 6.6Z" /><path d="M9 4.5v13M15 6.6v13" /></>),
  user: (<><circle className="tone" cx="12" cy="8.2" r="3.6" /><path className="tone" d="M5.6 19.6c.5-3.5 3.1-5.6 6.4-5.6s5.9 2.1 6.4 5.6a.9.9 0 0 1-.9 1H6.5a.9.9 0 0 1-.9-1Z" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  back: <path d="m15 18-6-6 6-6" />,
  next: <path d="m9 6 6 6-6 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  pin: (<><path className="tone" d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  calendar: (<><rect x="3.8" y="5" width="16.4" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.8 10h16.4" /></>),
  wallet: (<><path className="tone" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" /><path d="M16 12h.01M4 9h16" /></>),
  camera: (<><path className="tone" d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.7l1.4-2h4.8l1.4 2h1.7A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" /><circle cx="12" cy="12.5" r="3.3" /></>),
  bookmark: (<><path className="tone" d="M6.5 4h11a1 1 0 0 1 1 1v15.2l-6.5-4.1-6.5 4.1V5a1 1 0 0 1 1-1Z" /></>),
  link: (<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" /></>),
  nav: <path className="tone" d="M4.5 11.2 19 4.8l-6.4 14.5-1.8-5.8Z" />,
  users: (<><circle cx="9" cy="8.5" r="3.2" /><path d="M3.5 19c.4-3 2.6-4.8 5.5-4.8s5.1 1.8 5.5 4.8" /><path d="M16 5.6a3.2 3.2 0 0 1 0 5.8M18 14.6c1.4.7 2.3 2.2 2.5 4.4" /></>),
  share: (<><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" /></>),
  shuffle: (<><path d="M4 7h3.5c2 0 3.3 1 4.5 3l1 2c1.2 2 2.5 3 4.5 3H20M4 17h3.5c1.3 0 2.3-.4 3.2-1.2M14.3 8.2C15 7.4 16 7 17.5 7H20" /><path d="m18 5 2 2-2 2M18 13l2 2-2 2" /></>),
  note: (<><path className="tone" d="M5 4.5h10.5L19 8v11.5H5Z" /><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4" /></>),
  qr: (<><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2" /></>),
  sparkle: <path className="tone" d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5l-1.9-5.7L4.5 10.9 10.1 9Z" />,
  globe: (<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.3 2.3 3.4 5.2 3.4 8.5s-1.1 6.2-3.4 8.5c-2.3-2.3-3.4-5.2-3.4-8.5S9.7 5.8 12 3.5Z" /></>),
  more: (<><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></>),
  edit: (<><path className="tone" d="M15.5 4.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /><path d="m13.5 6.5 3 3" /></>),
  trash: (<><path d="M4.5 7h15M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" /><path className="tone" d="M6.5 7h11l-.8 12a1.5 1.5 0 0 1-1.5 1.4H8.8a1.5 1.5 0 0 1-1.5-1.4Z" /><path d="M10 11v5M14 11v5" /></>),
  leave: (<><path d="M14 4.5h3.5A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h9" /></>),
  piggy: (<><path className="tone" d="M4.5 12.6c0-3.3 3-5.6 6.9-5.6 2.5 0 4.6.9 5.9 2.4l1.8-.5-.3 2.3c.4.5.7 1.1.8 1.7l1.1.4v2.3l-1.4.4c-.6 1.1-1.6 2-2.9 2.6l-.2 1.8h-2.3l-.3-1.3c-.8.1-1.6.1-2.4 0l-.3 1.3H6.6l-.3-2.1c-1.1-1-1.8-2.3-1.8-3.7Z" /><path d="M9.8 7.4h3.4M16.4 12.2h.01" /></>),
  trophy: (<><path className="tone" d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H5v1.5A3 3 0 0 0 8 10.5M16 6h3v1.5a3 3 0 0 1-3 3M12 13v3.5M8.5 20h7M10 16.5h4" /></>),
  // weather
  wSun: (<><circle className="tone" cx="12" cy="12" r="4.2" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></>),
  wPartly: (<><path d="M8.5 4v1.5M3.5 9H5M5 5.5l1 1M13 5.5l-1 1" /><path d="M5.8 11.2a3.2 3.2 0 0 1 5.9-2.5" /><path className="tone" d="M8 19.5h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1.2A2.9 2.9 0 0 0 8 19.5Z" /></>),
  wCloud: <path className="tone" d="M7 18.5h10.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 18.5Z" />,
  wFog: (<><path className="tone" d="M7 14h10.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14Z" /><path d="M5 17.5h14M7 20.5h10" /></>),
  wRain: (<><path className="tone" d="M7 14.5h10.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14.5Z" /><path d="m8.5 17.5-1 2.5M12.5 17.5l-1 2.5M16.5 17.5l-1 2.5" /></>),
  wStorm: (<><path className="tone" d="M7 14h10.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14Z" /><path d="m12.5 15.5-2 3.5h3l-2 3.5" /></>),
  wSnow: (<><path className="tone" d="M7 14h10.5a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.6 1.4A3.3 3.3 0 0 0 7 14Z" /><path d="M8.5 18h.01M12 20h.01M15.5 18h.01" /></>),
  drop: <path className="tone" d="M12 3.5s-6 6.4-6 10.6a6 6 0 0 0 12 0c0-4.2-6-10.6-6-10.6Z" />,
  // place / expense categories
  food: (<><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" /><path className="tone" d="M17 21V3c-2.2 1.2-3.5 3.6-3.5 7v3H17" /></>),
  cafe: (<><path className="tone" d="M4.5 9h11v5.5A4.5 4.5 0 0 1 11 19H9a4.5 4.5 0 0 1-4.5-4.5Z" /><path d="M15.5 10.5h1.2a2.3 2.3 0 0 1 0 4.6h-1.5M8 3.5v2.5M11 3.5v2.5" /></>),
  sight: (<><path className="tone" d="m3.5 19 6-10.5 3.5 6 2.5-3.5 5 8Z" /><circle cx="16.5" cy="6.5" r="1.8" /></>),
  shop: (<><path className="tone" d="M5 8h14l-1 11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5Z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></>),
  stay: (<><path className="tone" d="M3.5 18v-6.5h17V18" /><path d="M3.5 6v14M20.5 14v6M3.5 15h17" /><circle cx="8" cy="9" r="1.8" /></>),
  move: (<><path className="tone" d="m3.5 13.5 17-6-4 12.5-4.2-4.3Z" /><path d="m12.3 15.7-2.8 4.3v-5.3" /></>),
  ticket: (<><path className="tone" d="M4 7.5h16v3a2 2 0 0 0 0 3v3H4v-3a2 2 0 0 0 0-3Z" /><path d="M14 7.5v9" strokeDasharray="1.5 2" /></>),
  other: (<><circle cx="12" cy="12" r="8.5" className="tone" /><path d="M9 12h.01M12 12h.01M15 12h.01" /></>),
  plane: <path className="tone" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2Z" />,
  umbrella: (<><path className="tone" d="M21 12a9 9 0 0 0-18 0Z" /><path d="M12 12v6.5a2 2 0 0 0 4 0M12 3v-.5" /></>),
  hot: (<><path className="tone" d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z" /><path d="M12 17.5v-5" /></>),
  beach: (<><circle className="tone" cx="16.5" cy="7.5" r="3" /><path d="M3 15.5c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1M3 19.5c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1" /></>),
  mountain: (<><path className="tone" d="m8.5 5 4 7 3-3.5L21 19H3Z" /><path d="m6.8 8 1.7 1.5L10.2 8" /></>),
  music: (<><circle className="tone" cx="7.5" cy="17.5" r="2.5" /><circle className="tone" cx="17" cy="15.5" r="2.5" /><path d="M10 17.5V6.5l9.5-2v11" /><path d="M10 10l9.5-2" /></>),
  event: (<><path className="tone" d="M4 7.5h16v3a2 2 0 0 0 0 3v3H4v-3a2 2 0 0 0 0-3Z" /><path d="m12 9.6.8 1.6 1.8.3-1.3 1.2.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.2 1.8-.3Z" /></>),
  gift: (<><rect className="tone" x="4" y="8" width="16" height="4" rx="1" /><path d="M12 8v12M18.5 12v6.5a1.5 1.5 0 0 1-1.5 1.5H7a1.5 1.5 0 0 1-1.5-1.5V12M8 8a2.3 2.3 0 0 1 0-4.6C10.4 3.4 12 8 12 8s1.6-4.6 4-4.6A2.3 2.3 0 0 1 16 8" /></>),
  // moods: a face each
  moodLove: (<><circle className="tone" cx="12" cy="12" r="8.6" /><path d="M8.6 8.8c-.5-.7-1.8-.4-1.6.6.1.7 1.6 1.6 1.6 1.6s1.5-.9 1.6-1.6c.2-1-1.1-1.3-1.6-.6ZM15.4 8.8c-.5-.7-1.8-.4-1.6.6.1.7 1.6 1.6 1.6 1.6s1.5-.9 1.6-1.6c.2-1-1.1-1.3-1.6-.6Z" strokeWidth="1.3" /><path d="M8.3 13.8a4 4 0 0 0 7.4 0Z" /></>),
  moodHappy: (<><circle className="tone" cx="12" cy="12" r="8.6" /><path d="M7.8 10.2a1.4 1.4 0 0 1 2.6 0M13.6 10.2a1.4 1.4 0 0 1 2.6 0M8.5 13.8a4 4 0 0 0 7 0" /></>),
  moodSmile: (<><circle className="tone" cx="12" cy="12" r="8.6" /><path d="M9 9.8v.6M15 9.8v.6" strokeWidth="2.2" /><path d="M9.2 14.3c1.6 1.2 4 1.2 5.6 0" /></>),
  moodMeh: (<><circle className="tone" cx="12" cy="12" r="8.6" /><path d="M9 9.8v.6M15 9.8v.6" strokeWidth="2.2" /><path d="M9.3 15h5.4" /></>),
  moodTired: (<><circle className="tone" cx="12" cy="12" r="8.6" /><path d="M7.8 10.6h2.6M13.6 10.6h2.6M10.6 15.4a1.4 1.4 0 0 1 2.8 0" /><path d="M17.5 15.5c1 .2 1.7-.3 2.3-1" strokeWidth="1.4" /></>),
};

export default function Icon({ name, size = 20, stroke = 1.8, className = '', style }) {
  return (
    <svg className={`pt-icon ${className}`} style={style} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || P.other}
    </svg>
  );
}

// Country flags (flag-icons, MIT); unknown countries get a globe
const FLAGS = { TH: flagTH, JP: flagJP, KR: flagKR, TW: flagTW, SG: flagSG, HK: flagHK, VN: flagVN, FR: flagFR, US: flagUS };
export function Flag({ code, size = 14, className = '' }) {
  if (!FLAGS[code]) return <Icon name="globe" size={size} className={className} />;
  return <img className={`pt-flag ${className}`} src={FLAGS[code]} alt="" style={{ height: size * 0.75, width: size }} />;
}

// Platform marks drawn as simple glyph badges (not the brands' logos)
// back to the post a place was saved from (on a phone it opens in TikTok / Instagram); otherwise just its badge
const SOURCE_OPEN = { tiktok: 'ดูคลิป', instagram: 'ดูโพสต์', web: 'เปิดลิงก์' };
export function SourceLink({ source, size = 22 }) {
  const type = source?.type || 'manual';
  const label = source?.url && SOURCE_OPEN[type];
  if (!label) return <SourceBadge type={type} size={size} />;
  return (
    <a className="pt-src-link" href={source.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
      {type === 'web' ? <Icon name="link" size={16} /> : <SourceBadge type={type} size={size} />}{label}
    </a>
  );
}

export function SourceBadge({ type, size = 22 }) {
  const glyph = {
    tiktok: <path d="M14 4v9.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.4 2.3 2 3.8 4.5 4" />,
    instagram: (<><rect x="5" y="5" width="14" height="14" rx="4" /><circle cx="12" cy="12" r="3.2" /><path d="M16.2 7.8h.01" /></>),
    maps: (<><path d="M12 20s-5.5-4.8-5.5-9.3a5.5 5.5 0 0 1 11 0c0 4.5-5.5 9.3-5.5 9.3Z" /><circle cx="12" cy="10.5" r="2" /></>),
    manual: (<><circle cx="11" cy="11" r="5.5" /><path d="m19 19-3.8-3.8" /></>),
  }[type] || null;
  return (
    <span className={`pt-src pt-src-${type}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.64} height={size * 0.64} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{glyph}</svg>
    </span>
  );
}
