
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SimpleSidebar } from '@/components/SimpleSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { LogOut, User, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  pageTitle?: string;
}

export function DashboardLayout({ children, showSearch = true, pageTitle = "Dashboard" }: DashboardLayoutProps) {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

  // Development debugging - verify single header instance
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 DashboardLayout: Rendering hierarchy check');
      
      // Check for duplicate headers after render
      setTimeout(() => {
        const headers = document.querySelectorAll('[data-testid="main-header"]');
        const searchBars = document.querySelectorAll('[data-testid="search-bar"]');
        
        console.log('📊 Layout verification:', {
          headerCount: headers.length,
          searchBarCount: searchBars.length,
          pageTitle,
          timestamp: new Date().toISOString()
        });

        if (headers.length > 1) {
          console.error('❌ DUPLICATE HEADER DETECTED:', headers.length);
          headers.forEach((header, index) => {
            if (index > 0) {
              (header as HTMLElement).style.outline = '3px solid red';
              (header as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            }
          });
        }

        if (searchBars.length > 1) {
          console.error('❌ DUPLICATE SEARCH BAR DETECTED:', searchBars.length);
          searchBars.forEach((search, index) => {
            if (index > 0) {
              (search as HTMLElement).style.outline = '2px solid orange';
            }
          });
        }
      }, 100);
    }
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

  return (
    <div className="dashboard-layout min-h-screen flex w-full bg-gradient-to-br from-orange-50/50 via-white to-red-50/50" style={{contain: 'layout style paint'}}>
      {/* Sidebar - Fixed positioning with proper containment */}
      <div className="fixed left-0 top-0 h-full w-64 z-30">
        <SimpleSidebar />
      </div>
      
      {/* Main content - Properly offset and contained */}
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* SINGLE SOURCE OF TRUTH: Main Header */}
        <header 
          data-testid="main-header"
          className="sticky top-0 backdrop-blur-md bg-white/90 shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-6 z-20 shrink-0"
        >
          <div className="flex items-center space-x-4">
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
          
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* SINGLE SOURCE OF TRUTH: Search Bar */}
            {showSearch && (
              <div className="relative hidden sm:block" data-testid="search-bar">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search appraisals..." 
                  className="pl-10 w-64 md:w-80 backdrop-blur-sm bg-white/70 border-white/40"
                />
              </div>
            )}
            
            {/* Notification Bell */}
            <NotificationBell onClick={handleNotificationClick} />
            
            {/* SINGLE SOURCE OF TRUTH: User Profile */}
            <div className="flex items-center space-x-3 border-l pl-3 md:pl-4 border-gray-200" data-testid="user-profile">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <div className="text-sm hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-700">
                      {profile.first_name} {profile.last_name}
                    </span>
                    <Badge className={`${getRoleBadgeColor(profile.role)}`}>
                      {profile.role.toUpperCase()}
                    </Badge>
                  </div>
                  {profile.department && (
                    <div className="text-xs text-gray-500 mt-1">
                      Department: {profile.department.name}
                    </div>
                  )}
                  {profile.position && (
                    <div className="text-xs text-gray-500">
                      Position: {profile.position}
                    </div>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-gray-100">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* ISOLATED CONTENT AREA - No duplicate headers allowed */}
        <main className="content-area flex-1 p-4 md:p-6 overflow-auto relative z-10" style={{gridArea: 'main'}}>
          <div className="max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
