import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GraduationCap, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function PublicNavbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const portalHref = user ? (user.role === 'admin' ? '/admin' : '/student') : '/login';
  const portalLabel = user ? (user.role === 'admin' ? 'Admin Console' : 'Student Portal') : 'Sign In';

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Jobs', to: '/jobs' },
    { label: 'Companies', to: '/companies' },
    { label: 'About', to: '/#about' },
    { label: 'Contact', to: '/#contact' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#142B2A] text-white border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-white font-display whitespace-nowrap shrink-0"
        >
          <GraduationCap className="w-5 h-5 text-[#37A88A]" />
          <span>PLACIFY</span>
        </Link>

        {/* Zone 2: 5 concise single-line text links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-white/80">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            if (item.to.startsWith('/#')) {
              return (
                <a
                  key={item.label}
                  href={item.to}
                  className="hover:text-white transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4"
                >
                  {item.label}
                </a>
              );
            }
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-4 ${
                  active ? 'text-white font-semibold underline' : 'hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to={portalHref}
            className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-[#37A88A] hover:bg-[#2c8c72] text-[#142B2A] font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            {portalLabel}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[#142B2A] border-t border-white/10 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-white/85 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            to={portalHref}
            onClick={() => setMobileOpen(false)}
            className="block w-full text-center mt-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-[#37A88A] text-[#142B2A]"
          >
            {portalLabel}
          </Link>
        </div>
      )}
    </header>
  );
}
