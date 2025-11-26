import { useState } from 'react';
import { ClockInOutCard } from '@/components/attendance/ClockInOutCard';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { RecentActivity } from '@/components/attendance/RecentActivity';
import { MapPin, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AttendanceDashboard() {
  const [isClocked, setIsClocked] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-orange-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Smart Attendance
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Track time, boost accountability</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-full border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Online</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Clock In/Out */}
          <div className="lg:col-span-2 space-y-6">
            <ClockInOutCard isClocked={isClocked} onToggle={setIsClocked} />
            
            {/* Quick Stats */}
            <AttendanceStats />
            
            {/* Recent Activity */}
            <RecentActivity />
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Location Status */}
            <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Location Status</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    You are currently outside office geofence
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Nearest Branch:</span>
                      <span className="font-medium">Head Office</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium text-orange-600">2.3 km away</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Today's Summary */}
            <Card className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Today's Summary</h3>
                  <p className="text-xs text-muted-foreground">Monday, Nov 26, 2025</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Clock In</span>
                  <span className="text-sm font-medium">Not yet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Hours Today</span>
                  <span className="text-sm font-medium">0h 0m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Break Time</span>
                  <span className="text-sm font-medium">0m</span>
                </div>
              </div>
            </Card>

            {/* Performance Indicator */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">Attendance Score</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">98%</span>
                    <span className="text-xs text-green-600 dark:text-green-400">+2% this month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Excellent! Keep it up 🎉
                  </p>
                </div>
              </div>
            </Card>

            {/* Reminder */}
            <Card className="p-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm mb-1 text-amber-900 dark:text-amber-100">Reminder</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Clock in within 30 minutes to avoid late charges (₦500)
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
