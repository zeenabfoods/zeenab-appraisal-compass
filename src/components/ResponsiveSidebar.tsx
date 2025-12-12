
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
  Menu,
  BookOpen,
  CheckSquare,
  Clock,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { useAuthContext } from "@/components/AuthProvider"
import { Link, useLocation } from "react-router-dom"
import { useState, useEffect, createContext, useContext } from "react"
import { useEnhancedProfile } from "@/hooks/useEnhancedProfile"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Context to share collapsed state
const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function ResponsiveSidebar() {
  const { profile: baseProfile } = useAuthContext()
  const { enhancedProfile, loading } = useEnhancedProfile()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [isOpen, setIsOpen] = useState(false)
  const { isCollapsed, setIsCollapsed } = useSidebarState()
  
  // Use enhanced profile if available, fallback to base profile
  const profile = enhancedProfile || baseProfile

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false)
    }
  }, [location.pathname, isMobile])

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
      {
        title: "Smart Attendance",
        url: "/attendance",
        icon: Clock,
      },
      {
        title: "Training Center",
        url: "/training",
        icon: BookOpen,
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
        title: "Training Management",
        url: "/training-management",
        icon: BookOpen,
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
        title: "HR Appraisals",
        url: "/hr-appraisals",
        icon: CheckSquare,
      },
      {
        title: "Company Reports",
        url: "/company-reports",
        icon: BarChart3,
      },
      {
        title: "Recruitment",
        url: "/recruitment",
        icon: UserPlus,
      },
    ]

    // Recruiter role - only show Recruitment
    if (profile?.role === 'recruiter') {
      return [
        {
          title: "Recruitment",
          url: "/recruitment",
          icon: UserPlus,
        },
      ]
    }

    let items = [...baseItems]

    if (profile?.role === 'manager') {
      items = [...items, ...managerItems]
    }

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

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-2'}`}>
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md flex-shrink-0">
            <ClipboardList className="size-4" />
          </div>
          {!collapsed && (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-gray-900">Appraisal System</span>
              <span className="truncate text-xs text-gray-600">Performance Management</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = isCurrentPath(item.url)
              const linkContent = (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center ${collapsed ? 'justify-center px-2' : 'px-3'} py-3 text-sm rounded-md transition-colors group ${
                    isActive
                      ? 'bg-orange-100 text-orange-800 font-medium'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="ml-3 truncate">{item.title}</span>}
                </Link>
              )
              
              if (collapsed) {
                return (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-900 text-white">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                )
              }
              
              return linkContent
            })}
            
            {profile?.role !== 'recruiter' && (
              collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/notifications"
                      className={`flex items-center justify-center px-2 py-3 text-sm rounded-md transition-colors group ${
                        isCurrentPath('/notifications')
                          ? 'bg-orange-100 text-orange-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      onClick={() => isMobile && setIsOpen(false)}
                    >
                      <Bell className="h-5 w-5 flex-shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-900 text-white">
                    Notifications
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/notifications"
                  className={`flex items-center px-3 py-3 text-sm rounded-md transition-colors group ${
                    isCurrentPath('/notifications')
                      ? 'bg-orange-100 text-orange-800 font-medium'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => isMobile && setIsOpen(false)}
                >
                  <Bell className="h-5 w-5 flex-shrink-0" />
                  <span className="ml-3 truncate">Notifications</span>
                </Link>
              )
            )}
          </nav>
        </TooltipProvider>
      </div>
      
      {/* Footer with user info */}
      <div className={`p-4 border-t border-gray-200 bg-white ${collapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold shadow-md text-xs flex-shrink-0">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {profile?.first_name} {profile?.last_name}
              </div>
              <div className="text-xs text-gray-600 truncate">{profile?.email}</div>
            </div>
          )}
        </div>
        
        {/* Department and Line Manager info */}
        {!collapsed && (profile.department || profile.line_manager_id) && (
          <div className="text-xs text-gray-500 space-y-1 mt-2">
            {profile.department && (
              <div>Dept: {profile.department.name}</div>
            )}
            {profile.line_manager_id && (
              <div>Line Manager: {loading ? 'Loading...' : (enhancedProfile?.line_manager_name || 'Not assigned')}</div>
            )}
          </div>
        )}
      </div>

      {/* Collapse toggle button - Desktop only */}
      {!isMobile && (
        <div className="p-2 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center hover:bg-gray-100"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )

  // Mobile sidebar (drawer)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar
  return (
    <div 
      className={`hidden md:block fixed top-0 left-0 h-screen bg-white shadow-lg border-r border-gray-200 z-30 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <SidebarContent collapsed={isCollapsed} />
    </div>
  )
}
