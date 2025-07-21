
import { NavLink } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  FileText, 
  BarChart3, 
  Settings, 
  CheckCircle,
  ClipboardList
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/appraisal-cycles', icon: Calendar, label: 'Appraisal Cycles' },
  { to: '/questions', icon: FileText, label: 'Questions' },
  { to: '/committee', icon: ClipboardList, label: 'Committee Review' },
  { to: '/hr-appraisals', icon: CheckCircle, label: 'Final Approvals' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function HRSidebarNav() {
  return (
    <nav className="space-y-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-orange-100 text-orange-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            }`
          }
        >
          <item.icon className="h-5 w-5" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
