import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

      const startDate = getStartOfWeek(currentDate);
      const endDate = getEndOfWeek(currentDate);

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}`,
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
      // You might want to set an error state here and display it to the user
    } finally {
      setLoading(false);
    }
  };

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 7;
    return new Date(d.setDate(diff));
  };

  const getDaysOfWeek = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startOfWeek = getStartOfWeek(currentDate);
    
    return days.map((day, index) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);
      return { day, date };
    });
  };

  const getEventsByDay = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  if (loading) return <div className="text-center p-4 text-gray-400">Loading calendar...</div>;

  return (
    <div className="google-calendar">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))} className="p-1 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 transition-colors">
            Today
          </button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))} className="p-1 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 text-sm">
        {getDaysOfWeek().map(({ day, date }) => (
          <div key={day} className="text-center">
            <div className="font-medium text-gray-400 mb-1">{day}</div>
            <div className={`mb-1 ${
              date.toDateString() === new Date().toDateString() 
                ? 'text-blue-400 font-bold' 
                : 'text-gray-300'
            }`}>
              {date.getDate()}
            </div>
            <div className="space-y-1">
              {getEventsByDay(date).map(event => (
                <div 
                  key={event.id} 
                  className="text-xs p-1 rounded-sm truncate bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                  title={event.summary}
                >
                  {event.summary}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GoogleCalendar;