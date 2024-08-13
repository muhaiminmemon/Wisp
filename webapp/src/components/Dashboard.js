import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import GoogleCalendar from './GoogleCalendar';
import ScreenTime from './ScreenTime';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentTask, setCurrentTask] = useState('job searching');

    const updateExtensionTask = (task) => {
      console.log('Sending task update to extension:', task);
      window.postMessage({
          type: 'FROM_WEBAPP',
          payload: { action: 'updateTask', task }
      }, '*');
  };

  useEffect(() => {
      console.log('Current task in Dashboard:', currentTask);
      updateExtensionTask(currentTask);
  }, [currentTask]);

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            navigate('/');
        } catch (error) {
            alert(error.message);
        }
    };

    const handleTaskChange = (event) => {
        setCurrentTask(event.target.value);
    };

    return (
        <div className="bg-gray-900 min-h-screen text-white p-6">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Wisp Dashboard</h1>
                <button className="p-2 bg-blue-600 rounded-md">
                    <Menu size={24} />
                </button>
            </header>
      
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScreenTime />
        
                <div className="bg-gray-800 rounded-lg p-4">
                    <h2 className="text-xl font-semibold mb-4">Smart Blocking</h2>
                    <div className="bg-gray-700 rounded p-3 mb-3">
                        <h3 className="font-medium">Current Task:</h3>
                        <input 
                            type="text" 
                            value={currentTask} 
                            onChange={handleTaskChange}
                            className="w-full bg-gray-600 text-white p-2 rounded mt-2"
                        />
                    </div>
                    <div className="bg-gray-700 rounded p-3">
                        <p className="text-sm text-gray-400">Blocked: Social Media, Entertainment</p>
                        <p className="text-sm text-gray-400">Allowed: LeetCode, Stack Overflow, GitHub</p>
                    </div>
                </div>
            </div>
      
            <div className="mt-6 bg-gray-800 rounded-lg p-4">
                <h2 className="text-xl font-semibold mb-4">Calendar Integration</h2>
                <GoogleCalendar />
                <button onClick={handleLogout} className="logout-button mt-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;