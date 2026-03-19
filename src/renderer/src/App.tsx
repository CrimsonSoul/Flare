import { ToastProvider } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { WindowControls } from './components/WindowControls';
import { AlertsTab } from './tabs/AlertsTab';
import './styles.css';

export default function App() {
  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="app-container">
          <div className="titlebar">
            <WindowControls />
          </div>
          <AlertsTab />
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
}
