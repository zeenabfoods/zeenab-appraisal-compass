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

  // EMERGENCY DEBUG PROTOCOL - Execute all debugging steps
  useEffect(() => {
    console.log('🚨 EMERGENCY DEBUG PROTOCOL INITIATED 🚨');
    
    // Step 1: DOM Nuclear Reset
    console.log('STEP 1: DOM Nuclear Reset');
    const sidebarHTML = `<div class="side-menu emergency-debug" style="position:fixed;z-index:9999;background:red!important;color:white!important;padding:20px;width:200px;height:100px;top:50px;left:50px;border:3px solid yellow;">FORCED MENU - NUCLEAR INJECTION</div>`;
    document.body.insertAdjacentHTML('beforeend', sidebarHTML);
    console.log("✅ Nuclear DOM injection executed - Check for red menu");
    
    // Step 2: CSS Override Storm
    console.log('STEP 2: CSS Override Storm');
    const emergencyCSS = document.createElement('style');
    emergencyCSS.innerHTML = `
      .emergency-sidebar-test {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        transform: none !important;
        width: 300px !important;
        height: 100vh !important;
        position: fixed !important;
        top: 0 !important;
        left: 200px !important;
        background: #000 !important;
        z-index: 9998 !important;
        color: white !important;
        padding: 20px !important;
      }
    `;
    document.head.appendChild(emergencyCSS);
    
    const blackSidebar = `<div class="emergency-sidebar-test">BLACK FORCED SIDEBAR - CSS OVERRIDE</div>`;
    document.body.insertAdjacentHTML('beforeend', blackSidebar);
    console.log("✅ CSS Override Storm executed - Check for black sidebar");
    
    // Step 3: JavaScript Execution Autopsy
    console.log('STEP 3: JavaScript Execution Autopsy');
    console.log("Toggle function exists:", typeof (window as any).toggleMenu === 'function');
    console.log("Window object keys:", Object.keys(window).filter(key => key.includes('toggle') || key.includes('sidebar') || key.includes('menu')));
    
    // Check if toggle functions exist on window
    if (typeof (window as any).toggleMenu === 'function') {
      console.log("🎯 Found toggleMenu function, attempting to call...");
      try {
        (window as any).toggleMenu();
        console.log("✅ toggleMenu called successfully");
      } catch (error) {
        console.error("❌ Error calling toggleMenu:", error);
      }
    } else {
      console.log("❌ No toggleMenu function found on window object");
    }
    
    // Step 4: Local Storage & Cache Obliteration
    console.log('STEP 4: Local Storage & Cache Obliteration');
    console.log("Before cleanup - localStorage keys:", Object.keys(localStorage));
    console.log("Before cleanup - sessionStorage keys:", Object.keys(sessionStorage));
    
    localStorage.removeItem('sidebarState');
    localStorage.removeItem('sidebar:state');
    sessionStorage.removeItem('sidebarCollapsed');
    sessionStorage.clear();
    
    console.log("✅ Storage obliteration complete");
    
    // Step 5: Error Bruteforce Detection
    console.log('STEP 5: Error Bruteforce Detection');
    console.log("🔍 Analyzing all loaded resources:");
    
    performance.getEntriesByType("resource").forEach((resource: any) => {
      if (resource.initiatorType === "script" || resource.initiatorType === "css") {
        const status = resource.responseStatus || 'unknown';
        const loadTime = Math.round(resource.responseEnd - resource.requestStart);
        console.log(`📦 ${resource.initiatorType.toUpperCase()}: ${resource.name} [Status: ${status}, Load: ${loadTime}ms]`);
      }
    });
    
    // Check for specific sidebar-related failures
    const failedResources = performance.getEntriesByType("resource").filter((resource: any) => 
      resource.name.includes('sidebar') || 
      resource.name.includes('menu') ||
      resource.responseStatus >= 400
    );
    
    if (failedResources.length > 0) {
      console.error("🚨 FAILED RESOURCES DETECTED:");
      failedResources.forEach((resource: any) => {
        console.error(`❌ FAILED: ${resource.name} [Status: ${resource.responseStatus}]`);
      });
    } else {
      console.log("✅ No failed sidebar/menu resources detected");
    }
    
    // Additional DOM Analysis
    console.log('BONUS: DOM Analysis');
    const allSidebarElements = document.querySelectorAll('[data-sidebar], .sidebar, [class*="sidebar"], [class*="menu"]');
    console.log(`🎯 Found ${allSidebarElements.length} sidebar-related elements in DOM:`);
    allSidebarElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const styles = window.getComputedStyle(el);
      console.log(`Element ${index + 1}:`, {
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        position: styles.position,
        zIndex: styles.zIndex,
        transform: styles.transform,
        width: styles.width,
        height: styles.height,
        boundingRect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible: rect.width > 0 && rect.height > 0
        }
      });
    });
    
    // Cleanup debug elements after 10 seconds
    setTimeout(() => {
      document.querySelectorAll('.emergency-debug, .emergency-sidebar-test').forEach(el => el.remove());
      console.log("🧹 Debug elements cleaned up");
    }, 10000);
    
  }, []);

  // Original debug logging
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
      const htmlElement = sidebarElement as HTMLElement;
      console.log('AppSidebar: DOM element found', {
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        transform: styles.transform,
        width: styles.width,
        height: styles.height,
        zIndex: styles.zIndex,
        offsetParent: htmlElement.offsetParent !== null,
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
        display: 'flex',
        visibility: 'visible',
        opacity: '1',
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
