import React from 'react';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, 
  LineChart, 
  Shield, 
  Timer, 
  Calendar, 
  History,
  Bell,
  Settings,
  LogOut
} from 'lucide-react';

const Sidebar = ({ handleLogout }) => {
  const [userEmail, setUserEmail] = React.useState('');
  
  React.useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  return (
    <div className="h-screen w-64 bg-[#0C0C0C] text-gray-300 flex flex-col border-r border-gray-800 fixed left-0 top-0">
      {/* Logo Section */}
      <div className="p-4 flex items-center space-x-2">
        <div className="text-xl font-semibold text-white">○ Wisp</div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg bg-gray-800/50 text-white">
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <LineChart size={20} />
              <span>Analytics</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <Shield size={20} />
              <span>Blocking</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <Timer size={20} />
              <span>Focus Timer</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <Calendar size={20} />
              <span>Calendar</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <History size={20} />
              <span>History</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <Bell size={20} />
              <span>Notifications</span>
              <span className="ml-auto bg-gray-700 text-xs px-2 py-0.5 rounded-full">3</span>
            </button>
          </li>
          <li>
            <button className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-gray-800/30 transition-colors">
              <Settings size={20} />
              <span>Settings</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* User Profile & Logout Section */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            {userEmail?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 truncate">
            <div className="text-sm truncate">{userEmail}</div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;