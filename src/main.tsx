/**
 * React entry point.
 * What : Boots the app, wraps in providers, mounts to #root.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import './styles/tailwind.css';
// Importing the settings store here ensures the theme is applied before first paint.
import './stores/settings.store';
import './stores/theme.store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
