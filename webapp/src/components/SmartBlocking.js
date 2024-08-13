import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

const SmartBlocking = ({ currentTask }) => {
  const [blockedSites, setBlockedSites] = useState([]);
  const [allowedSites, setAllowedSites] = useState([]);

  useEffect(() => {
    if (currentTask) {
      checkSites(currentTask);
    }
  }, [currentTask]);

  const checkSites = async (task) => {
    // This function would call your backend API
    // The backend would then use the OpenAI API to determine which sites to block/allow
    try {
      const response = await fetch('/api/check-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ task }),
      });
      const data = await response.json();
      setBlockedSites(data.blockedSites);
      setAllowedSites(data.allowedSites);
    } catch (error) {
      console.error('Error checking sites:', error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Shield className="mr-2" size={20} />
        Smart Blocking
      </h2>
      <div className="bg-gray-700 rounded p-3 mb-3">
        <h3 className="font-medium">Current Task: {currentTask}</h3>
      </div>
      <div className="bg-gray-700 rounded p-3">
        <p className="text-sm text-gray-400">Blocked: {blockedSites.join(', ')}</p>
        <p className="text-sm text-gray-400">Allowed: {allowedSites.join(', ')}</p>
      </div>
    </div>
  );
};

export default SmartBlocking;