import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import CreationFlow from '../pages/creation/CreationFlow';
import HomePage from '../pages/HomePage';
import ITripPage from '../pages/ITripPage';
import MePage from '../pages/MePage';
import JoinScreen from '../pages/JoinScreen';
import TripDetailPage from '../pages/TripDetailPage';
import TabLayout from '../components/common/TabLayout';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreationFlow />} />
        <Route path="/join" element={<JoinScreen />} />
        <Route element={<ProtectedRoute><TabLayout /></ProtectedRoute>}>
          <Route path="/home" element={<HomePage />} />
          <Route path="/itrip" element={<ITripPage />} />
          <Route path="/me" element={<MePage />} />
        </Route>
        <Route path="/trip/:tripId" element={<ProtectedRoute><TripDetailPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
