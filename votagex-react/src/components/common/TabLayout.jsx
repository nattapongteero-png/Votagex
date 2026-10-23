import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

export default function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}
