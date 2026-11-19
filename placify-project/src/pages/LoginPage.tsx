import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ApiError } from '../lib/api';

const ROLE_CREDENTIALS: Record<'student' | 'admin', { email: string; password: string }> = {
  student: {
    email: 'aarav.sharma@placify.edu',
    password: 'Student@123',
  },
  admin: {
    email: 'admin@placify.edu',
    password: 'Admin@123',
  },
};

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [role, setRole] = useState<'admin' | 'student'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/student', { replace: true });
    }
  }, [user, navigate]);

  const handleRoleSelect = (selectedRole: 'student' | 'admin') => {
    setRole(selectedRole);
    setEmail(ROLE_CREDENTIALS[selectedRole].email);
    setPassword(ROLE_CREDENTIALS[selectedRole].password);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid institutional email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const signedUser = await login({ email: email.trim(), password, role, rememberMe });
      showToast(`Welcome back, ${signedUser.full_name}`);
      navigate(signedUser.role === 'admin' ? '/admin' : '/student', { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to sign in. Please check your credentials.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F5F3EC]">
      {/* Left Brand Panel */}
      <div className="lg:col-span-5 bg-[#142B2A] text-white p-8 sm:p-12 flex flex-col justify-between">
        <div>
          <Link to="/" className="inline-flex items-center gap-2.5 text-xl font-bold font-display text-white">
            <GraduationCap className="w-6 h-6 text-[#37A88A]" />
            <span>PLACIFY</span>
          </Link>
          <p className="text-xs text-[#D8A85B] mt-2 font-medium">Connecting Talent. Shaping Futures.</p>
        </div>

        <div className="my-10 space-y-5">
          <h1 className="font-display font-bold text-3xl sm:text-4xl leading-tight [text-wrap:balance]">
            Campus Placement Command & Student Career Portal
          </h1>
          <p className="text-sm text-white/75 leading-relaxed max-w-md">
            Sign in as a Placement Officer to administer drives, students, interviews, and offers — or sign in as a Student to verify eligibility and track applications.
          </p>
        </div>

        <div className="text-xs text-white/60 flex items-center justify-between">
          <span>Role-Based Access Control</span>
          <Link to="/" className="text-white/80 hover:text-white underline underline-offset-4">
            Back to Home
          </Link>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E3E7E4] p-7 sm:p-9 shadow-sm space-y-6">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#142B2A]">Sign in to PLACIFY</h2>
            <p className="text-sm text-[#5A6B69] mt-1">Select your portal role and enter your credentials.</p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                role === 'student' && email === ROLE_CREDENTIALS.student.email
                  ? 'bg-[#142B2A] border-[#142B2A] text-white shadow-sm'
                  : role === 'student'
                    ? 'bg-[#F5F3EC] border-[#176B5B] text-[#142B2A]'
                    : 'bg-[#F5F3EC]/60 border-[#E3E7E4] text-[#5A6B69] hover:border-[#176B5B] hover:text-[#142B2A]'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  role === 'student' && email === ROLE_CREDENTIALS.student.email
                    ? 'bg-white/10 text-[#37A88A]'
                    : 'bg-white text-[#176B5B] border border-[#E3E7E4]'
                }`}
              >
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">Student Login</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    role === 'student' && email === ROLE_CREDENTIALS.student.email ? 'text-white/70' : 'text-[#5A6B69]'
                  }`}
                >
                  Career portal & jobs
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('admin')}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                role === 'admin' && email === ROLE_CREDENTIALS.admin.email
                  ? 'bg-[#142B2A] border-[#142B2A] text-white shadow-sm'
                  : role === 'admin'
                    ? 'bg-[#F5F3EC] border-[#176B5B] text-[#142B2A]'
                    : 'bg-[#F5F3EC]/60 border-[#E3E7E4] text-[#5A6B69] hover:border-[#176B5B] hover:text-[#142B2A]'
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  role === 'admin' && email === ROLE_CREDENTIALS.admin.email
                    ? 'bg-white/10 text-[#D8A85B]'
                    : 'bg-white text-[#176B5B] border border-[#E3E7E4]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight">Placement Officer Login</p>
                <p
                  className={`text-[11px] mt-0.5 leading-snug ${
                    role === 'admin' && email === ROLE_CREDENTIALS.admin.email ? 'text-white/70' : 'text-[#5A6B69]'
                  }`}
                >
                  Admin & drive controls
                </p>
              </div>
            </button>
          </div>

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold text-[#142B2A] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#5A6B69] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'admin@placify.edu' : 'student@placify.edu'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#E3E7E4] text-sm text-[#142B2A] focus:outline-none focus:border-[#176B5B]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-[#142B2A] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#5A6B69] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-2.5 rounded-lg border border-[#E3E7E4] text-sm text-[#142B2A] focus:outline-none focus:border-[#176B5B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A6B69] hover:text-[#142B2A] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#5A6B69] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E3E7E4] text-[#176B5B] focus:ring-[#176B5B]"
                />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : `Sign In as ${role === 'admin' ? 'Placement Officer' : 'Student'}`}
            </button>
          </form>

          <div className="pt-4 border-t border-[#F5F3EC] text-center text-xs text-[#5A6B69]">
            New student on campus?{' '}
            <Link to="/register" className="font-semibold text-[#176B5B] hover:underline">
              Create Student Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
