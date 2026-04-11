import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Fix for libraries that try to overwrite window.fetch (e.g. @google/genai)
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  try {
    Object.defineProperty(window, 'fetch', {
      value: originalFetch,
      writable: true,
      configurable: true
    });
  } catch (e) {
    console.warn('Could not make window.fetch writable:', e);
  }
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
