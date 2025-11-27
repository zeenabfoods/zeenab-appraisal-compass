import { useState, useCallback } from 'react';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { ClockInOutCard } from '@/components/attendance/ClockInOutCard';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { RecentActivity } from '@/components/attendance/RecentActivity';
import { BranchManagement } from '@/components/attendance/BranchManagement';
import { AttendanceHistory } from '@/components/attendance/AttendanceHistory';
import { HRAttendanceView } from '@/components/attendance/HRAttendanceView';
import { BreakManagement } from '@/components/attendance/BreakManagement';
import { BreakScheduleConfig } from '@/components/attendance/BreakScheduleConfig';
import { BreakComplianceReport } from '@/components/attendance/BreakComplianceReport';
import { AttendanceAnalytics } from '@/components/attendance/AttendanceAnalytics';
import { GeofenceMonitor } from '@/components/attendance/GeofenceMonitor';
import { GeofenceAlertsList } from '@/components/attendance/GeofenceAlertsList';
import { EyeServiceDashboard } from '@/components/attendance/EyeServiceDashboard';
import { HRSecurityDashboard } from '@/components/attendance/HRSecurityDashboard';
import { SecurityMonitor } from '@/components/attendance/SecurityMonitor';
import { AttendanceRulesConfig } from '@/components/attendance/AttendanceRulesConfig';
import { ChargesManagement } from '@/components/attendance/ChargesManagement';
import { ManualOverrides } from '@/components/attendance/ManualOverrides';
import { EscalationRulesConfig } from '@/components/attendance/EscalationRulesConfig';
import { AutomaticChargeCalculation } from '@/components/attendance/AutomaticChargeCalculation';
import { OvertimePayrollReport } from '@/components/attendance/OvertimePayrollReport';
import { AttendanceBottomNav } from '@/components/attendance/AttendanceBottomNav';
import { PullToRefreshIndicator } from '@/components/attendance/PullToRefreshIndicator';
import { OfflineQueueIndicator } from '@/components/attendance/OfflineQueueIndicator';
import { AnimatedPageWrapper } from '@/components/attendance/AnimatedPageWrapper';
import { AlertSoundManager } from '@/components/attendance/AlertSoundManager';
import { MapPin, TrendingUp, Clock, AlertCircle, Building2, Users, Coffee, Settings, BarChart3, Eye, Shield, DollarSign, Edit3, ArrowUpCircle, Calculator, FileText, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuthContext } from '@/components/AuthProvider';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/attendance/usePullToRefresh';
import { toast } from 'sonner';

export default function AttendanceDashboard() {
  const { profile } = useAuthContext();
  const { enhancedProfile, loading: profileLoading } = useEnhancedProfile();
  const isHRorAdmin = profile?.role === 'hr' || profile?.role === 'admin';
  const [activeView, setActiveView] = useState('overview');

  const handleRefresh = useCallback(async () => {
    toast.success('Refreshing attendance data...');
    
    // Dispatch a custom event that child components can listen to
    window.dispatchEvent(new CustomEvent('attendance-refresh'));
    
    // Wait a bit to simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast.success('Attendance data refreshed!');
  }, []);

  const { isPulling, pullDistance, isRefreshing, threshold } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  const hrMenuItems = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'breaks', label: 'Breaks', icon: Coffee },
    { id: 'hr-admin', label: 'HR Admin', icon: Users },
    { id: 'history', label: 'My History', icon: Clock },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
    { id: 'branches', label: 'Branches', icon: Building2 },
    { id: 'rules', label: 'Rules & Policies', icon: Settings },
    { id: 'charges', label: 'Charges', icon: DollarSign },
    { id: 'escalation', label: 'Escalation Rules', icon: ArrowUpCircle },
    { id: 'auto-charges', label: 'Auto Charge Engine', icon: Calculator },
    { id: 'overtime-report', label: 'Overtime Payroll', icon: FileText },
    { id: 'overrides', label: 'Manual Overrides', icon: Edit3 },
    { id: 'break-config', label: 'Break Config', icon: Settings },
    { id: 'break-compliance', label: 'Compliance', icon: AlertCircle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'geofence', label: 'Geofence', icon: MapPin },
    { id: 'alert-sound', label: 'Alert Sounds', icon: Volume2 },
    { id: 'security', label: 'My Security', icon: Shield },
    { id: 'hr-security', label: 'Security Dashboard', icon: Shield },
    { id: 'eye-service', label: 'Eye Service', icon: Eye },
  ];

  const staffMenuItems = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'breaks', label: 'Breaks', icon: Coffee },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'stats', label: 'Statistics', icon: TrendingUp },
  ];

  const menuItems = isHRorAdmin ? hrMenuItems : staffMenuItems;

  const renderOverviewContent = () => (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <ClockInOutCard />
        <AttendanceStats />
        <RecentActivity />
      </div>

      <div className="space-y-6">
        {isHRorAdmin && <SecurityMonitor />}
        
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
  );

  const renderContent = () => {
    const content = (() => {
      switch (activeView) {
        case 'overview':
          return renderOverviewContent();
        case 'breaks':
          return <BreakManagement />;
        case 'hr-admin':
          return <HRAttendanceView />;
        case 'history':
          return <AttendanceHistory />;
        case 'stats':
          return <AttendanceStats />;
        case 'branches':
          return <BranchManagement />;
        case 'break-config':
          return <BreakScheduleConfig />;
        case 'break-compliance':
          return <BreakComplianceReport />;
        case 'analytics':
          return <AttendanceAnalytics />;
        case 'geofence':
          return <GeofenceAlertsList />;
        case 'security':
          return <SecurityMonitor />;
        case 'hr-security':
          return <HRSecurityDashboard />;
        case 'eye-service':
          return <EyeServiceDashboard />;
        case 'rules':
          return <AttendanceRulesConfig />;
        case 'charges':
          return <ChargesManagement />;
        case 'escalation':
          return <EscalationRulesConfig />;
        case 'auto-charges':
          return <AutomaticChargeCalculation />;
        case 'overtime-report':
          return <OvertimePayrollReport />;
        case 'overrides':
          return <ManualOverrides />;
        case 'alert-sound':
          return <AlertSoundManager />;
        default:
          return renderOverviewContent();
      }
    })();

    return (
      <AnimatedPageWrapper key={activeView}>
        {content}
      </AnimatedPageWrapper>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-gradient-to-br from-orange-50/30 via-white to-amber-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Pull to refresh indicator */}
        <PullToRefreshIndicator
          isPulling={isPulling}
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
          threshold={threshold}
        />
        
        {/* Background geofence monitoring */}
        <GeofenceMonitor />
        
        {/* Offline queue indicator */}
        <OfflineQueueIndicator />
        
        {/* Sidebar */}
        <Sidebar className="border-r border-orange-100 dark:border-gray-800">
          <SidebarContent>
            <div className="p-4 border-b border-orange-100 dark:border-gray-800">
              <h2 className="text-lg font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                Smart Attendance
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Precision timekeeping
              </p>
            </div>
            
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveView(item.id)}
                        className={cn(
                          "w-full justify-start",
                          activeView === item.id && "bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-semibold"
                        )}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-orange-100/50 dark:border-gray-800 sticky top-0 z-50 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex items-center justify-between flex-1">
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                    {menuItems.find(item => item.id === activeView)?.label || 'Smart Attendance'}
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  {!profileLoading && enhancedProfile && (
                    <div className="hidden md:flex flex-col items-end text-sm">
                      <p className="font-semibold text-foreground">
                        {enhancedProfile.first_name} {enhancedProfile.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enhancedProfile.position || 'Staff'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enhancedProfile.department_name || 'No Department'}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-full border border-green-200/50 dark:border-green-800/50 shadow-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400 tracking-wide">LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6" data-pull-to-refresh>
            {renderContent()}
          </main>

          {/* Mobile Bottom Navigation */}
          <AttendanceBottomNav 
            activeView={activeView}
            onViewChange={setActiveView}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}
