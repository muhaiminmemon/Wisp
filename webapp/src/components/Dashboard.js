import React, { useState, useEffect } from 'react';
import { Menu, PlusCircle, Calendar, Clock, X, Pause, Play, Trash2, Edit2, Check } from 'lucide-react';
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
    const [tasks, setTasks] = useState([]);
    const [editingTask, setEditingTask] = useState(false);

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

    // Generate time options for dropdowns in 15-minute increments
    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 15) {
                const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
                const period = hour < 12 ? 'AM' : 'PM';
                const formattedMinute = minute.toString().padStart(2, '0');
                const timeString = `${formattedHour}:${formattedMinute}`;
                const value = `${hour.toString().padStart(2, '0')}:${formattedMinute}`;
                options.push(
                    <option key={value} value={value}>
                        {timeString} {period}
                    </option>
                );
            }
        }
        return options;
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
                
                // Also fetch all upcoming events for the tasks list
                fetchCalendarEvents(session.provider_token);
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
                    
                    // Also fetch all upcoming events for the tasks list
                    fetchCalendarEvents(session.provider_token);
                } else {
                    setCurrentTask('No upcoming tasks');
                }
            }
        } catch (error) {
            console.error('Error fetching current event:', error);
            setCurrentTask('Error fetching tasks');
        }
    };
    
    const fetchCalendarEvents = async (token) => {
        try {
            const now = new Date();
            const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
            
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
                `timeMin=${now.toISOString()}&` +
                `timeMax=${twoWeeksLater.toISOString()}&` +
                `orderBy=startTime&singleEvents=true&maxResults=10`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            
            if (!response.ok) throw new Error('Failed to fetch calendar events');
            
            const data = await response.json();
            if (data.items) {
                setTasks(data.items.map(item => ({
                    id: item.id,
                    summary: item.summary,
                    start: new Date(item.start.dateTime || item.start.date),
                    end: new Date(item.end.dateTime || item.end.date)
                })));
            }
        } catch (error) {
            console.error('Error fetching calendar events:', error);
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

            // Show success message with nice animation
            const successMessage = document.createElement('div');
            successMessage.innerText = 'Task added successfully!';
            successMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #10B981;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                opacity: 0;
                transform: translateX(20px);
                transition: opacity 0.3s, transform 0.3s;
            `;
            document.body.appendChild(successMessage);
            
            // Trigger animation
            setTimeout(() => {
                successMessage.style.opacity = '1';
                successMessage.style.transform = 'translateX(0)';
            }, 10);
            
            // Remove after delay
            setTimeout(() => {
                successMessage.style.opacity = '0';
                successMessage.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    document.body.removeChild(successMessage);
                }, 300);
            }, 3000);
            
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
    
    const deleteTask = async (taskId) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session found');
            
            const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/primary/events/${taskId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${session.provider_token}`
                    }
                }
            );
            
            if (!response.ok) throw new Error('Failed to delete event');
            
            // Update the tasks list
            setTasks(tasks.filter(task => task.id !== taskId));
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.innerText = 'Task deleted successfully!';
            successMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background-color: #EF4444;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                z-index: 1000;
                opacity: 0;
                transform: translateX(20px);
                transition: opacity 0.3s, transform 0.3s;
            `;
            document.body.appendChild(successMessage);
            
            // Trigger animation
            setTimeout(() => {
                successMessage.style.opacity = '1';
                successMessage.style.transform = 'translateX(0)';
            }, 10);
            
            // Remove after delay
            setTimeout(() => {
                successMessage.style.opacity = '0';
                successMessage.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    document.body.removeChild(successMessage);
                }, 300);
            }, 3000);
            
            // If the deleted task was the current task, refresh
            if (currentTask.includes(tasks.find(task => task.id === taskId)?.summary)) {
                fetchCurrentEvent();
            }
            
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Failed to delete task. Please try again.');
        }
    };

    // Format date for display in tasks list
    const formatDate = (date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
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
                        <div className="flex items-center">
                            {editingTask ? (
                                <>
                                    <input 
                                        type="text" 
                                        value={currentTask} 
                                        onChange={handleTaskChange}
                                        className="flex-1 bg-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button 
                                        onClick={() => setEditingTask(false)}
                                        className="ml-2 p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                                    >
                                        <Check size={18} className="text-white" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 bg-gray-600 text-white p-3 rounded-lg">
                                        {currentTask}
                                    </div>
                                    <button 
                                        onClick={() => setEditingTask(true)}
                                        className="ml-2 p-2 bg-gray-500 rounded-full hover:bg-gray-600 transition-colors"
                                    >
                                        <Edit2 size={18} className="text-white" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-gray-700 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-400 mb-2">
                            {blockingEnabled ? "Blocked: Social Media, Entertainment" : "Blocking is currently paused"}
                        </p>
                        {blockingEnabled && (
                            <p className="text-sm text-gray-400">Allowed: LeetCode, Stack Overflow, GitHub</p>
                        )}
                    </div>
                    
                    {/* Task List */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium text-blue-400">Upcoming Tasks</h3>
                            <button 
                                onClick={() => setShowTaskForm(!showTaskForm)} 
                                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
                            >
                                <PlusCircle size={16} className="mr-1" />
                                New Task
                            </button>
                        </div>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {tasks.length > 0 ? (
                                tasks.map(task => (
                                    <div key={task.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-duration-200">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{task.summary}</p>
                                            <p className="text-xs text-gray-400">{formatDate(task.start)}</p>
                                        </div>
                                        <button 
                                            onClick={() => deleteTask(task.id)}
                                            className="ml-2 p-1.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                            title="Delete Task"
                                        >
                                            <Trash2 size={14} className="text-white" />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-4 text-gray-500">
                                    No upcoming tasks
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Add New Task Form - Modern UI */}
                    {showTaskForm && (
                        <div className="mt-6 bg-gray-700 p-5 rounded-xl shadow-lg border border-gray-600 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-blue-400">Add New Task</h3>
                                <button 
                                    onClick={() => setShowTaskForm(false)}
                                    className="p-1 rounded-full hover:bg-gray-600 transition-colors"
                                >
                                    <X size={20} className="text-gray-400 hover:text-white" />
                                </button>
                            </div>
                            <form onSubmit={addTaskToCalendar} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Task Title
                                    </label>
                                    <input
                                        type="text"
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        placeholder="What would you like to work on?"
                                        className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Date
                                    </label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full bg-gray-800 text-white p-3 pl-10 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Start Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <select
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                                className="w-full bg-gray-800 text-white p-3 pl-10 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none"
                                                required
                                            >
                                                <option value="" disabled>Select time</option>
                                                {generateTimeOptions()}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            End Time
                                        </label>
                                        <div className="relative">
                                            <Clock className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <select
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                                className="w-full bg-gray-800 text-white p-3 pl-10 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors appearance-none"
                                                required
                                            >
                                                <option value="" disabled>Select time</option>
                                                {generateTimeOptions()}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                                >
                                    <PlusCircle size={18} className="mr-2" />
                                    Add to Calendar
                                </button>
                            </form>
                        </div>
                    )}
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
            
            {/* Add some CSS for animations */}
            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #1f2937;
                    border-radius: 8px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #4b5563;
                    border-radius: 8px;
                }
                
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;