import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../App.tsx'
import '../styles/globals.css'

// Initialize offline functionality
import { offlineManager } from '../utils/offline-manager'

// Hide loading screen
declare global {
  interface Window {
    hideLoadingScreen: () => void;
  }
}

// Initialize the app
const initializeApp = async () => {
  try {
    console.log('🚀 Initializing Best Brightness E-Commerce Platform...');
    
    // Initialize offline data
    offlineManager.initializeMockData();
    
    // Create React root and render app
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    console.log('✅ App initialized successfully');
    
    // Hide loading screen
    setTimeout(() => {
      if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
      }
    }, 1000);
    
  } catch (error) {
    console.error('💥 Failed to initialize app:', error);
    
    // Show error fallback
    const errorFallback = document.getElementById('error-fallback');
    const loadingScreen = document.getElementById('loading-screen');
    
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    
    if (errorFallback) {
      errorFallback.style.display = 'block';
    }
  }
};

// Start the app
initializeApp();