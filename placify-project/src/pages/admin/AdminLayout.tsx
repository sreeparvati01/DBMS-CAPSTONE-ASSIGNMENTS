import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const navLinks = [
  { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Students', to: '/admin/students', icon: Users },
  { label: 'Companies', to: '/admin/companies', icon: Building2 },
  { label: 'Placement Drives', to: '/admin/drives', icon: CalendarClock },
  { label: 'Job Openings', to: '/admin/jobs', icon: Briefcase },
  { label: 'Applications', to: '/admin/applications', icon: ClipboardList },
  { label: 'Interviews', to: '/admin/interviews', icon: Video },
  { label: 'Placements', to: '/admin/placements', icon: Award },
  { label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart3 },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentSection =
    navLinks.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))?.label ||
    'Overview';

  const handleLogout = async () => {
    await logout();
    showToast('Signed out from Administrator Console.', 'info');
    navigate('/login', { replace: true });
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#142B2A] text-white">
      <div className="px-5 h-16 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="inline-flex items-center gap-2.5 font-display font-bold text-lg text-white">
          <GraduationCap className="w-5 h-5 text-[#37A88A]" />
          <span>PLACIFY</span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
          className="lg:hidden p-1.5 text-white/75 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#176B5B] text-white'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="px-2">
          <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
          <p className="text-[11px] text-[#D8A85B]">Placement Officer · Admin</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F3EC] text-[#122120]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{SidebarContent}</aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 h-full">{SidebarContent}</div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#E3E7E4] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-lg text-[#142B2A] hover:bg-[#F5F3EC]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm text-[#5A6B69] truncate">
              <span className="hidden sm:inline">Admin Console / </span>
              <span className="font-semibold text-[#142B2A] font-display">{currentSection}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-[#142B2A]">{user?.full_name}</p>
              <p className="text-[11px] text-[#5A6B69]">{user?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
