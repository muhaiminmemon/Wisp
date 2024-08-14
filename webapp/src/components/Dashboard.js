import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle } from 'lucide-react';
import GoogleCalendar from './GoogleCalendar';
import ScreenTime from './ScreenTime';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const [currentTask, setCurrentTask] = useState('No tasks currently');
    const [newTask, setNewTask] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [showTaskForm, setShowTaskForm] = useState(false);

    const updateExtensionTask = (task) => {
        console.log('Sending task update to extension:', task);
        window.postMessage({
            type: 'FROM_WEBAPP',
            payload: { action: 'updateTask', task }
        }, '*');
    };

    const fetchCurrentEvent = async () => {
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No session found');
  
          const now = new Date();
          const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
          const response = await fetch(
              `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
              `timeMin=${now.toISOString()}&` +
              `timeMax=${fiveMinutesLater.toISOString()}&` +
              `orderBy=startTime&singleEvents=true&maxResults=1`,
              {
                  headers: {
                      Authorization: `Bearer ${session.provider_token}`,
                  },
              }
          );
  
          if (!response.ok) throw new Error('Failed to fetch calendar events');
  
          const data = await response.json();
          if (data.items && data.items.length > 0) {
              setCurrentTask(data.items[0].summary);
          } else {
              // If no current event, check for the next upcoming event
              const nextEventResponse = await fetch(
                  `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
                  `timeMin=${now.toISOString()}&` +
                  `orderBy=startTime&singleEvents=true&maxResults=1`,
                  {
                      headers: {
                          Authorization: `Bearer ${session.provider_token}`,
                      },
                  }
              );
  
              if (!nextEventResponse.ok) throw new Error('Failed to fetch next event');
  
              const nextEventData = await nextEventResponse.json();
              if (nextEventData.items && nextEventData.items.length > 0) {
                  const nextEvent = nextEventData.items[0];
                  const startTime = new Date(nextEvent.start.dateTime || nextEvent.start.date);
                  setCurrentTask(`Next: ${nextEvent.summary} (${startTime.toLocaleTimeString()})`);
              } else {
                  setCurrentTask('No upcoming tasks');
              }
          }
      } catch (error) {
          console.error('Error fetching current event:', error);
          setCurrentTask('Error fetching tasks');
      }
  };
    useEffect(() => {
        fetchCurrentEvent();
        const intervalId = setInterval(fetchCurrentEvent, 60000);
        return () => clearInterval(intervalId);
    }, []);

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

    const addTaskToCalendar = async (e) => {
        e.preventDefault();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session found');

            const event = {
                'summary': newTask,
                'start': {
                    'dateTime': `${new Date().toISOString().split('T')[0]}T${startTime}:00`,
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                'end': {
                    'dateTime': `${new Date().toISOString().split('T')[0]}T${endTime}:00`,
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                }
            };

            const response = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.provider_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(event)
                }
            );

            if (!response.ok) throw new Error('Failed to add event to calendar');

            alert('Task added to calendar successfully!');
            setNewTask('');
            setStartTime('');
            setEndTime('');
            setShowTaskForm(false);
            fetchCurrentEvent(); // Refresh the current task
        } catch (error) {
            console.error('Error adding task to calendar:', error);
            alert('Failed to add task to calendar. Please try again.');
        }
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
                    <button 
                        onClick={() => setShowTaskForm(!showTaskForm)} 
                        className="mt-4 flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                    >
                        <PlusCircle size={20} className="mr-2" />
                        Add New Task
                    </button>
                    {showTaskForm && (
                        <form onSubmit={addTaskToCalendar} className="mt-4 bg-gray-700 p-4 rounded">
                            <input
                                type="text"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                placeholder="Task name"
                                className="w-full bg-gray-600 text-white p-2 rounded mb-2"
                                required
                            />
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full bg-gray-600 text-white p-2 rounded mb-2"
                                required
                            />
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full bg-gray-600 text-white p-2 rounded mb-2"
                                required
                            />
                            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">
                                Add Task to Calendar
                            </button>
                        </form>
                    )}
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