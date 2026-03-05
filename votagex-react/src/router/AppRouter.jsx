import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import CreationFlow from '../pages/creation/CreationFlow';
import HomePage from '../pages/HomePage';
import ITripPage from '../pages/ITripPage';
import MePage from '../pages/MePage';
import JoinScreen from '../pages/JoinScreen';
import TripDetailPage from '../pages/TripDetailPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreationFlow />} />
        <Route path="/join" element={<JoinScreen />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
        <Route path="/itrip" element={<ProtectedRoute><ITripPage /></ProtectedRoute>} />
        <Route path="/me" element={<ProtectedRoute><MePage /></ProtectedRoute>} />
        <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
