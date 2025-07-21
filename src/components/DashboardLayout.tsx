
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings, 
  Menu, 
  X, 
  Bell, 
  LogOut, 
  User,
  CheckCircle,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationsPopover } from './NotificationsPopover';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  showSearch?: boolean;
}

export function DashboardLayout({ 
  children, 
  pageTitle,
  showSearch = true 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { notifications } = useNotifications();

  console.log('🎯 DashboardLayout: Rendering SINGLE CONSOLIDATED header with title:', pageTitle);

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    ];

    if (profile?.role === 'hr' || profile?.role === 'admin') {
      return [
        ...baseItems,
        { to: '/employees', icon: Users, label: 'Employees' },
        { to: '/appraisal-cycles', icon: Calendar, label: 'Appraisal Cycles' },
        { to: '/questions', icon: FileText, label: 'Questions' },
        { to: '/committee', icon: ClipboardList, label: 'Committee Review' },
        { to: '/hr-appraisals', icon: CheckCircle, label: 'Final Approvals' },
        { to: '/settings', icon: Settings, label: 'Settings' },
      ];
    }

    // Default navigation for other roles
    return [
      ...baseItems,
      { to: '/my-appraisals', icon: FileText, label: 'My Appraisals' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ZA</span>
                  </div>
                  <span className="font-semibold text-gray-900">Zeenab Appraisal</span>
                </div>
                
                <div className="hidden lg:block h-6 w-px bg-gray-300" />
                
                <h1 className="hidden lg:block text-xl font-semibold text-gray-900">
                  {pageTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationsPopover />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium">
                      {profile?.first_name} {profile?.last_name}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-0">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
