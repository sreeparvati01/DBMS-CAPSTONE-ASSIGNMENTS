import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Briefcase, MapPin, Calendar } from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Footer } from '../components/layout/Footer';
import { apiFetch } from '../lib/api';
import type { JobOpening } from '../types';
import { useAuth } from '../context/AuthContext';

export function PublicJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Open' | 'ALL'>('Open');

  useEffect(() => {
    setLoading(true);
    apiFetch<{ jobs: JobOpening[] }>(`/api/public/jobs?status=${statusFilter}&search=${encodeURIComponent(search)}`)
      .then((res) => setJobs(res.jobs))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EC]/50 text-[#122120]">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#176B5B]">Campus Recruitment Board</p>
            <h1 className="font-display font-bold text-3xl text-[#142B2A] mt-1">Job Openings</h1>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role, company, or skill..."
                className="pl-9 pr-4 py-2 rounded-lg border border-[#E3E7E4] bg-white text-sm w-full sm:w-64 focus:outline-none focus:border-[#176B5B]"
              />
            </div>

            <div className="inline-flex rounded-lg border border-[#E3E7E4] bg-white p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('Open')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'Open' ? 'bg-[#142B2A] text-white' : 'text-[#5A6B69] hover:text-[#142B2A]'
                }`}
              >
                Open Roles
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  statusFilter === 'ALL' ? 'bg-[#142B2A] text-white' : 'text-[#5A6B69] hover:text-[#142B2A]'
                }`}
              >
                All Postings
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-white border border-[#E3E7E4] animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E3E7E4] bg-white p-12 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No matching job openings found</p>
            <p className="text-sm text-[#5A6B69]">Try clearing your search or switching to All Postings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-[#176B5B]">
                        {job.company_name} · {job.status}
                      </p>
                      <h2 className="font-display font-semibold text-lg text-[#142B2A] mt-0.5">{job.title}</h2>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-bold text-[#142B2A] shrink-0">
                      {job.package_lpa} LPA
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5A6B69]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {job.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Deadline {job.application_deadline}
                    </span>
                    <span>Min CGPA {Number(job.min_cgpa).toFixed(1)}</span>
                    <span>Batch {job.eligible_year}</span>
                  </div>

                  <p className="text-sm text-[#5A6B69]">{job.description}</p>
                  <p className="text-xs text-[#5A6B69]">
                    Skills: <span className="text-[#142B2A] font-medium">{job.required_skills || 'Any'}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F5F3EC] flex items-center justify-between text-xs">
                  <span className="text-[#5A6B69]">
                    Departments: <strong className="text-[#142B2A]">{job.eligible_departments}</strong>
                  </span>
                  <Link
                    to={user?.role === 'student' ? '/student' : '/login'}
                    className="px-3.5 py-2 rounded-lg bg-[#142B2A] hover:bg-[#176B5B] text-white font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    {user?.role === 'student' ? 'Check Eligibility in Portal' : 'Sign In to Apply'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
