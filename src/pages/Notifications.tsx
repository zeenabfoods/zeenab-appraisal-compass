
import React from 'react';
import { NotificationCenter } from '@/components/NotificationCenter';

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-md bg-white/60 border-white/40 rounded-xl p-6 shadow-lg">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
          Notifications
        </h1>
        <p className="text-gray-600">Stay updated with your latest notifications and alerts.</p>
      </div>
      
      <NotificationCenter />
    </div>
  );
}
