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

// a page opened before a deploy asks for code files the deploy replaced: load the new page instead (once)
window.addEventListener('vite:preloadError', (e) => {
  if (sessionStorage.getItem('votagex.reloaded')) return;
  e.preventDefault();
  sessionStorage.setItem('votagex.reloaded', '1');
  window.location.reload();
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('votagex.reloaded'), 10000));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
