
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  Calendar, 
  Settings, 
  HelpCircle, 
  Users, 
  FileText, 
  DollarSign, 
  UserPlus,
  Building2,
  CreditCard,
  Database,
  ClipboardList,
  Target,
  TrendingUp,
  Bell,
  Award,
  UserCheck
} from "lucide-react";

export function AppSidebar() {
  const { state } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 font-medium border-r-2 border-orange-500" 
      : "hover:bg-gradient-to-r hover:from-orange-50 hover:to-red-50 text-gray-700 hover:text-orange-600";

  return (
    <Sidebar collapsible="icon" className="backdrop-blur-md bg-white/60 border-white/30">
      <div className="p-4 border-b bg-gradient-to-r from-white/80 to-white/60 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden shadow-lg">
            <img 
              src="/lovable-uploads/382d6c71-33c6-4592-bd0f-0fb453a48ecf.png" 
              alt="Zeenab Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <span className="font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Zeenab Appraisal
            </span>
          )}
        </div>
      </div>

      <SidebarContent className="bg-gradient-to-b from-white/60 to-white/40 backdrop-blur-md">
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
            MAIN MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
                { title: "My Appraisals", url: "/dashboard/appraisals", icon: ClipboardList },
                { title: "Notifications", url: "/dashboard/notifications", icon: Bell },
                { title: "Performance History", url: "/dashboard/history", icon: TrendingUp },
                { title: "Settings", url: "/dashboard/settings", icon: Settings }
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center px-4 py-2 text-sm rounded-lg mx-2 transition-all ${getNavClass(item.url)}`}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manager Tools - Only for Manager, HR, Admin */}
        {(profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              MANAGER TOOLS
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Team Overview", url: "/dashboard/team", icon: Users, roles: ["manager", "hr", "admin"] },
                  { title: "Review Appraisals", url: "/dashboard/reviews", icon: Award, roles: ["manager", "hr", "admin"] },
                  { title: "Team Analytics", url: "/dashboard/analytics", icon: BarChart3, roles: ["manager", "hr", "admin"] }
                ].filter(item => item.roles.includes(profile?.role || 'staff')).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center px-4 py-2 text-sm rounded-lg mx-2 transition-all ${getNavClass(item.url)}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* HR Administration - Only for HR and Admin */}
        {(profile?.role === 'hr' || profile?.role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              HR ADMINISTRATION
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Employee Management", url: "/dashboard/employees", icon: Users, roles: ["hr", "admin"] },
                  { title: "Department Management", url: "/dashboard/departments", icon: Building2, roles: ["hr", "admin"] },
                  { title: "Employee Questions", url: "/dashboard/employee-questions", icon: UserCheck, roles: ["hr", "admin"] },
                  { title: "Appraisal Questions", url: "/dashboard/templates", icon: FileText, roles: ["hr", "admin"] },
                  { title: "Appraisal Cycles", url: "/dashboard/cycles", icon: Target, roles: ["hr", "admin"] },
                  { title: "Company Reports", url: "/dashboard/reports", icon: BarChart3, roles: ["hr", "admin"] }
                ].filter(item => item.roles.includes(profile?.role || 'staff')).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center px-4 py-2 text-sm rounded-lg mx-2 transition-all ${getNavClass(item.url)}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Executive Dashboard - Only for Admin */}
        {profile?.role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              EXECUTIVE
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Executive Overview", url: "/dashboard/executive", icon: TrendingUp },
                  { title: "System Config", url: "/dashboard/config", icon: Settings }
                ].map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center px-4 py-2 text-sm rounded-lg mx-2 transition-all ${getNavClass(item.url)}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
