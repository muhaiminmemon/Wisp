import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';

const ScreenTime = () => {
  const [screenTimeData, setScreenTimeData] = useState({ chartData: [], topSites: [] });
  const [totalUsage, setTotalUsage] = useState('0h 0min');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScreenTimeData();
  }, []);

  const fetchScreenTimeData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const today = new Date();
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('screen_time')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', weekAgo.toISOString())
        .order('duration', { ascending: false });

      if (error) throw error;

      const processedData = processData(data);
      setScreenTimeData(processedData);
      setTotalUsage(processedData.totalUsage);
    } catch (error) {
      console.error('Error fetching screen time data:', error);
      // Set default values in case of error
      setScreenTimeData({ chartData: [], topSites: [] });
      setTotalUsage('0h 0min');
    } finally {
      setLoading(false);
    }
  };

  const processData = (data) => {
    const dailyData = Array(7).fill(0);
    const siteUsage = {};
    let totalSeconds = 0;

    data.forEach(item => {
      const date = new Date(item.created_at);
      const dayIndex = 6 - Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < 7) {
        dailyData[dayIndex] += item.duration;
      }
      siteUsage[item.url] = (siteUsage[item.url] || 0) + item.duration;
      totalSeconds += item.duration;
    });

    const chartData = dailyData.map((value, index) => ({
      day: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][(new Date().getDay() + index + 1) % 7],
      usage: Math.round(value / 60), // Convert to minutes
    }));

    const topSites = Object.entries(siteUsage)
      .sort(([,a],[,b]) => b-a)
      .slice(0, 4)
      .map(([url, duration]) => ({
        url,
        time: formatDuration(duration),
        block: false, // You can implement blocking logic here
      }));

    return {
      chartData,
      topSites,
      totalUsage: formatDuration(totalSeconds),
    };
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  if (loading) return <div>Loading screen time data...</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-white">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Clock className="mr-2" size={20} />
        Usage
      </h2>
      <p className="text-2xl font-bold mb-4">{totalUsage}</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={screenTimeData.chartData}>
          <XAxis dataKey="day" axisLine={false} tickLine={false} />
          <YAxis hide={true} />
          <Bar dataKey="usage" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Website</span>
          <span>Time</span>
          <span>Block</span>
        </div>
        {screenTimeData.topSites.map((site, index) => (
          <div key={index} className="flex justify-between items-center py-2 border-t border-gray-700">
            <div className="flex items-center">
              <img src={`https://www.google.com/s2/favicons?domain=${site.url}`} alt="" className="mr-2 w-4 h-4" />
              <span>{new URL(site.url).hostname}</span>
            </div>
            <span>{site.time}</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={site.block} readOnly />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ScreenTime;