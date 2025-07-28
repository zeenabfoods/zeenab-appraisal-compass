
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { startLayoutWatcher } from './utils/layoutTesting'

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ PWA Service Worker registered successfully:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 PWA update found, installing...');
        });
      })
      .catch((error) => {
        console.error('❌ PWA Service Worker registration failed:', error);
      });
  });
}

// Start layout consistency monitoring in development
if (process.env.NODE_ENV === 'development') {
  // Wait for initial render
  setTimeout(() => {
    const cleanup = startLayoutWatcher();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
  }, 2000);
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(<App />);
