
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
import { NotificationBell } from "@/components/NotificationBell"

interface AppSidebarProps {
  isCollapsed: boolean;
}

export function AppSidebar({ isCollapsed }: AppSidebarProps) {
  const { profile } = useAuthContext()
  const location = useLocation()

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
            <ClipboardList className="size-4" />
          </div>
          {!isCollapsed && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-gray-900">Appraisal System</span>
              <span className="truncate text-xs text-gray-600">Performance Management</span>
            </div>
          )}
        </Link>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          <div className={`text-xs font-medium text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'mb-2'}`}>
            {!isCollapsed && 'Navigation'}
          </div>
          {getNavigationItems().map((item) => (
            <Link
              key={item.title}
              to={item.url}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                isCurrentPath(item.url)
                  ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 shadow-sm'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-orange-700'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.title : undefined}
            >
              <item.icon className={`h-4 w-4 ${isCurrentPath(item.url) ? 'text-orange-600' : ''} flex-shrink-0`} />
              {!isCollapsed && <span className="font-medium">{item.title}</span>}
            </Link>
          ))}
          
          {/* Notifications */}
          <Link
            to="/notifications"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              isCurrentPath('/notifications')
                ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 hover:text-orange-700'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? 'Notifications' : undefined}
          >
            <Bell className={`h-4 w-4 ${isCurrentPath('/notifications') ? 'text-orange-600' : ''} flex-shrink-0`} />
            {!isCollapsed && (
              <>
                <span className="font-medium">Notifications</span>
                <NotificationBell />
              </>
            )}
          </Link>
        </div>
      </div>
      
      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
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
        </div>
      )}
    </div>
  )
}
