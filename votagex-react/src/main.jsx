import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Import all CSS files
import './styles/style.css';
import './styles/pageview.css';
import './styles/page-landing.css';
import './styles/page-tripname.css';
import './styles/page-dates.css';
import './styles/page-profile.css';
import './styles/page-activities.css';
import './styles/page-members.css';
import './styles/modals.css';
import './styles/join-screen.css';
import './styles/calendar.css';
import './styles/homepage.css';
import './styles/itrip.css';
import './styles/me-page.css';
import './styles/login.css';
import './styles/trip-detail.css';

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
