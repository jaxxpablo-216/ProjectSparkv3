import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import { UserProvider } from './components/UserProvider';
import { ReservationProvider } from './components/ReservationProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <UserProvider>
        <ReservationProvider>
          <App />
        </ReservationProvider>
      </UserProvider>
    </ErrorBoundary>
  </StrictMode>,
);
