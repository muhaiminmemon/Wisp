import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Clock, Maximize2, X, Search } from 'lucide-react';

// Custom Tooltip Component for Graph
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 p-2 rounded border border-gray-700">
        <p className="text-sm text-gray-300">{label}</p>
        <p className="text-sm font-semibold text-blue-400">
          {formatYAxisTick(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Utility functions for scale calculations
const calculateSmartIncrements = (maxValue) => {
  const maxMinutes = Math.ceil(maxValue);

  if (maxMinutes <= 60) {
    return {
      tickCount: Math.ceil(maxMinutes / 15) + 1,
      increment: 15,
      maxDomain: Math.ceil(maxMinutes / 15) * 15
    };
  } else if (maxMinutes <= 180) {
    return {
      tickCount: Math.ceil(maxMinutes / 30) + 1,
      increment: 30,
      maxDomain: Math.ceil(maxMinutes / 30) * 30
    };
  } else {
    const hourIncrement = Math.ceil(maxMinutes / 60);
    return {
      tickCount: hourIncrement + 1,
      increment: 60,
      maxDomain: hourIncrement * 60
    };
  }
};

const calculateRoundedScale = (maxValue) => {
  const maxMinutes = Math.ceil(maxValue);
  
  let roundedMax;
  if (maxMinutes <= 50) {
    roundedMax = Math.ceil(maxMinutes / 10) * 10;
  } else if (maxMinutes <= 100) {
    roundedMax = Math.ceil(maxMinutes / 25) * 25;
  } else if (maxMinutes <= 500) {
    roundedMax = Math.ceil(maxMinutes / 50) * 50;
  } else {
    roundedMax = Math.ceil(maxMinutes / 100) * 100;
  }

  return {
    maxDomain: roundedMax,
    tickCount: 5
  };
};

const formatYAxisTick = (value) => {
  if (value === 0) return '0m';
  if (value % 60 === 0) {
    return `${value / 60}h`;
  }
  return `${value}m`;
};

// Graph Component
const Graph = ({ data }) => {
  const maxUsage = Math.max(...data.map(item => item.usage));
  const smartScale = calculateSmartIncrements(maxUsage);
  const roundedScale = calculateRoundedScale(maxUsage);
  
  // Choose which scale to use
  const scale = roundedScale;

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 10, left: 10, bottom: 0 }}
        >
          <XAxis 
            dataKey="day" 
            axisLine={false} 
            tickLine={false} 
            stroke="#9CA3AF"
          />
          <YAxis 
            hide={false}
            axisLine={false}
            tickLine={false}
            tickFormatter={formatYAxisTick}
            stroke="#9CA3AF"
            domain={[0, scale.maxDomain]}
            ticks={Array.from(
              { length: scale.tickCount }, 
              (_, i) => i * (scale.maxDomain / (scale.tickCount - 1))
            )}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="usage" 
            fill="#3B82F6" 
            radius={[4, 4, 0, 0]} 
            maxBarSize={50}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const TopSitesList = ({ sites, handleBlockToggle }) => (
  <div className="space-y-1">
    <div className="grid grid-cols-12 text-sm text-gray-400 mb-2 px-2">
      <div className="col-span-5">Website</div>
      <div className="col-span-3 text-center">Time</div>
      <div className="col-span-2 text-center">Usage</div>
      <div className="col-span-2 text-right">Block</div>
    </div>
    {sites.map((site, index) => (
      <div key={index} className="grid grid-cols-12 items-center py-3 px-2 hover:bg-gray-700/30 rounded-lg transition-colors">
        <div className="col-span-5 flex items-center gap-2">
          <img 
            src={`https://www.google.com/s2/favicons?domain=${site.url}`} 
            alt="" 
            className="w-4 h-4"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
            }}
          />
          <span className="truncate">{site.url}</span>
        </div>
        <div className="col-span-3 text-center font-medium">{site.time}</div>
        <div className="col-span-2 text-center text-sm text-gray-400">{site.percentage}%</div>
        <div className="col-span-2 flex justify-end">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={site.block} 
              onChange={(e) => handleBlockToggle(site, e.target.checked)}
            />
            <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>
    ))}
  </div>
);

const AllSitesList = ({ sites, searchTerm, handleBlockToggle }) => {
  const filteredSites = sites.filter(site => 
    site.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
      <div className="grid grid-cols-12 text-sm text-gray-400 mb-2 px-2 sticky top-0 bg-gray-800 py-2">
        <div className="col-span-5">Website</div>
        <div className="col-span-3 text-center">Time</div>
        <div className="col-span-2 text-center">Usage</div>
        <div className="col-span-2 text-right">Block</div>
      </div>
      {filteredSites.map((site, index) => (
        <div key={index} className="grid grid-cols-12 items-center py-3 px-2 hover:bg-gray-700/30 rounded-lg transition-colors">
          <div className="col-span-5 flex items-center gap-2">
            <img 
              src={`https://www.google.com/s2/favicons?domain=${site.url}`} 
              alt="" 
              className="w-4 h-4"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Cline x1='12' y1='8' x2='12' y2='16'%3E%3C/line%3E%3Cline x1='8' y1='12' x2='16' y2='12'%3E%3C/line%3E%3C/svg%3E";
              }}
            />
            <span className="truncate">{site.url}</span>
          </div>
          <div className="col-span-3 text-center font-medium">{site.time}</div>
          <div className="col-span-2 text-center text-sm text-gray-400">{site.percentage}%</div>
          <div className="col-span-2 flex justify-end">
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={site.block} 
                onChange={(e) => handleBlockToggle(site, e.target.checked)}
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
};

const ScreenTime = () => {
  const [screenTimeData, setScreenTimeData] = useState({ chartData: [], topSites: [], allSites: [] });
  const [totalUsage, setTotalUsage] = useState('0h 0min');
  const [loading, setLoading] = useState(true);
  const [weeklyAverage, setWeeklyAverage] = useState('0h 0min');
  const [showAllSites, setShowAllSites] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  useEffect(() => {
    fetchScreenTimeData();
    fetchBlockedSites();
  }, []);

  useEffect(() => {
    if (!showAllSites) {
      setModalSearchTerm('');
    }
  }, [showAllSites]);

  const fetchBlockedSites = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: blockedSites, error } = await supabase
            .from('blocked_sites')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        setScreenTimeData(prevData => {
            const updatedSites = prevData.allSites.map(site => ({
                ...site,
                block: blockedSites.some(
                    blockedSite => 
                        blockedSite.url === site.url && 
                        blockedSite.is_blocked
                )
            }));

            return {
                ...prevData,
                allSites: updatedSites,
                topSites: updatedSites.slice(0, 4)
            };
        });
    } catch (error) {
        console.error('Error fetching blocked sites:', error);
    }
};

const handleBlockToggle = async (site, isBlocked) => {
  try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Send message to extension to update blocking
      window.postMessage({
          type: 'FROM_WEBAPP',
          payload: { 
              action: 'updateBlock', 
              url: site.url, 
              isBlocked: isBlocked 
          }
      }, '*');

      // Update backend
      const response = await fetch('http://localhost:4500/api/toggle-block', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json'
          },
          body: JSON.stringify({
              userId: user.id,
              url: site.url,
              isBlocked: isBlocked
          })
      });

      if (!response.ok) throw new Error('Failed to toggle block');

      // Update local state
      setScreenTimeData(prevData => {
          const updatedSites = prevData.allSites.map(s => 
              s.url === site.url ? { ...s, block: isBlocked } : s
          );
          
          return {
              ...prevData,
              allSites: updatedSites,
              topSites: updatedSites.slice(0, 4)
          };
      });

  } catch (error) {
      console.error('Error toggling site block:', error);
      alert('Failed to update site blocking status');
  }
};

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
      setWeeklyAverage(processedData.weeklyAverage);
    } catch (error) {
      console.error('Error fetching screen time data:', error);
      setScreenTimeData({ chartData: [], topSites: [], allSites: [] });
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
      
      const domain = new URL(item.url).hostname;
      if (!siteUsage[domain]) {
        siteUsage[domain] = { url: domain, duration: 0 };
      }
      siteUsage[domain].duration += item.duration;
      totalSeconds += item.duration;
    });

    const chartData = dailyData.map((value, index) => ({
      day: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][(new Date().getDay() + index + 1) % 7],
      usage: Math.round(value / 60), // Convert to minutes
    }));

    const allSites = Object.values(siteUsage)
    .sort((a, b) => b.duration - a.duration)
    .map(site => ({
        url: site.url, // This should be just the domain
        time: formatDuration(site.duration),
        block: false, // Default to false, will be updated by fetchBlockedSites
        percentage: ((site.duration / totalSeconds) * 100).toFixed(1)
    }));

    const topSites = allSites.slice(0, 4);
    const avgSecondsPerDay = totalSeconds / 7;

    return {
      chartData,
      topSites,
      allSites,
      totalUsage: formatDuration(totalSeconds),
      weeklyAverage: formatDuration(avgSecondsPerDay)
    };
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-white h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading screen time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Clock className="text-blue-400" size={24} />
            Usage
          </h2>
          <p className="text-3xl font-bold text-blue-400">{totalUsage}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Daily Average</p>
          <p className="text-lg font-semibold">{weeklyAverage}</p>
        </div>
      </div>

      {/* Graph Section */}
      <Graph data={screenTimeData.chartData} />

      {/* Top Sites Section */}
      <div className="bg-gray-900/50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Top Sites</h3>
          <button 
            onClick={() => setShowAllSites(true)} 
            className="text-blue-400 hover:text-blue-300 transition-colors p-1 rounded-lg hover:bg-gray-700/50"
          >
            <Maximize2 size={16} />
          </button>
        </div>
        
        <TopSitesList 
  sites={screenTimeData.topSites} 
  handleBlockToggle={handleBlockToggle}
/>
      </div>

      {/* All Sites Modal */}
      {showAllSites && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-4xl w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">All Visited Sites</h2>
              <button 
                onClick={() => setShowAllSites(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search websites..."
                value={modalSearchTerm}
                onChange={(e) => setModalSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            
            <AllSitesList 
  sites={screenTimeData.allSites}
  searchTerm={modalSearchTerm}
  handleBlockToggle={handleBlockToggle}
/>
          </div>
        </div>
      )}

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #374151;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4B5563;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes zoomIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        .animate-in {
          animation: fadeIn 0.2s ease-out, zoomIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ScreenTime;