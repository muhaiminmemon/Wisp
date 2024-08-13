import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Clock } from 'lucide-react';

const ScreenTime = () => {
  const [activeWindows, setActiveWindows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScreenTimeData();
    const interval = setInterval(fetchScreenTimeData, 300000); // Fetch every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const fetchScreenTimeData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('screen_time')
        .select('*')
        .eq('user_id', user.id)
        .order('duration', { ascending: false })
        .limit(5);

      if (error) throw error;

      setActiveWindows(data || []);
    } catch (error) {
      console.error('Error fetching screen time data:', error);
      setError('Failed to fetch screen time data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div className="text-center p-4 text-gray-400">Loading screen time data...</div>;
  if (error) return <div className="text-center p-4 text-red-400">{error}</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Clock className="mr-2" size={20} />
        Screen Time
      </h2>
      {activeWindows.length === 0 ? (
        <div className="text-center text-gray-400">No screen time data available.</div>
      ) : (
        <div className="space-y-3">
          {activeWindows.map((window, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-700 rounded p-3">
              <div className="flex items-center">
                <img src={`https://www.google.com/s2/favicons?domain=${window.url}`} alt="" className="mr-2 w-4 h-4" />
                <span className="truncate">{window.title}</span>
              </div>
              <span className="text-sm text-gray-400">{formatDuration(window.duration)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScreenTime;