
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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar"

export function AppSidebar() {
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
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="p-4 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
            <ClipboardList className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold text-gray-900">Appraisal System</span>
            <span className="truncate text-xs text-gray-600">Performance Management</span>
          </div>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getNavigationItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isCurrentPath(item.url)}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Notifications */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isCurrentPath('/notifications')}>
                  <Link to="/notifications">
                    <Bell />
                    <span>Notifications</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-gray-200">
        {profile && (
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
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
