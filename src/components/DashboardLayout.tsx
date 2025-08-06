
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResponsiveSidebar } from '@/components/ResponsiveSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { BottomNavigation } from '@/components/BottomNavigation';
import { LogOut, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  pageTitle?: string;
}

export function DashboardLayout({ children, showSearch = true, pageTitle = "Dashboard" }: DashboardLayoutProps) {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // CRITICAL: Layout enforcement - throw error if duplicate headers exist
  useEffect(() => {
    const checkForDuplicates = () => {
      const headers = document.querySelectorAll('[data-testid="app-header"]');
      const allHeaders = document.querySelectorAll('header');
      
      console.log('🔍 HEADER AUDIT:', {
        'App Headers': headers.length,
        'All Headers': allHeaders.length,
        'Expected': 1,
        'PageTitle': pageTitle
      });

      if (headers.length > 1 || allHeaders.length > 1) {
        console.error('🚨 DUPLICATE HEADER DETECTED - THROWING ERROR');
        // Add visual debug indicators
        allHeaders.forEach((h, i) => {
          if (i > 0) {
            (h as HTMLElement).style.outline = '3px solid red';
            (h as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          }
        });
        throw new Error(`Duplicate header rendered: ${allHeaders.length} headers found, expected 1`);
      }

      console.log('✅ Header check passed - single header confirmed');
    };

    // Check immediately and after DOM updates
    checkForDuplicates();
    const timer = setTimeout(checkForDuplicates, 100);
    return () => clearTimeout(timer);
  }, [pageTitle]);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-red-50">
        <div className="text-center backdrop-blur-md bg-white/30 p-8 rounded-3xl border border-white/30 shadow-2xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300';
      case 'hr': return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300';
      case 'manager': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300';
    }
  };

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  console.log('🎯 DashboardLayout: Rendering SINGLE CONSOLIDATED header with title:', pageTitle);

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full bg-gradient-to-br from-orange-50/50 via-white to-red-50/50">
      {/* Responsive Sidebar */}
      <ResponsiveSidebar />
      
      {/* Main Content Area - Responsive layout */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 pb-20 md:pb-0">
        {/* 🎯 SINGLE CONSOLIDATED HEADER - Responsive design */}
        <header 
          data-testid="app-header"
          className="sticky top-0 backdrop-blur-md bg-white/90 shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 z-20 shrink-0"
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {/* Mobile menu trigger - only show on mobile */}
              {isMobile && <ResponsiveSidebar />}
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md">
                  <img 
                    src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
                    alt="Zeenab Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-lg md:text-xl font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  {pageTitle}
                </h1>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* INTEGRATED SEARCH BAR - Desktop only */}
            {showSearch && (
              <div className="relative hidden md:block" data-testid="integrated-search">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search appraisals..." 
                  className="pl-10 w-48 lg:w-64 xl:w-80 backdrop-blur-sm bg-white/70 border-white/40"
                />
              </div>
            )}
            
            {/* Desktop-only items */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Notification Bell */}
              <NotificationBell onClick={handleNotificationClick} />
              
              {/* USER PROFILE */}
              <div className="flex items-center space-x-3 border-l pl-4 border-gray-200" data-testid="user-profile">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-700 truncate max-w-24 lg:max-w-none">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <Badge className={`${getRoleBadgeColor(profile.role)} text-xs`}>
                        {profile.role.toUpperCase()}
                      </Badge>
                    </div>
                    {profile.department && (
                      <div className="text-xs text-gray-500 mt-1 truncate">
                        Dept: {profile.department.name}
                      </div>
                    )}
                    {profile.position && (
                      <div className="text-xs text-gray-500 truncate">
                        Role: {profile.position}
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-gray-100">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* 🎯 CLEAN MAIN CONTENT - Responsive padding */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto">
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation - Always render on mobile */}
      <BottomNavigation />
    </div>
  )
}
