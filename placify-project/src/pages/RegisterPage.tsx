import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Department } from '../types';

export function RegisterPage() {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    roll_number: '',
    phone: '',
    department_id: '',
    course: 'B.Tech',
    graduation_year: '2026',
    cgpa: '8.0',
    skills: '',
  });

  useEffect(() => {
    apiFetch<{ departments: Department[] }>('/api/departments')
      .then((res) => {
        setDepartments(res.departments);
        if (res.departments.length > 0) {
          setForm((prev) => ({ ...prev, department_id: String(res.departments[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        ...form,
        department_id: Number(form.department_id),
        graduation_year: Number(form.graduation_year),
        cgpa: Number(form.cgpa),
      });
      showToast('Student account created successfully.');
      navigate('/student', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to register student.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F3EC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#E3E7E4] p-7 sm:p-10 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold font-display text-[#142B2A]">
            <GraduationCap className="w-5 h-5 text-[#176B5B]" />
            <span>PLACIFY</span>
          </Link>
          <Link to="/login" className="text-xs font-semibold text-[#176B5B] hover:underline">
            Already registered? Sign In
          </Link>
        </div>

        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Student Registration</h1>
          <p className="text-sm text-[#5A6B69] mt-1">
            Create your student placement profile to check job eligibility and apply to drives.
          </p>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="e.g. Kavya Menon"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Roll / Student ID</label>
            <input
              type="text"
              required
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              placeholder="e.g. CS2026099"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">College Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="name@placify.edu"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98000 00000"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Department</label>
            <select
              required
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm bg-white focus:outline-none focus:border-[#176B5B]"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Course & Graduation Year</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={form.course}
                onChange={(e) => setForm({ ...form, course: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
              />
              <input
                type="number"
                required
                min={2024}
                max={2030}
                value={form.graduation_year}
                onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E3E7E4] text-sm font-mono focus:outline-none focus:border-[#176B5B]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Current CGPA (0–10)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              required
              value={form.cgpa}
              onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm font-mono focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Password (min 6 chars)</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Create a password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Key Skills (comma-separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              placeholder="e.g. Python, React, SQL, Data Structures"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>

          <div className="sm:col-span-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Creating Account...' : 'Register & Open Student Portal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
