
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
  SidebarTrigger,
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
  Database
} from "lucide-react";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: string[];
}

const navigationItems: NavItem[] = [
  // Main Menu Items
  { title: "Dashboard", url: "/dashboard", icon: BarChart3, roles: ["staff", "manager", "hr", "admin"] },
  { title: "Tasks", url: "/dashboard/tasks", icon: FileText, roles: ["staff", "manager", "hr", "admin"] },
  { title: "Calendar", url: "/dashboard/calendar", icon: Calendar, roles: ["staff", "manager", "hr", "admin"] },
  { title: "Settings", url: "/dashboard/settings", icon: Settings, roles: ["staff", "manager", "hr", "admin"] },
  { title: "Help & Center", url: "/dashboard/help", icon: HelpCircle, roles: ["staff", "manager", "hr", "admin"] },
  
  // Team Management (Manager, HR, Admin)
  { title: "Performance", url: "/dashboard/performance", icon: BarChart3, roles: ["manager", "hr", "admin"] },
  { title: "Payrolls", url: "/dashboard/payrolls", icon: DollarSign, roles: ["hr", "admin"] },
  { title: "Invoices", url: "/dashboard/invoices", icon: CreditCard, roles: ["hr", "admin"] },
  { title: "Employees", url: "/dashboard/employees", icon: Users, roles: ["hr", "admin"] },
  { title: "Hiring", url: "/dashboard/hiring", icon: UserPlus, roles: ["hr", "admin"] },
  
  // Additional Items (HR, Admin)
  { title: "Salary Information", url: "/dashboard/salary", icon: DollarSign, roles: ["hr", "admin"] },
  { title: "Compensation Breakdown", url: "/dashboard/compensation", icon: Building2, roles: ["hr", "admin"] },
  { title: "Project-specific Data", url: "/dashboard/projects", icon: Database, roles: ["admin"] }
];

export function AppSidebar() {
  const { collapsed } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavClass = (path: string) =>
    isActive(path) 
      ? "bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-700" 
      : "hover:bg-gray-50 text-gray-700";

  // Filter navigation items based on user role
  const filteredMainItems = navigationItems.filter(item => 
    item.roles.includes(profile?.role || 'staff') && 
    !item.url.includes('/dashboard/') || item.url === '/dashboard'
  );
  
  const filteredTeamItems = navigationItems.filter(item => 
    item.roles.includes(profile?.role || 'staff') && 
    item.url.includes('/dashboard/') && 
    item.url !== '/dashboard' &&
    ['performance', 'payrolls', 'invoices', 'employees', 'hiring'].some(path => item.url.includes(path))
  );
  
  const filteredListItems = navigationItems.filter(item => 
    item.roles.includes(profile?.role || 'staff') && 
    ['salary', 'compensation', 'projects'].some(path => item.url.includes(path))
  );

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible>
      <div className="p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          {!collapsed && <span className="font-semibold text-gray-900">Zeenab</span>}
        </div>
      </div>

      <SidebarContent className="bg-white">
        {/* Main Menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
            MAIN MENU
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {[
                { title: "Dashboard", url: "/dashboard", icon: BarChart3 },
                { title: "Tasks", url: "/dashboard/tasks", icon: FileText },
                { title: "Calendar", url: "/dashboard/calendar", icon: Calendar },
                { title: "Settings", url: "/dashboard/settings", icon: Settings },
                { title: "Help & Center", url: "/dashboard/help", icon: HelpCircle }
              ].map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={`flex items-center px-4 py-2 text-sm ${getNavClass(item.url)}`}
                    >
                      <item.icon className="mr-3 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Team Management - Only for Manager, HR, Admin */}
        {(profile?.role === 'manager' || profile?.role === 'hr' || profile?.role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              TEAM MANAGEMENT
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Performance", url: "/dashboard/performance", icon: BarChart3, roles: ["manager", "hr", "admin"] },
                  { title: "Payrolls", url: "/dashboard/payrolls", icon: DollarSign, roles: ["hr", "admin"] },
                  { title: "Invoices", url: "/dashboard/invoices", icon: CreditCard, roles: ["hr", "admin"] },
                  { title: "Employees", url: "/dashboard/employees", icon: Users, roles: ["hr", "admin"] },
                  { title: "Hiring", url: "/dashboard/hiring", icon: UserPlus, roles: ["hr", "admin"] }
                ].filter(item => item.roles.includes(profile?.role || 'staff')).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center px-4 py-2 text-sm ${getNavClass(item.url)}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* List Section - Only for HR and Admin */}
        {(profile?.role === 'hr' || profile?.role === 'admin') && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs text-gray-500 uppercase tracking-wider px-4 py-2">
              LIST
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {[
                  { title: "Salary Information", url: "/dashboard/salary", icon: DollarSign, roles: ["hr", "admin"] },
                  { title: "Compensation Breakdown", url: "/dashboard/compensation", icon: Building2, roles: ["hr", "admin"] },
                  { title: "Project-specific Data", url: "/dashboard/projects", icon: Database, roles: ["admin"] }
                ].filter(item => item.roles.includes(profile?.role || 'staff')).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={`flex items-center px-4 py-2 text-sm ${getNavClass(item.url)}`}
                      >
                        <item.icon className="mr-3 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
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
