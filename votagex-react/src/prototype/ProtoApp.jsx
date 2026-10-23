import { Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ProtoProvider } from './store';
import { useProto } from './useProto';
import Icon from './icons';
import ProtoSheets from './sheets';
import TodayPage from './pages/TodayPage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import MapPage from './pages/MapPage';
import MePage from './pages/MePage';
import RecapPage from './pages/RecapPage';
import { useRates } from './rates';
import AutoCheckIn from './AutoCheckIn';
import './proto.css';

const TABS = [
  { key: 'today', label: 'วันนี้', icon: 'today' },
  { key: 'plans', label: 'แผน', icon: 'plans' },
  { key: 'add' },
  { key: 'map', label: 'แผนที่', icon: 'map' },
  { key: 'me', label: 'ฉัน', icon: 'user' },
];

// Glass dock from the current app, with a quick-add button in the middle
function Dock() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { openSheet } = useProto();
  const current = pathname.split('/')[2] || 'today';
  return (
    <div className="hp-tab-bar">
      <nav className="hp-dock" role="tablist">
        {TABS.map((t) => {
          if (t.key === 'add') {
            return (
              <button key="add" className="pt-dock-add" aria-label="บันทึกด่วน" onClick={() => openSheet('quickAdd')}>
                <Icon name="plus" size={22} stroke={2.4} />
              </button>
            );
          }
          const active = current === t.key;
          return (
            <button key={t.key} role="tab" aria-selected={active} aria-label={t.label} className={`hp-tab ${active ? 'active' : ''}`}
              onClick={() => { if (!active) navigate(`/proto/${t.key}`); }}>
              <Icon name={t.icon} size={22} />
              <span className="hp-tab-label">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function TabsLayout() {
  return (<><Outlet /><Dock /></>);
}

function Toast() {
  const { toast, hideToast } = useProto();
  if (!toast) return null;
  return (
    <div className={`pt-toast${toast.action ? ' has-action' : ''}`} role="status">
      <span>{toast.msg}</span>
      {toast.action && <button className="pt-toast-action" onClick={() => { toast.action.onClick(); hideToast(); }}>{toast.action.label}</button>}
    </div>
  );
}

export default function ProtoApp() {
  useRates(); // live exchange rates; the app re-renders when they land
  return (
    <ProtoProvider>
      {/* display: contents — only here to scope the prototype's tokens (softer corners) */}
      <div className="pt-app">
      <Routes>
        <Route element={<TabsLayout />}>
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<TodayPage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="me" element={<MePage />} />
        </Route>
        <Route path="plan/:planId" element={<PlanDetailPage />} />
        <Route path="plan/:planId/recap" element={<RecapPage />} />
        <Route path="*" element={<Navigate to="today" replace />} />
      </Routes>
      <ProtoSheets />
      <AutoCheckIn />
      <Toast />
      </div>
    </ProtoProvider>
  );
}
