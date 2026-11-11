import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const mount = document.getElementById('root');
if (!mount) throw new Error('Case review root element was not found.');
createRoot(mount).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
