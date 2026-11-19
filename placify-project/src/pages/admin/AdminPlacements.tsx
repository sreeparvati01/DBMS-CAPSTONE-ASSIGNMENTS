import React, { useCallback, useEffect, useState } from 'react';
import { Award, Download, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { apiFetch, ApiError, downloadWithAuth } from '../../lib/api';
import type { Company, Department, JobOpening, Placement, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CsvImportModal } from '../../components/ui/CsvImportModal';

const emptyPlacement = {
  student_id: '',
  company_id: '',
  job_id: '',
  job_role: '',
  package_lpa: '10.0',
  placement_date: new Date().toISOString().slice(0, 10),
  academic_year: '2025-26',
  status: 'Offer Accepted' as Placement['status'],
};

export function AdminPlacements() {
  const { showToast } = useToast();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyPlacement);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Placement | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadPlacements = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (deptFilter) qs.set('department_id', deptFilter);
      if (companyFilter) qs.set('company_id', companyFilter);
      if (yearFilter !== 'ALL') qs.set('academic_year', yearFilter);
      const res = await apiFetch<{ placements: Placement[] }>(`/api/admin/placements?${qs.toString()}`);
      setPlacements(res.placements);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load placements.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, companyFilter, yearFilter, showToast]);

  useEffect(() => {
    apiFetch<{ students: Student[] }>('/api/admin/students').then((r) => setStudents(r.students));
    apiFetch<{ companies: Company[] }>('/api/admin/companies').then((r) => setCompanies(r.companies));
    apiFetch<{ departments: Department[] }>('/api/departments').then((r) => setDepartments(r.departments));
    apiFetch<{ jobs: JobOpening[] }>('/api/admin/jobs').then((r) => setJobs(r.jobs));
  }, []);

  useEffect(() => {
    loadPlacements();
  }, [loadPlacements]);

  const openAdd = () => {
    setEditingId(null);
    const unplaced = students.find((s) => s.placement_status !== 'Placed') || students[0];
    setForm({
      ...emptyPlacement,
      student_id: unplaced ? String(unplaced.id) : '',
      company_id: companies[0] ? String(companies[0].id) : '',
    });
    setModalOpen(true);
  };

  const openEdit = (p: Placement) => {
    setEditingId(p.id);
    setForm({
      student_id: String(p.student_id),
      company_id: String(p.company_id),
      job_id: p.job_id ? String(p.job_id) : '',
      job_role: p.job_role,
      package_lpa: String(p.package_lpa),
      placement_date: p.placement_date,
      academic_year: p.academic_year,
      status: p.status,
    });
    setModalOpen(true);
  };

  const handleJobSelect = (jobId: string) => {
    const matched = jobs.find((j) => String(j.id) === jobId);
    setForm((prev) => ({
      ...prev,
      job_id: jobId,
      company_id: matched ? String(matched.company_id) : prev.company_id,
      job_role: matched ? matched.title : prev.job_role,
      package_lpa: matched ? String(matched.package_lpa) : prev.package_lpa,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        student_id: Number(form.student_id),
        company_id: Number(form.company_id),
        job_id: form.job_id ? Number(form.job_id) : null,
        package_lpa: Number(form.package_lpa),
      };
      if (editingId) {
        await apiFetch(`/api/admin/placements/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Placement record updated.');
      } else {
        await apiFetch('/api/admin/placements', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Placement offer recorded.');
      }
      setModalOpen(false);
      loadPlacements();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save placement record.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/placements/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Placement record removed.');
      setDeleteTarget(null);
      loadPlacements();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete placement.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCsvExport = async () => {
    try {
      await downloadWithAuth('/api/admin/reports/export?type=placements', 'placify-placements-report.csv');
      showToast('Placements CSV downloaded.');
    } catch {
      showToast('Failed to export placements CSV.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Placement Management</h1>
          <p className="text-sm text-[#5A6B69]">Record confirmed student offers, track packages, and prevent duplicate placements.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-xs font-semibold text-[#142B2A] whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-[#176B5B]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleCsvExport}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-xs font-semibold text-[#142B2A] whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-[#176B5B]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Placement</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, company, role..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
          ))}
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="">All Companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="ALL">All Academic Years</option>
          <option value="2025-26">2025-26</option>
          <option value="2024-25">2024-25</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : placements.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Award className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No placement records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Company & Role</th>
                  <th className="px-4 py-3 font-semibold text-right">Package</th>
                  <th className="px-4 py-3 font-semibold">Date & Year</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {placements.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F3EC]/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#142B2A]">{p.student_name}</p>
                      <p className="text-xs font-mono text-[#5A6B69]">{p.roll_number}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#142B2A]">{p.department_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#142B2A]">{p.company_name}</p>
                      <p className="text-xs text-[#5A6B69]">{p.job_role}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-[#176B5B]">
                      {p.package_lpa} LPA
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-[#5A6B69]">
                      <p>{p.placement_date}</p>
                      <p>{p.academic_year}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-[#142B2A]">{p.status}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(p)} title="Edit placement" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(p)} title="Remove placement" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Placement Record' : 'Record Student Placement'} maxWidthClass="max-w-xl">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Student</label>
            <select
              required
              disabled={Boolean(editingId)}
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white disabled:bg-[#F5F3EC]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.roll_number}) — {s.department_code} [{s.placement_status}]
                </option>
              ))}
            </select>
          </div>
          {!editingId && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Auto-fill from Job Opening (Optional)</label>
              <select value={form.job_id} onChange={(e) => handleJobSelect(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
                <option value="">Manual entry</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>{j.company_name} — {j.title} ({j.package_lpa} LPA)</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Company</label>
            <select required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Job Role</label>
            <input type="text" required value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Package (LPA)</label>
            <input type="number" step="0.1" min="0" required value={form.package_lpa} onChange={(e) => setForm({ ...form, package_lpa: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Placement Date</label>
            <input type="date" required value={form.placement_date} onChange={(e) => setForm({ ...form, placement_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Academic Year</label>
            <input type="text" required value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2025-26" className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Offer Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Placement['status'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Offer Accepted">Offer Accepted</option>
              <option value="Offer Pending">Offer Pending</option>
              <option value="Joined">Joined</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {saving ? 'Saving...' : 'Save Placement'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Remove Placement Record"
        message={`Remove confirmed placement record for ${deleteTarget?.student_name} at ${deleteTarget?.company_name}?`}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Placements from CSV"
        subtitle="Bulk upload confirmed student offers (automatically marks matched students as Placed)"
        endpoint="/api/admin/placements/import-csv"
        templateFilename="placify-placements-template.csv"
        columnsHint="roll_number, company_name, job_role, package_lpa, placement_date, academic_year, status"
        templateContent={`roll_number,company_name,job_role,package_lpa,placement_date,academic_year,status\nCS2026002,Freshworks Inc.,Software Engineer — Cloud Product,14.5,2026-10-20,2025-26,Offer Accepted\nIT2026003,Infosys Technologies,Specialist Programmer,9.5,2026-09-28,2025-26,Offer Accepted`}
        onImported={loadPlacements}
      />
    </div>
  );
}

