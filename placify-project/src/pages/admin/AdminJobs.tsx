import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Company, JobOpening, PlacementDrive } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CsvImportModal } from '../../components/ui/CsvImportModal';

const emptyJob = {
  company_id: '',
  drive_id: '',
  title: '',
  job_type: 'Full-Time' as JobOpening['job_type'],
  package_lpa: '10.0',
  location: '',
  description: '',
  min_cgpa: '7.0',
  eligible_departments: 'CSE,IT',
  eligible_year: '2026',
  required_skills: '',
  application_deadline: '',
  status: 'Open' as JobOpening['status'],
};

export function AdminJobs() {
  const { showToast } = useToast();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<JobOpening | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const res = await apiFetch<{ jobs: JobOpening[] }>(`/api/admin/jobs?${qs.toString()}`);
      setJobs(res.jobs);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load job openings.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    apiFetch<{ companies: Company[] }>('/api/admin/companies').then((r) => setCompanies(r.companies));
    apiFetch<{ drives: PlacementDrive[] }>('/api/admin/drives').then((r) => setDrives(r.drives));
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyJob, company_id: companies[0] ? String(companies[0].id) : '' });
    setModalOpen(true);
  };

  const openEdit = (j: JobOpening) => {
    setEditingId(j.id);
    setForm({
      company_id: String(j.company_id),
      drive_id: j.drive_id ? String(j.drive_id) : '',
      title: j.title,
      job_type: j.job_type,
      package_lpa: String(j.package_lpa),
      location: j.location,
      description: j.description || '',
      min_cgpa: String(j.min_cgpa),
      eligible_departments: j.eligible_departments,
      eligible_year: String(j.eligible_year),
      required_skills: j.required_skills || '',
      application_deadline: j.application_deadline,
      status: j.status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        company_id: Number(form.company_id),
        drive_id: form.drive_id ? Number(form.drive_id) : null,
        package_lpa: Number(form.package_lpa),
        min_cgpa: Number(form.min_cgpa),
        eligible_year: Number(form.eligible_year),
      };
      if (editingId) {
        await apiFetch(`/api/admin/jobs/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Job opening updated.');
      } else {
        await apiFetch('/api/admin/jobs', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Job opening published.');
      }
      setModalOpen(false);
      loadJobs();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save job opening.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/jobs/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Job opening deleted.');
      setDeleteTarget(null);
      loadJobs();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete job opening.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Job Openings</h1>
          <p className="text-sm text-[#5A6B69]">Create and manage compensation packages, eligibility rules, and deadlines.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-[#142B2A] text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4 text-[#176B5B]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Job Opening</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job title, company, location, or skills..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="ALL">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Briefcase className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No job openings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role & Company</th>
                  <th className="px-4 py-3 font-semibold">Location & Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Package</th>
                  <th className="px-4 py-3 font-semibold">Eligibility</th>
                  <th className="px-4 py-3 font-semibold text-right">Applicants</th>
                  <th className="px-4 py-3 font-semibold">Deadline</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#F5F3EC]/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#142B2A]">{j.title}</p>
                      <p className="text-xs text-[#5A6B69]">
                        {j.company_name} {j.drive_title ? `· ${j.drive_title}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A6B69]">
                      {j.location} · {j.job_type}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#176B5B]">
                      {j.package_lpa} LPA
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A6B69]">
                      CGPA ≥ {Number(j.min_cgpa).toFixed(1)} · {j.eligible_departments} ({j.eligible_year})
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{j.applications_count ?? 0}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-mono">{j.application_deadline}</span>
                      <span className={`block font-semibold ${j.status === 'Open' ? 'text-[#176B5B]' : 'text-[#5A6B69]'}`}>
                        {j.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(j)} title="Edit job" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(j)} title="Delete job" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-red-700 hover:bg-red-50">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Job Opening' : 'Create Job Opening'} maxWidthClass="max-w-2xl">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Job Title</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Company</label>
            <select required value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Placement Drive (Optional)</label>
            <select value={form.drive_id} onChange={(e) => setForm({ ...form, drive_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="">Independent / Direct Opening</option>
              {drives.map((d) => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Job Type</label>
            <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value as JobOpening['job_type'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Full-Time">Full-Time</option>
              <option value="Internship + PPO">Internship + PPO</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Package (LPA)</label>
            <input type="number" step="0.1" min="0" required value={form.package_lpa} onChange={(e) => setForm({ ...form, package_lpa: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Location</label>
            <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Application Deadline</label>
            <input type="date" required value={form.application_deadline} onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Minimum CGPA</label>
            <input type="number" step="0.1" min="0" max="10" required value={form.min_cgpa} onChange={(e) => setForm({ ...form, min_cgpa: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Eligible Departments (e.g. CSE,IT or ALL)</label>
            <input type="text" required value={form.eligible_departments} onChange={(e) => setForm({ ...form, eligible_departments: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Eligible Batch Year</label>
            <input type="number" required value={form.eligible_year} onChange={(e) => setForm({ ...form, eligible_year: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobOpening['status'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Required Skills (comma-separated)</label>
            <input type="text" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} placeholder="e.g. TypeScript, React, SQL" className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Role Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {saving ? 'Saving...' : 'Save Job'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Job Opening"
        message={`Delete "${deleteTarget?.title}" at ${deleteTarget?.company_name}? Associated applications will also be deleted.`}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Job Openings from CSV"
        subtitle="Bulk upload job openings matched to existing recruiting companies"
        endpoint="/api/admin/jobs/import-csv"
        templateFilename="placify-jobs-template.csv"
        columnsHint="company_name, title, job_type, package_lpa, location, min_cgpa, eligible_departments, eligible_year, required_skills, application_deadline, status"
        templateContent={`company_name,title,job_type,package_lpa,location,min_cgpa,eligible_departments,eligible_year,required_skills,application_deadline,status\nRazorpay Systems,Software Development Engineer I,Full-Time,18.5,Bengaluru,8.0,"CSE,IT",2026,"TypeScript, React, SQL",2026-12-15,Open\nZoho Corporation,Member Technical Staff,Full-Time,10.5,Chennai,7.0,"CSE,IT,ECE",2026,"Java, SQL, JavaScript",2026-12-20,Open`}
        onImported={loadJobs}
      />
    </div>
  );
}

