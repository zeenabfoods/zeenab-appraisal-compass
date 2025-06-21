
import { useAuthContext } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { LogOut, User, Search, Mail, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { profile, signOut } = useAuthContext();
  const navigate = useNavigate();

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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-orange-50/50 via-white to-red-50/50">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="backdrop-blur-md bg-white/60 shadow-lg border-b border-white/30 h-16 flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden shadow-md">
                  <img 
                    src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
                    alt="Zeenab Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  Appraisal Dashboard
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search appraisals..." 
                  className="pl-10 w-80 backdrop-blur-sm bg-white/70 border-white/40"
                />
              </div>
              
              {/* Notification Bell with enhanced effects */}
              <NotificationBell onClick={handleNotificationClick} />
              
              {/* User profile */}
              <div className="flex items-center space-x-3 border-l pl-4 border-white/30">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-400" />
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">
                      {profile.first_name} {profile.last_name}
                    </span>
                    <Badge className={`ml-2 ${getRoleBadgeColor(profile.role)}`}>
                      {profile.role.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={signOut} className="hover:bg-white/50">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
