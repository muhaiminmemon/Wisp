import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle, Calendar, Clock, X, Pause, Play } from 'lucide-react';
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
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [blockingEnabled, setBlockingEnabled] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            if (data.user) {
                setUser(data.user);
            }
        };
        getUser();
    }, []);

    const toggleBlocking = async () => {
        try {
            const newState = !blockingEnabled;
            setBlockingEnabled(newState);
            
            if (!user) {
                console.error('No user found. Cannot toggle blocking.');
                return;
            }
            
            // Update the server with the blocking preference
            const response = await fetch('http://localhost:4500/api/toggle-blocking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    enabled: newState,
                    userId: user.id
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update blocking preference');
            }
            
            console.log(`Blocking ${newState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('Error toggling blocking state:', error);
            // Revert the state if the server update failed
            setBlockingEnabled(!blockingEnabled);
        }
    };

    const updateExtensionTask = (task) => {
        console.log('Sending task update to extension:', task);
        
        // Update the task-user association on the server
        if (user) {
            fetch('http://localhost:4500/api/update-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task: task,
                    userId: user.id
                })
            })
            .then(response => {
                if (!response.ok) {
                    console.error('Failed to update task-user association');
                }
                return response.json();
            })
            .then(data => {
                console.log('Task-user association response:', data);
            })
            .catch(error => {
                console.error('Error updating task-user association:', error);
            });
        }
        
        // Send the task to the extension
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
    }, [currentTask, user]); // Add user as dependency to update the association when user is loaded

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
                    'dateTime': `${selectedDate}T${startTime}:00`,
                    'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
                },
                'end': {
                    'dateTime': `${selectedDate}T${endTime}:00`,
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
            setSelectedDate(new Date().toISOString().split('T')[0]);
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
                <h1 className="text-2xl font-bold text-blue-400">Wisp Dashboard</h1>
                <button className="p-2 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
                    <Menu size={24} />
                </button>
            </header>
      
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ScreenTime />
        
                <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold">Smart Blocking</h2>
                        <button 
                            onClick={toggleBlocking}
                            className={`p-2 rounded-full ${blockingEnabled ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-600 hover:bg-gray-700'} transition-colors`}
                            title={blockingEnabled ? "Pause Blocking" : "Resume Blocking"}
                        >
                            {blockingEnabled ? 
                                <Pause size={18} className="text-white" /> : 
                                <Play size={18} className="text-white" />
                            }
                        </button>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4 mb-4">
                        <h3 className="font-medium text-gray-300 mb-2">Current Task:</h3>
                        <input 
                            type="text" 
                            value={currentTask} 
                            onChange={handleTaskChange}
                            className="w-full bg-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-400 mb-2">
                            {blockingEnabled ? "Blocked: Social Media, Entertainment" : "Blocking is currently paused"}
                        </p>
                        {blockingEnabled && (
                            <p className="text-sm text-gray-400">Allowed: LeetCode, Stack Overflow, GitHub</p>
                        )}
                    </div>
                    <div className="space-y-4">
                        <button 
                            onClick={() => setShowTaskForm(!showTaskForm)} 
                            className="w-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            <PlusCircle size={20} className="mr-2" />
                            Add New Task
                        </button>
                        {showTaskForm && (
                            <div className="bg-gray-700 p-6 rounded-lg shadow-lg space-y-4">
                                <form onSubmit={addTaskToCalendar}>
                                    {/* Task Title */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Task Title
                                        </label>
                                        <input
                                            type="text"
                                            value={newTask}
                                            onChange={(e) => setNewTask(e.target.value)}
                                            placeholder="Enter task name"
                                            className="w-full bg-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    {/* Date Selection */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Date
                                        </label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                                className="w-full bg-gray-600 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Time Selection */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Start Time
                                            </label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                                <input
                                                    type="time"
                                                    value={startTime}
                                                    onChange={(e) => setStartTime(e.target.value)}
                                                    className="w-full bg-gray-600 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                End Time
                                            </label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                                <input
                                                    type="time"
                                                    value={endTime}
                                                    onChange={(e) => setEndTime(e.target.value)}
                                                    className="w-full bg-gray-600 text-white p-3 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            type="submit" 
                                            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                                        >
                                            Add to Calendar
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => setShowTaskForm(false)}
                                            className="bg-gray-600 hover:bg-gray-500 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
      
            <div className="mt-6 bg-gray-800 rounded-lg p-6 shadow-lg">
                <h2 className="text-xl font-semibold mb-6">Calendar Integration</h2>
                <GoogleCalendar />
                <button 
                    onClick={handleLogout} 
                    className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Dashboard;