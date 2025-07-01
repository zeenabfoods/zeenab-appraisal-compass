
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
import { Link, useLocation } from "react-router-dom"
import { useEffect } from "react"

export function AppSidebar() {
  const { profile } = useAuthContext()
  const location = useLocation()

  // Debug logging
  useEffect(() => {
    console.log('AppSidebar: Component rendered', {
      profile: profile ? 'loaded' : 'null',
      location: location.pathname,
      timestamp: new Date().toISOString()
    });

    // Check if sidebar is in DOM and visible
    const sidebarElement = document.querySelector('[data-sidebar="app-sidebar"]');
    if (sidebarElement) {
      const styles = window.getComputedStyle(sidebarElement);
      console.log('AppSidebar: DOM element found', {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        transform: styles.transform,
        width: styles.width,
        height: styles.height,
        zIndex: styles.zIndex,
        offsetParent: sidebarElement.offsetParent !== null,
        boundingRect: sidebarElement.getBoundingClientRect()
      });
    } else {
      console.log('AppSidebar: DOM element NOT found');
    }
  }, [profile, location]);

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

  const navigationItems = getNavigationItems()

  return (
    <div 
      className="h-full flex flex-col bg-white shadow-lg border-r border-gray-200"
      data-sidebar="app-sidebar"
      style={{ 
        // Force visibility for debugging
        display: 'flex !important',
        visibility: 'visible !important',
        opacity: '1 !important',
        zIndex: 1000,
        minWidth: '256px'
      }}
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
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = isCurrentPath(item.url)
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  onClick={() => console.log('Navigation clicked:', item.title)}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
            
            <Link
              to="/notifications"
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isCurrentPath('/notifications')
                  ? 'bg-orange-100 text-orange-900 border-r-2 border-orange-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={() => console.log('Notifications clicked')}
            >
              <Bell className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="truncate">Notifications</span>
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Footer */}
      {profile && (
        <div className="flex items-center space-x-3 p-4 border-t border-gray-200">
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
      )}
    </div>
  )
}
