import { Outlet, useLocation } from 'react-router-dom';
import TabBar from './TabBar';

export default function TabLayout() {
  const location = useLocation();
  const currentTab = location.pathname === '/home' ? 'home'
    : location.pathname === '/itrip' ? 'itrip'
    : 'me';

  return (
    <>
      <div className={`tab-persistent-bg tab-bg-${currentTab}`}>
        <img src="/assets/header-bg.png" alt="" />
      </div>
      <Outlet />
      <TabBar />
    </>
  );
}
