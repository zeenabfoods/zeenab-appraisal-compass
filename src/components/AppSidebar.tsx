
import {
  Calendar,
  ChevronUp,
  Home,
  LifeBuoy,
  Send,
  Settings2,
  User2,
  Users,
  Building2,
  ClipboardList,
  FileText,
  BarChart3,
  Bell,
  UserCheck,
  Scale,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthContext } from "@/components/AuthProvider"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { NotificationBell } from "@/components/NotificationBell"
import { useEffect } from "react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile, signOut } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const { setOpenMobile, isMobile } = useSidebar()

  const handleSignOut = async () => {
    await signOut()
    navigate("/auth")
  }

  // Auto-close mobile sidebar when navigating to a new route
  useEffect(() => {
    if (isMobile) {
      setOpenMobile(false)
    }
  }, [location.pathname, isMobile, setOpenMobile])

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
    <Sidebar 
      collapsible="icon" 
      className="border-r border-white/30 bg-white/80 backdrop-blur-md z-50"
      variant="sidebar"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md">
                  <ClipboardList className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-gray-900">Appraisal System</span>
                  <span className="truncate text-xs text-gray-600">Performance Management</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-700 font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getNavigationItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isCurrentPath(item.url)}
                    className="group"
                  >
                    <Link 
                      to={item.url}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                        isCurrentPath(item.url)
                          ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 shadow-sm'
                          : 'text-gray-700 hover:bg-white/50 hover:text-orange-700'
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isCurrentPath(item.url) ? 'text-orange-600' : ''}`} />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={isCurrentPath('/notifications')}
                  className="group"
                >
                  <Link 
                    to="/notifications"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isCurrentPath('/notifications')
                        ? 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800 border border-orange-200 shadow-sm'
                        : 'text-gray-700 hover:bg-white/50 hover:text-orange-700'
                    }`}
                  >
                    <div className="flex items-center">
                      <Bell className={`h-4 w-4 ${isCurrentPath('/notifications') ? 'text-orange-600' : ''}`} />
                    </div>
                    <span className="font-medium">Notifications</span>
                    <NotificationBell />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-white/50 data-[state=open]:text-orange-700 hover:bg-white/50"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold shadow-md">
                    {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold text-gray-900">
                      {profile?.first_name} {profile?.last_name}
                    </span>
                    <span className="truncate text-xs text-gray-600">{profile?.email}</span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-gray-600" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-white/95 backdrop-blur-md border border-white/40 shadow-xl"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-gray-700 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
