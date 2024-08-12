// src/components/Dashboard.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>
      <p>Welcome to your dashboard!</p>
      <button onClick={handleLogout} className="logout-button">Logout</button>
    </div>
  );
};

export default Dashboard;