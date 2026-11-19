import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Users,
} from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Footer } from '../components/layout/Footer';
import { apiFetch } from '../lib/api';
import type { JobOpening } from '../types';
import { useToast } from '../context/ToastContext';

interface PublicStats {
  students: number;
  companies: number;
  openJobs: number;
  totalJobs: number;
  applications: number;
  placements: number;
}

export function LandingPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [featuredJobs, setFeaturedJobs] = useState<JobOpening[]>([]);
  const [heroImgError, setHeroImgError] = useState(false);
  const [aboutImgError, setAboutImgError] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', organization: '', message: '' });
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch<PublicStats>('/api/public/stats')
      .then(setStats)
      .catch(() => setStats(null));

    apiFetch<{ jobs: JobOpening[] }>('/api/public/jobs?status=Open')
      .then((res) => setFeaturedJobs(res.jobs.slice(0, 4)))
      .catch(() => setFeaturedJobs([]));
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.includes('@') || !contactForm.message.trim()) {
      showToast('Please enter your name, a valid email, and your message.', 'error');
      return;
    }
    setContactSubmitted(true);
    showToast('Inquiry submitted to the Training & Placement Office.');
    setContactForm({ name: '', email: '', organization: '', message: '' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#122120]">
      <PublicNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-14 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between gap-8">
              <div className="space-y-5">
                <p className="text-xs font-semibold tracking-wide text-[#176B5B]">
                  Campus to Career · College Placement Platform
                </p>

                <h1 className="font-display font-extrabold tracking-tight text-[#142B2A] leading-[1.08] text-[clamp(2.25rem,4vw,3.6rem)] [text-wrap:balance]">
                  Your Future Starts With The Right{' '}
                  <span className="text-[#176B5B]">Opportunity.</span>
                </h1>

                <p className="text-base sm:text-lg text-[#5A6B69] max-w-xl leading-relaxed">
                  A unified placement platform for students, recruiting companies, and placement officers to coordinate drives, verify eligibility, and track offers in one place.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#142B2A] hover:bg-[#176B5B] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/jobs"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#176B5B]/30 bg-[#F5F3EC] hover:bg-[#E3E7E4]/60 text-[#142B2A] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                  >
                    Browse Jobs
                  </Link>
                </div>
              </div>

              {/* Live SQL Database Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-[#E3E7E4]">
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A]">
                    {stats ? stats.students : '—'}
                  </p>
                  <p className="text-xs text-[#5A6B69] mt-0.5">Registered Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A]">
                    {stats ? stats.companies : '—'}
                  </p>
                  <p className="text-xs text-[#5A6B69] mt-0.5">Partner Companies</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#176B5B]">
                    {stats ? stats.openJobs : '—'}
                  </p>
                  <p className="text-xs text-[#5A6B69] mt-0.5">Open Roles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A]">
                    {stats ? stats.applications : '—'}
                  </p>
                  <p className="text-xs text-[#5A6B69] mt-0.5">Applications</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 relative">
              <div className="relative h-full min-h-[320px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-[#E3E7E4] bg-[#F5F3EC]">
                {!heroImgError ? (
                  <img
                    src="/src/assets/images/hero_campus_students_1795043505010.jpg"
                    alt="University students collaborating on laptop for campus placements"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#142B2A] to-[#176B5B] text-white">
                    <GraduationCap className="w-12 h-12 text-[#D8A85B] mb-3" />
                    <p className="font-display font-semibold text-lg">PLACIFY Campus Recruitment</p>
                    <p className="text-sm text-white/75 mt-1">Connecting Talent. Shaping Futures.</p>
                  </div>
                )}

                <Link
                  to="/jobs"
                  className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm border border-[#E3E7E4] rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 hover:border-[#176B5B] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F5F3EC] flex items-center justify-center text-[#176B5B]">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-[#142B2A]">Explore Open Roles</p>
                    <p className="text-[11px] text-[#5A6B69]">Check eligibility instantly</p>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-[#176B5B] text-white flex items-center justify-center">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why PLACIFY Section */}
        <section className="bg-[#F5F3EC] border-y border-[#E3E7E4] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12 space-y-2">
              <p className="text-xs font-semibold text-[#176B5B]">Why PLACIFY</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#142B2A] [text-wrap:balance]">
                A Smarter Way to Manage <span className="text-[#176B5B]">Placements</span>
              </h2>
              <p className="text-sm text-[#5A6B69]">
                Designed around real university placement cell workflows — from eligibility verification to final offer analytics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-xl border border-[#E3E7E4] p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F3EC] text-[#176B5B] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-[#142B2A]">For Students</h3>
                <p className="text-sm text-[#5A6B69] leading-relaxed">
                  Check CGPA and branch eligibility automatically, apply to drives, and track interview schedules in real time.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-[#E3E7E4] p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F3EC] text-[#176B5B] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-[#142B2A]">For Companies</h3>
                <p className="text-sm text-[#5A6B69] leading-relaxed">
                  Partner with campus placement drives, specify skill and CGPA cutoffs, and review pre-screened applicants.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-[#E3E7E4] p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F3EC] text-[#176B5B] flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-[#142B2A]">For Placement Officers</h3>
                <p className="text-sm text-[#5A6B69] leading-relaxed">
                  Manage student profiles, coordinate recruitment drives, schedule interviews, and record final offers without spreadsheets.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-[#E3E7E4] p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-[#F5F3EC] text-[#176B5B] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-[#142B2A]">Real Insights</h3>
                <p className="text-sm text-[#5A6B69] leading-relaxed">
                  Inspect live department-wise placement percentages, package distributions, and exportable CSV audit reports.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Open Roles Preview */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-[#176B5B]">Active Recruitment</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#142B2A] mt-1">
                Current Job Openings
              </h2>
            </div>
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#176B5B] hover:text-[#142B2A] transition-colors whitespace-nowrap shrink-0"
            >
              <span>View all openings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featuredJobs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E3E7E4] p-10 text-center text-sm text-[#5A6B69]">
              No active job openings posted at this moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {featuredJobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col justify-between gap-4 hover:border-[#176B5B]/50 transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-[#176B5B]">{job.company_name}</p>
                        <h3 className="font-display font-semibold text-lg text-[#142B2A] mt-0.5">{job.title}</h3>
                      </div>
                      <span className="font-mono tabular-nums text-sm font-semibold text-[#142B2A] whitespace-nowrap shrink-0">
                        {job.package_lpa} LPA
                      </span>
                    </div>

                    <p className="text-xs text-[#5A6B69]">
                      {job.location} · {job.job_type} · Min CGPA {Number(job.min_cgpa).toFixed(1)} · Batch {job.eligible_year}
                    </p>
                    <p className="text-sm text-[#5A6B69] line-clamp-2">{job.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#F5F3EC] flex items-center justify-between text-xs">
                    <span className="text-[#5A6B69]">
                      Eligible: <strong className="text-[#142B2A]">{job.eligible_departments}</strong> · Deadline {job.application_deadline}
                    </span>
                    <Link
                      to="/login"
                      className="font-semibold text-[#176B5B] hover:text-[#142B2A] whitespace-nowrap shrink-0"
                    >
                      Check & Apply →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* About & Placement Architecture */}
        <section id="about" className="bg-[#F5F3EC] border-y border-[#E3E7E4] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <div className="rounded-2xl overflow-hidden border border-[#E3E7E4] bg-white aspect-[4/3]">
                {!aboutImgError ? (
                  <img
                    src="/src/assets/images/campus_interview_room_1795043504921.jpg"
                    alt="Campus placement interview suite"
                    referrerPolicy="no-referrer"
                    onError={() => setAboutImgError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#142B2A] text-white p-8 text-center">
                    <p className="font-display font-semibold">Training & Placement Center</p>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-semibold text-[#176B5B]">About PLACIFY</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#142B2A] [text-wrap:balance]">
                Structured Recruitment Governance for Higher Education
              </h2>
              <p className="text-sm sm:text-base text-[#5A6B69] leading-relaxed">
                PLACIFY replaces fragmented spreadsheets and email threads with a single relational SQL database connecting departments, students, partner companies, drives, interviews, and verified offers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  'Backend-enforced CGPA & department eligibility checks',
                  'Role-separated Administrator and Student portals',
                  'Interview scheduling with automated status progression',
                  'One-click CSV placement reports for academic audits',
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2.5 text-sm text-[#142B2A]">
                    <CheckCircle2 className="w-4 h-4 text-[#176B5B] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact / Campus Recruiting Inquiry */}
        <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-semibold text-[#176B5B]">Recruiter & Campus Desk</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#142B2A]">
                Partner With Our Placement Cell
              </h2>
              <p className="text-sm text-[#5A6B69] leading-relaxed">
                Recruiting teams looking to schedule an upcoming campus drive or technical assessment can submit their details directly to the Training & Placement Office.
              </p>
              <div className="pt-2 space-y-2 text-sm text-[#142B2A]">
                <p><strong className="font-semibold">Email:</strong> placements@placify.edu</p>
                <p><strong className="font-semibold">Office Hours:</strong> Mon – Fri, 09:00 AM – 05:30 PM</p>
              </div>
            </div>

            <div className="lg:col-span-7">
              {contactSubmitted ? (
                <div className="rounded-xl border border-[#37A88A]/40 bg-[#F5F3EC] p-8 space-y-3">
                  <div className="flex items-center gap-2.5 text-[#176B5B] font-semibold font-display">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Inquiry Received</span>
                  </div>
                  <p className="text-sm text-[#5A6B69]">
                    Thank you for reaching out. Our Training & Placement Coordinator will follow up with your recruiting team shortly.
                  </p>
                  <button
                    type="button"
                    onClick={() => setContactSubmitted(false)}
                    className="text-xs font-semibold text-[#176B5B] hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#142B2A] mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Shruti Rao"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#142B2A] mb-1">Work Email</label>
                      <input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                        placeholder="name@company.com"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#142B2A] mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={contactForm.organization}
                      onChange={(e) => setContactForm((f) => ({ ...f, organization: e.target.value }))}
                      placeholder="Organization name"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#142B2A] mb-1">Message</label>
                    <textarea
                      rows={3}
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Share preferred drive dates, target departments, or role requirements..."
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#142B2A] hover:bg-[#176B5B] text-white text-sm font-semibold transition-colors"
                  >
                    Send Inquiry
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
