
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

export function SimpleSidebar() {
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

  const navigationItems = getNavigationItems()

  if (!profile) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg border-r border-gray-200 z-40 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
            <ClipboardList className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-gray-900">Appraisal System</span>
            <span className="truncate text-xs text-gray-600">Performance Management</span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="p-2 flex-1">
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = isCurrentPath(item.url)
            return (
              <Link
                key={item.title}
                to={item.url}
                className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors group ${
                  isActive
                    ? 'bg-orange-100 text-orange-800 font-medium'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="ml-3 truncate">{item.title}</span>
              </Link>
            )
          })}
          
          <Link
            to="/notifications"
            className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors group ${
              isCurrentPath('/notifications')
                ? 'bg-orange-100 text-orange-800 font-medium'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Bell className="h-5 w-5 flex-shrink-0" />
            <span className="ml-3 truncate">Notifications</span>
          </Link>
        </nav>
      </div>
      
      {/* Footer with user info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold shadow-md text-xs">
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
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            {profile.department && (
              <div>Dept: {profile.department.name}</div>
            )}
            {profile.position && (
              <div>Role: {profile.position}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
