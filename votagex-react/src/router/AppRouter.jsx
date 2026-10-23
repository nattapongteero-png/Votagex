import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

// The app (it grew out of the /proto prototype). The first app's pages are retired: every old address
// lands here. Their files go once phase 3 of docs/ROADMAP.md is done.
const ProtoApp = lazy(() => import('../prototype/ProtoApp'));

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/proto/*" element={<Suspense fallback={<div className="loading-screen">กำลังโหลด...</div>}><ProtoApp /></Suspense>} />
        <Route path="*" element={<Navigate to="/proto" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
