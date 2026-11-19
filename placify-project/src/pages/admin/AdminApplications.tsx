import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Eye, Search, Upload } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Application, Company, Department } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { CsvImportModal } from '../../components/ui/CsvImportModal';

const STATUS_OPTIONS: Application['status'][] = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

export function AdminApplications() {
  const { showToast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (companyFilter) qs.set('company_id', companyFilter);
      if (deptFilter) qs.set('department_id', deptFilter);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const res = await apiFetch<{ applications: Application[] }>(`/api/admin/applications?${qs.toString()}`);
      setApplications(res.applications);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load applications.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, companyFilter, deptFilter, statusFilter, showToast]);

  useEffect(() => {
    apiFetch<{ companies: Company[] }>('/api/admin/companies').then((r) => setCompanies(r.companies));
    apiFetch<{ departments: Department[] }>('/api/departments').then((r) => setDepartments(r.departments));
  }, []);

  useEffect(() => {
    loadApps();
  }, [loadApps]);

  const updateStatus = async (id: number, status: Application['status']) => {
    try {
      await apiFetch(`/api/admin/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      showToast(`Application updated to ${status}.`);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      if (selectedApp?.id === id) {
        setSelectedApp((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to update status.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Application Management</h1>
          <p className="text-sm text-[#5A6B69]">Review candidate applications across companies, filter by department, and update pipeline stages.</p>
        </div>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-[#142B2A] text-sm font-semibold whitespace-nowrap shrink-0"
        >
          <Upload className="w-4 h-4 text-[#176B5B]" />
          <span>Import CSV</span>
        </button>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, roll ID, role..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="ALL">All Statuses</option>
          {STATUS_OPTIONS.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <ClipboardList className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No applications match the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Dept & CGPA</th>
                  <th className="px-4 py-3 font-semibold">Company & Job Role</th>
                  <th className="px-4 py-3 font-semibold">Applied Date</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {applications.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F5F3EC]/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#142B2A]">{a.student_name}</p>
                      <p className="text-xs font-mono text-[#5A6B69]">{a.roll_number}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-medium text-[#142B2A]">{a.department_code}</span> ·{' '}
                      <span className="font-mono tabular-nums">{Number(a.cgpa).toFixed(2)} CGPA</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#142B2A]">{a.job_title}</p>
                      <p className="text-xs text-[#5A6B69]">
                        {a.company_name} · {a.package_lpa} LPA
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#5A6B69]">
                      {String(a.applied_at).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label={`Update status for ${a.student_name}`}
                        value={a.status}
                        onChange={(e) => updateStatus(a.id, e.target.value as Application['status'])}
                        className="px-2.5 py-1.5 rounded-lg border border-[#E3E7E4] text-xs font-semibold bg-white text-[#142B2A] focus:outline-none focus:border-[#176B5B]"
                      >
                        {STATUS_OPTIONS.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(a)}
                        title="View application details"
                        className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={Boolean(selectedApp)}
        onClose={() => setSelectedApp(null)}
        title="Application Details"
        subtitle={selectedApp ? `${selectedApp.student_name} (${selectedApp.roll_number})` : ''}
      >
        {selectedApp && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-[#E3E7E4]">
              <div>
                <p className="text-xs text-[#5A6B69]">Company</p>
                <p className="font-semibold text-[#142B2A]">{selectedApp.company_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Role & Package</p>
                <p className="font-semibold text-[#142B2A]">
                  {selectedApp.job_title} ({selectedApp.package_lpa} LPA)
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Department & CGPA</p>
                <p className="text-[#142B2A]">
                  {selectedApp.department_name} · {Number(selectedApp.cgpa).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Current Stage</p>
                <p className="font-semibold text-[#176B5B]">{selectedApp.status}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6B69]">Student Skills</p>
              <p className="text-[#142B2A] mt-1">{selectedApp.student_skills || 'None listed'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6B69]">Cover Note</p>
              <p className="text-[#142B2A] mt-1 bg-[#F5F3EC] rounded-lg p-3 text-xs leading-relaxed">
                {selectedApp.cover_note || 'No cover note provided.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Applications from CSV"
        subtitle="Bulk upload student job applications by roll number, company name, and job title"
        endpoint="/api/admin/applications/import-csv"
        templateFilename="placify-applications-template.csv"
        columnsHint="roll_number, company_name, job_title, status, cover_note, applied_at"
        templateContent={`roll_number,company_name,job_title,status,cover_note,applied_at\nCS2026001,Razorpay Systems,Software Development Engineer I,Interview,"Full-stack Node.js and React builder.",2026-11-10 10:15:00`}
        onImported={loadApps}
      />
    </div>
  );
}

