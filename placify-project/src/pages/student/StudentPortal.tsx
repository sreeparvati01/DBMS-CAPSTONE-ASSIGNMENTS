import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  LogOut,
  Search,
  User,
  Video,
  XCircle,
} from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { Application, Interview, JobOpening, Placement, PlacementDrive, Student } from '../../types';
import { Modal } from '../../components/ui/Modal';

interface StudentDashboardData {
  student: Student;
  jobs: JobOpening[];
  applications: Application[];
  interviews: Interview[];
  placement: Placement | null;
  drives: PlacementDrive[];
}

type TabKey = 'overview' | 'jobs' | 'applications' | 'interviews' | 'placement' | 'profile';

export function StudentPortal() {
  const { logout, refreshSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('overview');
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [jobSearch, setJobSearch] = useState('');
  const [jobFilter, setJobFilter] = useState<'ALL' | 'ELIGIBLE' | 'APPLIED'>('ALL');

  const [eligibilityModalJob, setEligibilityModalJob] = useState<JobOpening | null>(null);
  const [applyModalJob, setApplyModalJob] = useState<JobOpening | null>(null);
  const [coverNote, setCoverNote] = useState('');
  const [applying, setApplying] = useState(false);

  const [profileForm, setProfileForm] = useState({
    phone: '',
    skills: '',
    resume_url: '',
    resume_summary: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<StudentDashboardData>('/api/student/dashboard');
      setData(res);
      setProfileForm({
        phone: res.student.phone || '',
        skills: res.student.skills || '',
        resume_url: res.student.resume_url || '',
        resume_summary: res.student.resume_summary || '',
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load Student Portal.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    await logout();
    showToast('Signed out from Student Portal.', 'info');
    navigate('/login', { replace: true });
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalJob) return;
    setApplying(true);
    try {
      await apiFetch('/api/student/applications', {
        method: 'POST',
        body: JSON.stringify({ job_id: applyModalJob.id, cover_note: coverNote }),
      });
      showToast(`Application submitted for ${applyModalJob.title} at ${applyModalJob.company_name}.`);
      setApplyModalJob(null);
      setCoverNote('');
      loadDashboard();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Application failed.', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch('/api/student/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      showToast('Profile updated. Eligibility checks refreshed.');
      await refreshSession();
      loadDashboard();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F5F3EC] p-6 sm:p-10">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-16 bg-white rounded-xl border border-[#E3E7E4] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-[#E3E7E4] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { student, jobs, applications, interviews, placement, drives } = data;
  const eligibleOpenJobsCount = jobs.filter((j) => j.status === 'Open' && j.eligibility?.eligible).length;
  const upcomingInterviewsCount = interviews.filter((i) => i.status === 'Scheduled' || i.status === 'Rescheduled').length;

  const filteredJobs = jobs.filter((j) => {
    const matchesSearch =
      !jobSearch.trim() ||
      j.title.toLowerCase().includes(jobSearch.toLowerCase()) ||
      (j.company_name || '').toLowerCase().includes(jobSearch.toLowerCase()) ||
      j.required_skills.toLowerCase().includes(jobSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (jobFilter === 'ELIGIBLE') return Boolean(j.eligibility?.eligible);
    if (jobFilter === 'APPLIED') return Boolean(j.application_id);
    return true;
  });

  const navTabs: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'overview', label: 'Overview', icon: GraduationCap },
    { key: 'jobs', label: 'Jobs & Eligibility', icon: Briefcase },
    { key: 'applications', label: 'My Applications', icon: ClipboardList },
    { key: 'interviews', label: 'Interviews', icon: Video },
    { key: 'placement', label: 'Placement Offer', icon: Award },
    { key: 'profile', label: 'Profile & Skills', icon: User },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EC] text-[#122120]">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#142B2A] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-lg text-white shrink-0">
              <GraduationCap className="w-5 h-5 text-[#37A88A]" />
              <span>PLACIFY</span>
            </Link>
            <span className="hidden sm:inline text-xs text-white/70 truncate">
              Student Portal · {student.roll_number} · {student.department_code}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right hidden md:block">
              <p className="text-xs font-semibold text-white">{student.full_name}</p>
              <p className="text-[11px] text-[#D8A85B]">CGPA {Number(student.cgpa).toFixed(2)} · {student.placement_status}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Sub-navigation tabs */}
        <div className="bg-white border-b border-[#E3E7E4] text-[#142B2A]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto py-1.5">
            {navTabs.map((item) => {
              const Icon = item.icon;
              const active = tab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'bg-[#142B2A] text-white' : 'text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#176B5B]">Welcome back</p>
                <h1 className="font-display font-bold text-2xl text-[#142B2A] mt-0.5">{student.full_name}</h1>
                <p className="text-sm text-[#5A6B69] mt-1">
                  {student.roll_number} · {student.course} in {student.department_name} · Class of {student.graduation_year}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-[#5A6B69]">Verified CGPA</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A]">{Number(student.cgpa).toFixed(2)}</p>
                </div>
                <div className="h-10 w-px bg-[#E3E7E4]" />
                <div>
                  <p className="text-xs text-[#5A6B69]">Placement Status</p>
                  <p className="text-sm font-bold text-[#176B5B]">{student.placement_status}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button type="button" onClick={() => setTab('jobs')} className="text-left rounded-xl border border-[#E3E7E4] bg-white p-5 hover:border-[#176B5B]">
                <p className="text-xs text-[#5A6B69]">Eligible Open Jobs</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#176B5B] mt-1">{eligibleOpenJobsCount}</p>
              </button>
              <button type="button" onClick={() => setTab('applications')} className="text-left rounded-xl border border-[#E3E7E4] bg-white p-5 hover:border-[#176B5B]">
                <p className="text-xs text-[#5A6B69]">My Applications</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A] mt-1">{applications.length}</p>
              </button>
              <button type="button" onClick={() => setTab('interviews')} className="text-left rounded-xl border border-[#E3E7E4] bg-white p-5 hover:border-[#176B5B]">
                <p className="text-xs text-[#5A6B69]">Upcoming Interviews</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A] mt-1">{upcomingInterviewsCount}</p>
              </button>
              <button type="button" onClick={() => setTab('placement')} className="text-left rounded-xl border border-[#E3E7E4] bg-white p-5 hover:border-[#176B5B]">
                <p className="text-xs text-[#5A6B69]">Confirmed Offer</p>
                <p className="text-lg font-bold text-[#142B2A] mt-1 truncate">
                  {placement ? `${placement.company_name} (${placement.package_lpa} LPA)` : 'Not Yet Placed'}
                </p>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-base text-[#142B2A]">Available Placement Drives</h2>
                  <CalendarClock className="w-4 h-4 text-[#176B5B]" />
                </div>
                {drives.length === 0 ? (
                  <p className="text-sm text-[#5A6B69]">No upcoming placement drives scheduled.</p>
                ) : (
                  <div className="divide-y divide-[#F5F3EC]">
                    {drives.map((d) => (
                      <div key={d.id} className="py-3 space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[#142B2A]">{d.title}</span>
                          <span className="font-mono text-xs text-[#176B5B] shrink-0">{d.drive_date}</span>
                        </div>
                        <p className="text-xs text-[#5A6B69]">
                          {d.company_name} · {d.job_role} · Min CGPA {Number(d.min_cgpa).toFixed(1)} · {d.eligible_departments}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-semibold text-base text-[#142B2A]">Recent Application Status</h2>
                  <button type="button" onClick={() => setTab('applications')} className="text-xs font-semibold text-[#176B5B] hover:underline">
                    View All
                  </button>
                </div>
                {applications.length === 0 ? (
                  <p className="text-sm text-[#5A6B69]">You have not applied to any job openings yet.</p>
                ) : (
                  <div className="divide-y divide-[#F5F3EC]">
                    {applications.slice(0, 4).map((a) => (
                      <div key={a.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-[#142B2A]">{a.job_title}</p>
                          <p className="text-xs text-[#5A6B69]">{a.company_name} · {a.package_lpa} LPA</p>
                        </div>
                        <span className="text-xs font-semibold text-[#176B5B]">{a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'jobs' && (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="font-display font-bold text-2xl text-[#142B2A]">Job Openings & Eligibility Checker</h1>
                <p className="text-sm text-[#5A6B69]">
                  Automated eligibility evaluation against your verified CGPA ({Number(student.cgpa).toFixed(2)}), branch ({student.department_code}), batch ({student.graduation_year}), and skills.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Search roles or skills..."
                    className="pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] bg-white text-sm focus:outline-none focus:border-[#176B5B]"
                  />
                </div>
                <div className="inline-flex rounded-lg border border-[#E3E7E4] bg-white p-1">
                  {(['ALL', 'ELIGIBLE', 'APPLIED'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setJobFilter(f)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md ${
                        jobFilter === f ? 'bg-[#142B2A] text-white' : 'text-[#5A6B69] hover:text-[#142B2A]'
                      }`}
                    >
                      {f === 'ALL' ? 'All Jobs' : f === 'ELIGIBLE' ? 'Eligible Only' : 'Applied'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job) => {
                const elig = job.eligibility;
                const isEligible = Boolean(elig?.eligible);
                const alreadyApplied = Boolean(job.application_id);

                return (
                  <div key={job.id} className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-[#176B5B]">
                            {job.company_name} · {job.job_type}
                          </p>
                          <h2 className="font-display font-semibold text-lg text-[#142B2A]">{job.title}</h2>
                        </div>
                        <span className="font-mono tabular-nums text-sm font-bold text-[#142B2A] shrink-0">
                          {job.package_lpa} LPA
                        </span>
                      </div>

                      <p className="text-xs text-[#5A6B69]">
                        {job.location} · Min CGPA {Number(job.min_cgpa).toFixed(1)} · Dept {job.eligible_departments} · Batch {job.eligible_year} · Deadline {job.application_deadline}
                      </p>
                      <p className="text-sm text-[#5A6B69]">{job.description}</p>
                      <p className="text-xs text-[#5A6B69]">
                        Required Skills: <strong className="text-[#142B2A]">{job.required_skills || 'None specified'}</strong>
                      </p>

                      {elig && (
                        <div
                          className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                            isEligible
                              ? 'bg-[#F5F3EC] text-[#142B2A] border border-[#37A88A]/40'
                              : 'bg-red-50/70 text-red-900 border border-red-200'
                          }`}
                        >
                          {isEligible ? (
                            <CheckCircle2 className="w-4 h-4 text-[#176B5B] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-semibold">{isEligible ? 'Eligible to Apply' : 'Not Eligible'}</p>
                            {!isEligible && elig.reasons[0] && <p className="mt-0.5">{elig.reasons[0]}</p>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F5F3EC] flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setEligibilityModalJob(job)}
                        className="text-xs font-semibold text-[#176B5B] hover:underline"
                      >
                        View Eligibility Breakdown
                      </button>

                      {alreadyApplied ? (
                        <span className="text-xs font-semibold text-[#142B2A]">
                          Applied ({job.application_status})
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEligible}
                          onClick={() => setApplyModalJob(job)}
                          className="px-4 py-2 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'applications' && (
          <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3E7E4]">
              <h1 className="font-display font-bold text-xl text-[#142B2A]">My Application History</h1>
            </div>
            {applications.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#5A6B69]">
                You have not submitted any applications yet. Visit the Jobs & Eligibility tab to apply.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Company</th>
                      <th className="px-4 py-3 font-semibold">Job Role</th>
                      <th className="px-4 py-3 font-semibold text-right">Package</th>
                      <th className="px-4 py-3 font-semibold">Applied On</th>
                      <th className="px-4 py-3 font-semibold">Current Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F3EC]">
                    {applications.map((a) => (
                      <tr key={a.id}>
                        <td className="px-4 py-3 font-semibold text-[#142B2A]">{a.company_name}</td>
                        <td className="px-4 py-3">{a.job_title} · {a.job_location}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums">{a.package_lpa} LPA</td>
                        <td className="px-4 py-3 font-mono text-xs text-[#5A6B69]">{String(a.applied_at).slice(0, 10)}</td>
                        <td className="px-4 py-3 font-semibold text-[#176B5B]">{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'interviews' && (
          <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E3E7E4]">
              <h1 className="font-display font-bold text-xl text-[#142B2A]">My Interview Schedule</h1>
            </div>
            {interviews.length === 0 ? (
              <div className="p-12 text-center text-sm text-[#5A6B69]">No interviews scheduled yet.</div>
            ) : (
              <div className="divide-y divide-[#F5F3EC]">
                {interviews.map((i) => (
                  <div key={i.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-display font-semibold text-[#142B2A]">
                        {i.company_name} — {i.job_title}
                      </p>
                      <p className="text-xs text-[#5A6B69]">
                        Mode: <strong className="text-[#142B2A]">{i.mode}</strong> · Location/Link:{' '}
                        <span className="text-[#176B5B]">{i.location_or_link}</span>
                      </p>
                      {i.feedback && <p className="text-xs text-[#5A6B69]">Panel Notes: {i.feedback}</p>}
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-[#142B2A]">
                        {i.interview_date} · {i.interview_time}
                      </p>
                      <p className="text-xs font-semibold text-[#176B5B]">
                        {i.status} · Result: {i.result}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'placement' && (
          <div className="rounded-xl border border-[#E3E7E4] bg-white p-8">
            <h1 className="font-display font-bold text-xl text-[#142B2A] mb-4">Placement Offer Record</h1>
            {placement ? (
              <div className="rounded-xl bg-[#F5F3EC] border border-[#37A88A]/40 p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-[#5A6B69]">Recruiting Company</p>
                  <p className="font-display font-bold text-lg text-[#142B2A] mt-0.5">{placement.company_name}</p>
                  <p className="text-xs text-[#5A6B69]">{placement.company_industry} · {placement.company_location}</p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6B69]">Offered Role & CTC</p>
                  <p className="font-semibold text-[#142B2A] mt-0.5">{placement.job_role}</p>
                  <p className="font-mono font-bold text-lg text-[#176B5B]">{placement.package_lpa} LPA</p>
                </div>
                <div>
                  <p className="text-xs text-[#5A6B69]">Confirmation & Year</p>
                  <p className="font-semibold text-[#142B2A] mt-0.5">{placement.status}</p>
                  <p className="text-xs font-mono text-[#5A6B69]">
                    {placement.placement_date} ({placement.academic_year})
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#5A6B69]">
                No final placement offer recorded yet. Keep applying to eligible roles and preparing for upcoming drives.
              </p>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 sm:p-8 max-w-3xl space-y-6">
            <div>
              <h1 className="font-display font-bold text-xl text-[#142B2A]">Student Profile & Resume</h1>
              <p className="text-sm text-[#5A6B69]">
                Update your contact number, skills, and resume summary. Verified academic fields are managed by the Placement Cell.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#F5F3EC] border border-[#E3E7E4] text-xs">
              <div>
                <p className="text-[#5A6B69]">Roll Number</p>
                <p className="font-mono font-bold text-[#142B2A] mt-0.5">{student.roll_number}</p>
              </div>
              <div>
                <p className="text-[#5A6B69]">Department</p>
                <p className="font-semibold text-[#142B2A] mt-0.5">{student.department_code}</p>
              </div>
              <div>
                <p className="text-[#5A6B69]">Graduation Year</p>
                <p className="font-mono font-bold text-[#142B2A] mt-0.5">{student.graduation_year}</p>
              </div>
              <div>
                <p className="text-[#5A6B69]">Verified CGPA</p>
                <p className="font-mono font-bold text-[#176B5B] mt-0.5">{Number(student.cgpa).toFixed(2)}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Technical & Domain Skills (comma-separated)</label>
                <input
                  type="text"
                  value={profileForm.skills}
                  onChange={(e) => setProfileForm({ ...profileForm, skills: e.target.value })}
                  placeholder="e.g. TypeScript, React, Node.js, SQL"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Resume Link (PDF / Drive URL)</label>
                <input
                  type="text"
                  value={profileForm.resume_url}
                  onChange={(e) => setProfileForm({ ...profileForm, resume_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Resume Summary</label>
                <textarea
                  rows={3}
                  value={profileForm.resume_summary}
                  onChange={(e) => setProfileForm({ ...profileForm, resume_summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Detailed Eligibility Modal */}
      <Modal
        open={Boolean(eligibilityModalJob)}
        onClose={() => setEligibilityModalJob(null)}
        title="Eligibility Evaluation"
        subtitle={eligibilityModalJob ? `${eligibilityModalJob.company_name} — ${eligibilityModalJob.title}` : ''}
      >
        {eligibilityModalJob?.eligibility && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 rounded-lg bg-[#F5F3EC] border border-[#E3E7E4]">
              <span className="text-sm font-semibold text-[#142B2A]">Overall Eligibility</span>
              <span className={`text-sm font-bold ${eligibilityModalJob.eligibility.eligible ? 'text-[#176B5B]' : 'text-red-700'}`}>
                {eligibilityModalJob.eligibility.eligible ? 'Eligible' : 'Not Eligible'}
              </span>
            </div>

            <div className="divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
              {eligibilityModalJob.eligibility.checks.map((chk) => (
                <div key={chk.label} className="p-3 flex items-start gap-3 text-sm">
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#176B5B] shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-[#142B2A]">{chk.label}</p>
                    <p className="text-xs text-[#5A6B69]">{chk.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Apply Modal */}
      <Modal
        open={Boolean(applyModalJob)}
        onClose={() => setApplyModalJob(null)}
        title={`Apply for ${applyModalJob?.title}`}
        subtitle={applyModalJob ? `${applyModalJob.company_name} · ${applyModalJob.package_lpa} LPA` : ''}
      >
        <form onSubmit={handleApply} className="space-y-4">
          <p className="text-xs text-[#5A6B69]">
            Your verified CGPA ({Number(student.cgpa).toFixed(2)}), branch ({student.department_code}), and skills will be shared with the placement team.
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Cover Note / Statement of Interest (Optional)</label>
            <textarea
              rows={3}
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Briefly highlight relevant projects or coursework..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setApplyModalJob(null)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={applying} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {applying ? 'Submitting...' : 'Confirm & Submit Application'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
