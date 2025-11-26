import { ClockInOutCard } from '@/components/attendance/ClockInOutCard';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { RecentActivity } from '@/components/attendance/RecentActivity';
import { BranchManagement } from '@/components/attendance/BranchManagement';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { HRAttendanceView } from '@/components/attendance/HRAttendanceView';
import { BreakManagement } from '@/components/attendance/BreakManagement';
import { MapPin, TrendingUp, Clock, AlertCircle, Building2, Users, Coffee } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthContext } from '@/components/AuthProvider';

export default function AttendanceDashboard() {
  const { profile } = useAuthContext();
  const isHRorAdmin = profile?.role === 'hr' || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-orange-100/50 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Smart Attendance
              </h1>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">
                Precision timekeeping • Accountability made simple
              </p>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {isHRorAdmin ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-4xl grid-cols-6">
              <TabsTrigger value="overview">
                <Clock className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="breaks">
                <Coffee className="w-4 h-4 mr-2" />
                Breaks
              </TabsTrigger>
              <TabsTrigger value="hr-admin">
                <Users className="w-4 h-4 mr-2" />
                HR Admin
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="w-4 h-4 mr-2" />
                My History
              </TabsTrigger>
              <TabsTrigger value="stats">
                <TrendingUp className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
              <TabsTrigger value="branches">
                <Building2 className="w-4 h-4 mr-2" />
                Branches
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <ClockInOutCard />
                  <RecentActivity />
                </div>

                <div className="space-y-6">
                  <Card className="p-7 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/60 dark:border-orange-800/60 shadow-lg shadow-orange-100/50 dark:shadow-none">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-gray-100">Location Status</h3>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                          GPS tracking active
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-green-600 dark:text-green-400 font-medium">Location services enabled</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-7 shadow-md hover:shadow-xl transition-shadow duration-300">
                    <div className="flex items-start gap-4 mb-6">
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Today's Summary</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-muted-foreground font-medium">Status</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-muted-foreground font-medium">Mode</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">In Office</span>
                      </div>
                    </div>
                  </Card>

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

                  <Card className="p-7 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/60 dark:border-amber-800/60 shadow-lg shadow-amber-100/50 dark:shadow-none">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
                        <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base mb-2 text-amber-900 dark:text-amber-100">Reminder</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                          Remember to clock out at the end of your shift
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="breaks">
              <BreakManagement />
            </TabsContent>

            <TabsContent value="hr-admin">
              <HRAttendanceView />
            </TabsContent>

            <TabsContent value="history">
              <AttendanceHistory />
            </TabsContent>

            <TabsContent value="stats">
              <AttendanceStats />
            </TabsContent>

            <TabsContent value="branches">
              <BranchManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="overview">
                <Clock className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="breaks">
                <Coffee className="w-4 h-4 mr-2" />
                Breaks
              </TabsTrigger>
              <TabsTrigger value="history">
                <Clock className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
              <TabsTrigger value="stats">
                <TrendingUp className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <ClockInOutCard />
                  <RecentActivity />
                </div>

            <div className="space-y-6">
              <Card className="p-7 bg-gradient-to-br from-orange-50/80 to-amber-50/80 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/60 dark:border-orange-800/60 shadow-lg shadow-orange-100/50 dark:shadow-none">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-2 text-gray-900 dark:text-gray-100">Location Status</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      GPS tracking active
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-600 dark:text-green-400 font-medium">Location services enabled</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-7 shadow-md hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start gap-4 mb-6">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">Today's Summary</h3>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-muted-foreground font-medium">Status</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Active</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-sm text-muted-foreground font-medium">Mode</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">In Office</span>
                  </div>
                </div>
              </Card>

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

              <Card className="p-7 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/60 dark:border-amber-800/60 shadow-lg shadow-amber-100/50 dark:shadow-none">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg shadow-amber-500/30">
                    <AlertCircle className="w-5 h-5 text-white flex-shrink-0" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base mb-2 text-amber-900 dark:text-amber-100">Reminder</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                      Remember to clock out at the end of your shift
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="breaks">
          <BreakManagement />
        </TabsContent>

        <TabsContent value="history">
          <AttendanceHistory />
        </TabsContent>

        <TabsContent value="stats">
          <AttendanceStats />
        </TabsContent>
      </Tabs>
        )}
      </main>
    </div>
  );
}
