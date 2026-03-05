import { AuthProvider } from './contexts/AuthContext';
import { TripProvider } from './contexts/TripContext';
import AppRouter from './router/AppRouter';

export default function App() {
  return (
    <AuthProvider>
      <TripProvider>
        <AppRouter />
      </TripProvider>
    </AuthProvider>
  );
}
