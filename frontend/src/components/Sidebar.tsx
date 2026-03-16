import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Languages,
  Presentation,
  GraduationCap,
} from 'lucide-react';

const navItems = [
  { to: '/',             label: 'Dashboard',     icon: LayoutDashboard },
  { to: '/conversation', label: 'Conversation',  icon: MessageSquare   },
  { to: '/translation',  label: 'Translation',   icon: Languages       },
  { to: '/presentation', label: 'Presentation',  icon: Presentation    },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-900 text-gray-100 shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 shadow-lg">
          <GraduationCap className="h-5 w-5 text-white" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide text-white">English Tutor</p>
          <p className="text-xs text-gray-400">AI-powered learning</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              ].join(' ')
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-700 px-6 py-4">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} English Tutor</p>
      </div>
    </aside>
  );
}
