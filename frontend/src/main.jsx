import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource-variable/inter';
import App from './App.jsx';
import { bootstrapSession } from './lib/api.js';
import './index.css';
// Learn who is signed in (from the HttpOnly session cookies) before the first paint of protected areas.
bootstrapSession().finally(() => ReactDOM.createRoot(document.getElementById('root')).render(<BrowserRouter><App /></BrowserRouter>));
