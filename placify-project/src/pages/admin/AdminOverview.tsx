import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  IndianRupee,
  TrendingUp,
  Users,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { AdminDashboardData } from '../../types';
import { DeptPlacementChart, DonutChart, SimpleBarChart, TrendLineChart } from '../../components/ui/Charts';

const statusColors: Record<string, string> = {
  Applied: '#5A6B69',
  Shortlisted: '#D8A85B',
  Interview: '#37A88A',
  Selected: '#176B5B',
  Rejected: '#B91C1C',
};

export function AdminOverview() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    apiFetch<AdminDashboardData>('/api/admin/dashboard')
      .then(setData)
      .catch((err) => setError(err.message || 'Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white border border-[#E3E7E4] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center space-y-2">
        <p className="font-display font-semibold text-red-800">Unable to load Admin Dashboard</p>
        <p className="text-sm text-[#5A6B69]">{error}</p>
      </div>
    );
  }

  const { stats, charts, recent } = data;

  const kpis = [
    { label: 'Registered Students', value: stats.totalStudents, icon: Users, to: '/admin/students' },
    { label: 'Partner Companies', value: stats.totalCompanies, icon: Building2, to: '/admin/companies' },
    { label: 'Placement Drives', value: stats.totalDrives, icon: CalendarClock, to: '/admin/drives' },
    { label: 'Job Openings', value: stats.totalJobs, icon: Briefcase, to: '/admin/jobs' },
    { label: 'Total Applications', value: stats.totalApplications, icon: ClipboardList, to: '/admin/applications' },
    { label: 'Students Placed', value: stats.totalPlaced, icon: Award, to: '/admin/placements' },
    { label: 'Placement Rate', value: `${stats.placementPercentage}%`, icon: TrendingUp, to: '/admin/reports' },
    { label: 'Average Package', value: `${stats.avgPackage} LPA`, icon: IndianRupee, to: '/admin/placements' },
    { label: 'Highest Package', value: `${stats.highestPackage} LPA`, icon: Award, to: '/admin/placements' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Placement Cell Overview</h1>
          <p className="text-sm text-[#5A6B69] mt-0.5">
            Live database metrics, placement distributions, and recent recruitment activity.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/students"
            className="px-3.5 py-2 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-xs font-semibold text-[#142B2A] transition-colors"
          >
            Manage Students
          </Link>
          <Link
            to="/admin/reports"
            className="px-3.5 py-2 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-xs font-semibold transition-colors"
          >
            View Full Reports
          </Link>
        </div>
      </div>

      {/* 9 Real Database KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              to={kpi.to}
              className="rounded-xl border border-[#E3E7E4] bg-white p-5 flex items-center justify-between hover:border-[#176B5B]/60 transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-[#5A6B69]">{kpi.label}</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#142B2A] mt-1">{kpi.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#F5F3EC] text-[#176B5B] flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* 6 Real-Data Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Department-wise Student Distribution
            </h2>
            <p className="text-xs text-[#5A6B69]">Registered students grouped by academic department</p>
          </div>
          <SimpleBarChart
            data={charts.deptStudentDist.map((d) => ({
              label: `${d.code} — ${d.name}`,
              value: d.count,
            }))}
            barColor="#142B2A"
          />
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Department-wise Placement Performance
            </h2>
            <p className="text-xs text-[#5A6B69]">Placed count vs total students and placement rate</p>
          </div>
          <DeptPlacementChart
            data={charts.deptPlacementPerf.map((d) => ({
              label: d.code,
              total: d.total,
              placed: d.placed,
              rate: d.rate,
            }))}
          />
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Application Status Distribution
            </h2>
            <p className="text-xs text-[#5A6B69]">Current pipeline breakdown across all student applications</p>
          </div>
          <DonutChart
            centerLabel="Applications"
            data={charts.applicationStatusDist.map((item) => ({
              label: item.status,
              value: item.count,
              color: statusColors[item.status] || '#37A88A',
            }))}
          />
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Company-wise Student Placements
            </h2>
            <p className="text-xs text-[#5A6B69]">Confirmed offers by recruiting partner</p>
          </div>
          <SimpleBarChart
            data={charts.companyPlacements.map((c) => ({
              label: c.company,
              value: c.placedCount,
              sublabel: `${c.avgPackage} LPA avg`,
            }))}
            unit=" hires"
            barColor="#176B5B"
          />
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Year-wise Placement Statistics
            </h2>
            <p className="text-xs text-[#5A6B69]">Offers and package benchmarks across academic years</p>
          </div>
          {charts.yearWisePlacements.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-[#5A6B69] border border-dashed border-[#E3E7E4] rounded-xl">
              No yearly placement data recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                    <th className="py-2 font-medium">Academic Year</th>
                    <th className="py-2 font-medium text-right">Placed</th>
                    <th className="py-2 font-medium text-right">Avg Package</th>
                    <th className="py-2 font-medium text-right">Highest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F3EC]">
                  {charts.yearWisePlacements.map((yr) => (
                    <tr key={yr.academicYear}>
                      <td className="py-2.5 font-medium text-[#142B2A]">{yr.academicYear}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{yr.placedCount}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums">{yr.avgPackage} LPA</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-[#176B5B] font-semibold">
                        {yr.highestPackage} LPA
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-base text-[#142B2A]">
              Average Package Trend (LPA)
            </h2>
            <p className="text-xs text-[#5A6B69]">Monthly average compensation across confirmed offers</p>
          </div>
          <TrendLineChart
            data={charts.packageTrend.map((p) => ({
              label: p.month,
              value: p.avgPackage,
              sublabel: `${p.offers} offer${p.offers === 1 ? '' : 's'}`,
            }))}
          />
        </div>
      </div>

      {/* Recent Activity & Upcoming Drives */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Upcoming & Ongoing Drives</h2>
            <Link to="/admin/drives" className="text-xs font-semibold text-[#176B5B] hover:underline">
              Manage Drives
            </Link>
          </div>
          {recent.upcomingDrives.length === 0 ? (
            <p className="text-sm text-[#5A6B69]">No upcoming placement drives scheduled.</p>
          ) : (
            <div className="divide-y divide-[#F5F3EC]">
              {recent.upcomingDrives.map((drive) => (
                <div key={drive.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-[#142B2A]">{drive.title}</p>
                    <p className="text-xs text-[#5A6B69] mt-0.5">
                      {drive.company_name} · {drive.job_role} · {drive.venue}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono tabular-nums text-xs font-semibold text-[#176B5B]">{drive.drive_date}</p>
                    <p className="text-[11px] text-[#5A6B69]">{drive.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Recent Applications</h2>
            <Link to="/admin/applications" className="text-xs font-semibold text-[#176B5B] hover:underline">
              View All
            </Link>
          </div>
          {recent.recentApplications.length === 0 ? (
            <p className="text-sm text-[#5A6B69]">No applications recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#F5F3EC]">
              {recent.recentApplications.map((app) => (
                <div key={app.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#142B2A] truncate">
                      {app.student_name} <span className="text-xs font-mono text-[#5A6B69]">({app.roll_number})</span>
                    </p>
                    <p className="text-xs text-[#5A6B69] truncate">
                      {app.company_name} · {app.job_title}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#176B5B] shrink-0">{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Recently Added Students</h2>
            <Link to="/admin/students" className="text-xs font-semibold text-[#176B5B] hover:underline">
              All Students
            </Link>
          </div>
          <div className="divide-y divide-[#F5F3EC]">
            {recent.recentStudents.map((st) => (
              <div key={st.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                <div>
                  <p className="font-medium text-[#142B2A]">{st.full_name}</p>
                  <p className="text-xs text-[#5A6B69]">
                    {st.roll_number} · {st.department_code} · Batch {st.graduation_year}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-xs font-semibold text-[#142B2A]">
                  CGPA {Number(st.cgpa).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Recent Placement Activity</h2>
            <Link to="/admin/placements" className="text-xs font-semibold text-[#176B5B] hover:underline">
              All Placements
            </Link>
          </div>
          {recent.recentPlacements.length === 0 ? (
            <p className="text-sm text-[#5A6B69]">No placement offers recorded yet.</p>
          ) : (
            <div className="divide-y divide-[#F5F3EC]">
              {recent.recentPlacements.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium text-[#142B2A]">{p.student_name}</p>
                    <p className="text-xs text-[#5A6B69]">
                      {p.company_name} · {p.job_role}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono tabular-nums text-xs font-bold text-[#176B5B]">{p.package_lpa} LPA</p>
                    <p className="text-[11px] text-[#5A6B69]">{p.placement_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
