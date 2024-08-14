import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const GoogleCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week'); // 'week' or 'month'

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate, view]);

  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session found');

      const startDate = view === 'week' ? getStartOfWeek(currentDate) : getStartOfMonth(currentDate);
      const endDate = view === 'week' ? getEndOfWeek(currentDate) : getEndOfMonth(currentDate);

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

  const getStartOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  };

  const getEndOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  };

  const getDaysInView = () => {
    const days = [];
    const start = view === 'week' ? getStartOfWeek(currentDate) : getStartOfMonth(currentDate);
    const end = view === 'week' ? getEndOfWeek(currentDate) : getEndOfMonth(currentDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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

  return (
    <div className="google-calendar bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex items-center space-x-2">
          <button onClick={() => setView(view === 'week' ? 'month' : 'week')} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 transition-colors">
            {view === 'week' ? 'Month View' : 'Week View'}
          </button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - (view === 'week' ? 7 : 30))))} className="p-1 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-500 transition-colors">
            Today
          </button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + (view === 'week' ? 7 : 30))))} className="p-1 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      <div className={`grid ${view === 'week' ? 'grid-cols-7' : 'grid-cols-7'} gap-2 text-sm`}>
        {getDaysInView().map((date, index) => (
          <div key={index} className={`${view === 'week' ? 'h-64' : 'h-32'} bg-gray-700 rounded p-2 overflow-y-auto`}>
            <div className={`font-medium ${date.toDateString() === new Date().toDateString() ? 'text-blue-400' : 'text-gray-300'} mb-1`}>
              {date.toLocaleDateString('default', { weekday: 'short', day: 'numeric' })}
            </div>
            <div className="space-y-1">
              {getEventsByDay(date).map(event => (
                <div 
                  key={event.id} 
                  className="text-xs p-1 rounded-sm bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                  title={event.summary}
                >
                  <div className="font-semibold truncate">{event.summary}</div>
                  <div className="flex items-center text-gray-200">
                    <Clock size={12} className="mr-1" />
                    {formatEventTime(event)}
                  </div>
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