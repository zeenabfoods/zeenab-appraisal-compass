import { useState } from 'react';
import { ClockInOutCard } from '@/components/attendance/ClockInOutCard';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { RecentActivity } from '@/components/attendance/RecentActivity';
import { MapPin, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AttendanceDashboard() {
  const [isClocked, setIsClocked] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-orange-100/50 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Smart Attendance
              </h1>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">Precision timekeeping • Accountability made simple</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-full border border-green-200/50 dark:border-green-800/50 shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-400 tracking-wide">LIVE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Clock In/Out */}
          <div className="lg:col-span-2 space-y-8">
            <ClockInOutCard isClocked={isClocked} onToggle={setIsClocked} />
            
            {/* Quick Stats */}
            <AttendanceStats />
            
            {/* Recent Activity */}
            <RecentActivity />
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Location Status */}
            <Card className="p-7 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/60 dark:border-orange-800/60 shadow-lg shadow-orange-100/50 dark:shadow-none">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-gray-100">Location Status</h3>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    You are currently outside office geofence
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Nearest Branch</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Head Office</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">Distance</span>
                      <span className="font-bold text-orange-600 dark:text-orange-500">2.3 km away</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Today's Summary */}
            <Card className="p-7 shadow-md hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Today's Summary</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Monday, Nov 26, 2025</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-muted-foreground font-medium">Clock In</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Not yet</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-muted-foreground font-medium">Hours Today</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">0h 0m</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground font-medium">Break Time</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">0m</span>
                </div>
              </div>
            </Card>

            {/* Performance Indicator */}
            <Card className="p-7 bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/60 dark:border-green-800/60 shadow-lg shadow-green-100/50 dark:shadow-none">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-gray-100">Attendance Score</h3>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-4xl font-bold tracking-tight text-green-600 dark:text-green-400">98%</span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">+2%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 font-medium">
                    Excellent! Keep it up 🎉
                  </p>
                </div>
              </div>
            </Card>

            {/* Reminder */}
            <Card className="p-7 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/60 dark:border-amber-800/60 shadow-lg shadow-amber-100/50 dark:shadow-none">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
                  <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-2 text-amber-900 dark:text-amber-100">Reminder</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                    Clock in within <span className="font-bold">30 minutes</span> to avoid late charges <span className="font-bold">(₦500)</span>
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
