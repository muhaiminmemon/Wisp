import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const TaskForm = ({ isOpen, onClose, onSubmit }) => {
  const [taskData, setTaskData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    description: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!taskData.title.trim()) {
      setError('Task title is required');
      return false;
    }
    if (!taskData.date) {
      setError('Date is required');
      return false;
    }
    if (!taskData.startTime || !taskData.endTime) {
      setError('Both start and end times are required');
      return false;
    }
    
    const startDateTime = new Date(`${taskData.date}T${taskData.startTime}`);
    const endDateTime = new Date(`${taskData.date}T${taskData.endTime}`);
    
    if (endDateTime <= startDateTime) {
      setError('End time must be after start time');
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    const event = {
      summary: taskData.title,
      description: taskData.description,
      start: {
        dateTime: `${taskData.date}T${taskData.startTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: `${taskData.date}T${taskData.endTime}:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
    
    onSubmit(event);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4 text-white">Add New Task</h2>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Task Title
            </label>
            <input
              type="text"
              name="title"
              value={taskData.title}
              onChange={handleChange}
              className="w-full bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2 top-2.5 text-gray-400" size={16} />
              <input
                type="date"
                name="date"
                value={taskData.date}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded p-2 pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Time
              </label>
              <div className="relative">
                <Clock className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  type="time"
                  name="startTime"
                  value={taskData.startTime}
                  onChange={handleChange}
                  className="w-full bg-gray-700 text-white rounded p-2 pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Time
              </label>
              <div className="relative">
                <Clock className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  type="time"
                  name="endTime"
                  value={taskData.endTime}
                  onChange={handleChange}
                  className="w-full bg-gray-700 text-white rounded p-2 pl-8"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={taskData.description}
              onChange={handleChange}
              className="w-full bg-gray-700 text-white rounded p-2 h-20 resize-none"
              placeholder="Add description..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Add to Calendar
          </button>
        </form>
      </div>
    </div>
  );
};

export default TaskForm;