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
    <aside
      className="flex h-screen w-64 flex-col shrink-0 overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
            boxShadow: '0 0 16px rgba(99,102,241,0.55), 0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
        </span>
        <div className="leading-tight min-w-0">
          <p
            className="text-sm text-white truncate"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }}
          >
            English Tutor
          </p>
          <p
            className="text-xs truncate"
            style={{ color: 'rgba(165,180,252,0.7)' }}
          >
            AI-powered learning
          </p>
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
                'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium',
                'transition-all duration-150',
                isActive
                  ? 'text-white'
                  : 'hover:text-white',
              ].join(' ')
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    borderLeft: '2px solid #a5b4fc',
                    paddingLeft: '14px',
                    color: '#fff',
                  }
                : {
                    color: '#a5b4fc',
                    borderLeft: '2px solid transparent',
                    paddingLeft: '14px',
                  }
            }
            onMouseEnter={(e) => {
              const target = e.currentTarget;
              if (!target.getAttribute('aria-current')) {
                target.style.background = 'rgba(255,255,255,0.08)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget;
              if (!target.getAttribute('aria-current')) {
                target.style.background = '';
              }
            }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="px-6 py-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p
          className="text-xs"
          style={{ color: 'rgba(165,180,252,0.45)' }}
        >
          &copy; {new Date().getFullYear()} English Tutor
        </p>
      </div>
    </aside>
  );
}
