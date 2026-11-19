import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { apiFetch, ApiError, downloadWithAuth } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface ReportsResponse {
  overall: {
    totalStudents: number;
    totalPlaced: number;
    totalCompanies: number;
    totalApplications: number;
    avgPackage: number;
    highestPackage: number;
    lowestPackage: number;
  };
  departmentReport: Array<{
    code: string;
    name: string;
    total_students: number;
    placed_students: number;
    avg_package: number;
    max_package: number;
  }>;
  companyReport: Array<{
    name: string;
    industry: string;
    location: string;
    open_roles: number;
    total_hires: number;
    avg_package: number;
    max_package: number;
  }>;
  applicationStatusReport: Array<{ status: string; count: number }>;
  yearReport: Array<{
    academic_year: string;
    total_placed: number;
    avg_package: number;
    highest_package: number;
    lowest_package: number;
  }>;
}

export function AdminReports() {
  const { showToast } = useToast();
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<ReportsResponse>('/api/admin/reports')
      .then(setData)
      .catch((err) => showToast(err instanceof ApiError ? err.message : 'Failed to load reports.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const exportCsv = async (type: 'placements' | 'students' | 'departments') => {
    try {
      await downloadWithAuth(`/api/admin/reports/export?type=${type}`, `placify-${type}-report.csv`);
      showToast(`Exported ${type} CSV report.`);
    } catch {
      showToast('CSV export failed.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-white border border-[#E3E7E4] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-[#E3E7E4] bg-white p-10 text-center text-sm text-[#5A6B69]">
        Reports are unavailable right now.
      </div>
    );
  }

  const placementPct =
    data.overall.totalStudents > 0
      ? ((data.overall.totalPlaced / data.overall.totalStudents) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Reports & Analytics</h1>
          <p className="text-sm text-[#5A6B69]">Real-time placement statistics aggregated from SQL records with CSV audit exports.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportCsv('placements')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Placements CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportCsv('departments')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-[#142B2A] text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#176B5B]" />
            <span>Department CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportCsv('students')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-[#142B2A] text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#176B5B]" />
            <span>Students CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Students', val: data.overall.totalStudents },
          { label: 'Students Placed', val: data.overall.totalPlaced },
          { label: 'Placement Rate', val: `${placementPct}%` },
          { label: 'Average CTC', val: `${data.overall.avgPackage} LPA` },
          { label: 'Highest CTC', val: `${data.overall.highestPackage} LPA` },
          { label: 'Lowest CTC', val: `${data.overall.lowestPackage} LPA` },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-[#E3E7E4] bg-white p-4">
            <p className="text-xs text-[#5A6B69]">{item.label}</p>
            <p className="text-xl font-bold font-mono tabular-nums text-[#142B2A] mt-1">{item.val}</p>
          </div>
        ))}
      </div>

      {/* Department Report */}
      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3E7E4]">
          <h2 className="font-display font-semibold text-base text-[#142B2A]">Department-wise Placement Report</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
              <tr>
                <th className="px-4 py-3 font-semibold">Department</th>
                <th className="px-4 py-3 font-semibold text-right">Registered</th>
                <th className="px-4 py-3 font-semibold text-right">Placed</th>
                <th className="px-4 py-3 font-semibold text-right">Placement %</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Package</th>
                <th className="px-4 py-3 font-semibold text-right">Highest Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F3EC]">
              {data.departmentReport.map((d) => {
                const rate = d.total_students > 0 ? ((d.placed_students / d.total_students) * 100).toFixed(1) : '0.0';
                return (
                  <tr key={d.code}>
                    <td className="px-4 py-3 font-medium text-[#142B2A]">{d.code} — {d.name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{d.total_students}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#176B5B]">{d.placed_students}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{rate}%</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{d.avg_package} LPA</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{d.max_package} LPA</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Report */}
      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E3E7E4]">
          <h2 className="font-display font-semibold text-base text-[#142B2A]">Company-wise Placement Report</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
              <tr>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Industry & Location</th>
                <th className="px-4 py-3 font-semibold text-right">Roles</th>
                <th className="px-4 py-3 font-semibold text-right">Total Hires</th>
                <th className="px-4 py-3 font-semibold text-right">Avg Package</th>
                <th className="px-4 py-3 font-semibold text-right">Max Package</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F3EC]">
              {data.companyReport.map((c) => (
                <tr key={c.name}>
                  <td className="px-4 py-3 font-medium text-[#142B2A]">{c.name}</td>
                  <td className="px-4 py-3 text-xs text-[#5A6B69]">{c.industry} · {c.location}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.open_roles}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#176B5B]">{c.total_hires}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.avg_package} LPA</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.max_package} LPA</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Year-wise & Application Pipeline Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3E7E4]">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Year-wise Placement Report</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Academic Year</th>
                  <th className="px-4 py-3 font-semibold text-right">Placed</th>
                  <th className="px-4 py-3 font-semibold text-right">Avg CTC</th>
                  <th className="px-4 py-3 font-semibold text-right">Highest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {data.yearReport.map((y) => (
                  <tr key={y.academic_year}>
                    <td className="px-4 py-3 font-medium text-[#142B2A]">{y.academic_year}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{y.total_placed}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{y.avg_package} LPA</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#176B5B] font-semibold">{y.highest_package} LPA</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E3E7E4]">
            <h2 className="font-display font-semibold text-base text-[#142B2A]">Application Pipeline Report</h2>
          </div>
          <div className="p-6 space-y-3">
            {data.applicationStatusReport.map((row) => (
              <div key={row.status} className="flex items-center justify-between py-2 border-b border-[#F5F3EC] last:border-0 text-sm">
                <span className="font-medium text-[#142B2A]">{row.status}</span>
                <span className="font-mono tabular-nums font-semibold text-[#176B5B]">{row.count} applications</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
