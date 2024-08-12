// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './styles/App.css';

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      if (session) {
        syncWithExtension('login', session.user);
      } else {
        syncWithExtension('logout');
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const syncWithExtension = (action, user = null) => {
    window.postMessage({
      type: 'FROM_WEBAPP',
      payload: { action, user }
    }, '*');
  };

  return (
    <Router>
      <div className="container">
        <Routes>
          <Route 
            path="/" 
            element={!session ? <Login /> : <Navigate to="/dashboard" replace />} 
          />
          <Route 
            path="/dashboard" 
            element={session ? <Dashboard /> : <Navigate to="/" replace />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;