import { useNavigate, useLocation } from 'react-router-dom';

// Dock icons in the ThaiWell style: 24px grid, 1.8 round stroke, duotone fill on the active tab
const ICONS = {
  home: (
    <>
      <path className="tone" d="M3.8 10.4 12 4l8.2 6.4v8.3a2.3 2.3 0 0 1-2.3 2.3H6.1a2.3 2.3 0 0 1-2.3-2.3Z" />
      <path d="M9.6 21v-4.6a2.4 2.4 0 0 1 4.8 0V21" />
    </>
  ),
  itrip: (
    <>
      <path className="tone" d="M5.5 14.5h10.7c1.5 0 2.4-1.7 1.6-3l-.5-.9a2.5 2.5 0 0 1 0-2.5l.5-.9c.8-1.3-.1-3-1.6-3H5.5Z" />
      <path d="M5.5 14.5V21" />
    </>
  ),
  profile: (
    <>
      <circle className="tone" cx="12" cy="8.2" r="3.6" />
      <path className="tone" d="M5.6 19.6c.5-3.5 3.1-5.6 6.4-5.6s5.9 2.1 6.4 5.6a.9.9 0 0 1-.9 1H6.5a.9.9 0 0 1-.9-1Z" />
    </>
  ),
};

const TABS = [
  { key: 'home', label: 'หน้าหลัก', path: '/home' },
  { key: 'itrip', label: 'iTrip', path: '/itrip' },
  { key: 'profile', label: 'ฉัน', path: '/me' },
];

export default function TabBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname === '/home' ? 'home'
    : location.pathname === '/itrip' ? 'itrip'
    : location.pathname === '/me' ? 'profile'
    : 'home';

  return (
    <div className="hp-tab-bar">
      <nav className="hp-dock" role="tablist">
        {TABS.map(tab => {
          const active = tab.key === currentTab;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              className={`hp-tab ${active ? 'active' : ''}`}
              data-tab={tab.key}
              onClick={() => { if (!active) navigate(tab.path); }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[tab.key]}
              </svg>
              <span className="hp-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
