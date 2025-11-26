
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StorageService } from './services/storageService';
import ErrorBoundary from './components/ErrorBoundary';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Safely initialize storage
try {
    StorageService.init();
} catch (e) {
    console.error("Failed to initialize storage:", e);
    // Proceeding to render anyway, ErrorBoundary might catch subsequent failures or App might handle empty state
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
  </React.StrictMode>
);
