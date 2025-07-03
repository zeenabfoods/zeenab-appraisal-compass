
import {
  Calendar,
  Home,
  Users,
  Building2,
  ClipboardList,
  FileText,
  BarChart3,
  Bell,
  UserCheck,
  Scale,
  Settings2,
} from "lucide-react"

import { useAuthContext } from "@/components/AuthProvider"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useEffect } from "react"

interface AppSidebarProps {
  onNavigate?: () => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { profile } = useAuthContext()
  const location = useLocation()
  const navigate = useNavigate()

  console.log('AppSidebar: Rendering with profile:', profile)

  // Diagnostic logging for debugging
  useEffect(() => {
    console.log('Menu state diagnostic:', {
      localStorage: localStorage.getItem('sidebarState'),
      currentPath: location.pathname,
      routerHistory: window.history.state
    });
  }, [location.pathname]);

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const baseItems = [
      {
        title: "Dashboard",
        url: "/",
        icon: Home,
      },
      {
        title: "My Appraisals",
        url: "/my-appraisals",
        icon: ClipboardList,
      },
    ]

    const managerItems = [
      {
        title: "Team Appraisals",
        url: "/manager-appraisals",
        icon: UserCheck,
      },
    ]

    const hrAdminItems = [
      {
        title: "Employee Management",
        url: "/employee-management",
        icon: Users,
      },
      {
        title: "Department Management",
        url: "/department-management",
        icon: Building2,
      },
      {
        title: "Question Templates",
        url: "/question-templates",
        icon: FileText,
      },
      {
        title: "Employee Questions",
        url: "/employee-questions",
        icon: Settings2,
      },
      {
        title: "Appraisal Cycles",
        url: "/appraisal-cycles",
        icon: Calendar,
      },
      {
        title: "Committee",
        url: "/committee",
        icon: Scale,
      },
      {
        title: "Company Reports",
        url: "/company-reports",
        icon: BarChart3,
      },
    ]

    let items = [...baseItems]

    // Add manager-specific items for managers
    if (profile?.role === 'manager') {
      items = [...items, ...managerItems]
    }

    // Add HR/Admin items for hr and admin users
    if (profile?.role === 'hr' || profile?.role === 'admin') {
      items = [...items, ...managerItems, ...hrAdminItems]
    }

    return items
  }

  const isCurrentPath = (path: string) => {
    return location.pathname === path
  }

  // Enhanced click handler with error boundary and event management
  const handleMenuClick = (e: React.MouseEvent<HTMLAnchorElement>, url: string) => {
    try {
      console.log('Menu item clicked:', { target: e.currentTarget, url });
      
      // Prevent event propagation to avoid interference
      e.stopPropagation();
      
      // Add visual feedback
      e.currentTarget.style.background = 'rgba(255, 165, 0, 0.1)';
      setTimeout(() => {
        if (e.currentTarget) {
          e.currentTarget.style.background = '';
        }
      }, 150);

      // Persist menu state during navigation
      localStorage.setItem('sidebarState', 'open');
      
      // Call onNavigate only for mobile
      if (onNavigate && window.innerWidth < 1024) {
        onNavigate();
      }
      
      console.log('Navigation successful to:', url);
      
    } catch (error) {
      console.error('Menu click error:', error);
      e.preventDefault();
      
      // Recovery mechanism - try alternative navigation
      try {
        navigate(url);
      } catch (fallbackError) {
        console.error('Fallback navigation failed:', fallbackError);
      }
    }
  };

  const navigationItems = getNavigationItems()

  console.log('AppSidebar: Navigation items:', navigationItems)

  return (
    <div 
      className="h-full w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col side-menu" 
      style={{ 
        minHeight: '100vh', 
        backgroundColor: 'white', 
        zIndex: 10,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '256px'
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center space-x-2 p-4 border-b border-gray-200">
        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
          <ClipboardList className="size-4" />
        </div>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold text-gray-900">Appraisal System</span>
          <span className="truncate text-xs text-gray-600">Performance Management</span>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          <h3 className="mb-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Navigation
          </h3>
          <nav className="space-y-1" role="menu">
            {navigationItems.map((item) => {
              const isActive = isCurrentPath(item.url)
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  onClick={(e) => handleMenuClick(e, item.url)}
                  className={`menu-item flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                    isActive
                      ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  role="menuitem"
                  aria-current={isActive ? 'page' : undefined}
                  tabIndex={0}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
            
            <Link
              to="/notifications"
              onClick={(e) => handleMenuClick(e, '/notifications')}
              className={`menu-item flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                isCurrentPath('/notifications')
                  ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              role="menuitem"
              aria-current={isCurrentPath('/notifications') ? 'page' : undefined}
              tabIndex={0}
            >
              <Bell className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">Notifications</span>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Footer with line manager info */}
      {profile && (
        <div className="p-4 border-t border-gray-200 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold shadow-md">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-gray-600 truncate">{profile?.email}</div>
            </div>
          </div>
          
          {/* Department and Position info */}
          {(profile.department || profile.position) && (
            <div className="text-xs text-gray-500 space-y-1">
              {profile.department && (
                <div>Dept: {profile.department.name}</div>
              )}
              {profile.position && (
                <div>Role: {profile.position}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
