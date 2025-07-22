// src/main.jsx (or main.js)
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx'; // Assuming App.jsx is your main app component
import './styles/styles.css'; // This should be the ONLY CSS import here for global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);