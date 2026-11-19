import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#142B2A] text-white/80 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-white/10">
          <div className="md:col-span-2 space-y-3">
            <div className="inline-flex items-center gap-2.5 text-white font-display font-bold text-lg">
              <GraduationCap className="w-5 h-5 text-[#37A88A]" />
              <span>PLACIFY</span>
            </div>
            <p className="text-sm text-white/70 max-w-md leading-relaxed">
              Connecting Talent. Shaping Futures. A centralized campus placement management platform built for universities, placement cells, and recruiting partners.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="text-white font-semibold font-display">Platform</h3>
            <ul className="space-y-1.5 text-white/70">
              <li><Link to="/jobs" className="hover:text-white transition-colors">Job Openings</Link></li>
              <li><Link to="/companies" className="hover:text-white transition-colors">Partner Companies</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Administrator & Student Login</Link></li>
              <li><Link to="/register" className="hover:text-white transition-colors">Student Registration</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="text-white font-semibold font-display">Placement Cell</h3>
            <p className="text-white/70 leading-relaxed">
              Training & Placement Wing, Academic Block A<br />
              placements@placify.edu<br />
              +91 (080) 4120-8800
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} PLACIFY — College Placement Management & Recruitment System.</p>
          <p>Training & Placement Cell · Academic Portal</p>
        </div>
      </div>
    </footer>
  );
}
