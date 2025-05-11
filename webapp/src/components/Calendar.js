import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const GoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const startDate = getStartOfMonth(currentDate);
      const endDate = getEndOfMonth(currentDate);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: {
            Authorization: `Bearer ${session.provider_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch calendar events');

      const data = await response.json();
      setEvents(data.items || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getDaysInMonth = () => {
    const days = [];
    const startDay = getStartOfMonth(currentDate);
    const endDay = getEndOfMonth(currentDate);
    
    // Get the first day of the month
    const firstDayOfMonth = new Date(startDay);
    
    // Find the first day of the first week to display (might be from previous month)
    const firstDayToDisplay = new Date(firstDayOfMonth);
    firstDayToDisplay.setDate(firstDayToDisplay.getDate() - firstDayToDisplay.getDay());
    
    // Find the last day to display (might be from next month)
    const lastDayToDisplay = new Date(endDay);
    lastDayToDisplay.setDate(lastDayToDisplay.getDate() + (6 - lastDayToDisplay.getDay()));
    
    // Add all days to the array
    for (let d = new Date(firstDayToDisplay); d <= lastDayToDisplay; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }
    
    return days;
  };

  const getEventsByDay = (date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start.dateTime || event.start.date);
      return eventStart.toDateString() === date.toDateString();
    });
  };

const formatEventTime = (event) => {
    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) return <div className="text-center p-4 text-gray-400">Loading calendar...</div>;

  // Get days to display in the grid
  const daysInMonth = getDaysInMonth();
  
  // Group days into weeks
  const weeks = [];
  for (let i = 0; i < daysInMonth.length; i += 7) {
    weeks.push(daysInMonth.slice(i, i + 7));
  }

  return (
    <div className="google-calendar bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} 
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 transition-colors"
          >
            Today
          </button>
          <button 
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} 
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-1 text-sm text-center text-gray-400">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={index} className="p-1">{day}</div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date, dateIndex) => {
              // Check if date is from current month
              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              // Check if date is today
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div 
                  key={dateIndex} 
                  className={`
                    min-h-32 bg-gray-700 rounded p-1 overflow-y-auto text-xs 
                    ${!isCurrentMonth ? 'opacity-40' : ''}
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  <div className={`
                    text-right p-1 font-medium 
                    ${isToday ? 'text-blue-400' : 'text-gray-300'}
                  `}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1 mt-1">
                    {getEventsByDay(date).map(event => ( 
                      <div 
                        key={event.id} 
                        className="p-1 rounded-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer truncate"
                        title={event.summary}
                      >
                        <div className="font-medium truncate text-xs">{event.summary}</div>
                        {event.start.dateTime && (
                          <div className="flex items-center text-gray-200 text-xs truncate">
                            <Clock size={10} className="mr-1 flex-shrink-0" />
                            <span className="truncate">{formatEventTime(event)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoogleCalendar;