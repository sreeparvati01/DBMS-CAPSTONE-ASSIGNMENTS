import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Application, Company, PlacementDrive, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const emptyDrive = {
  title: '',
  company_id: '',
  job_role: '',
  drive_date: '',
  registration_deadline: '',
  venue: '',
  description: '',
  min_cgpa: '7.0',
  eligible_departments: 'CSE,IT',
  eligible_year: '2026',
  status: 'Upcoming' as PlacementDrive['status'],
};

export function AdminDrives() {
  const { showToast } = useToast();
  const [drives, setDrives] = useState<PlacementDrive[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyDrive);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlacementDrive | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [candidatesModal, setCandidatesModal] = useState<{
    drive: PlacementDrive;
    eligibleStudents: Student[];
    applicants: Application[];
  } | null>(null);

  const loadDrives = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const res = await apiFetch<{ drives: PlacementDrive[] }>(`/api/admin/drives?${qs.toString()}`);
      setDrives(res.drives);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load placement drives.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    apiFetch<{ companies: Company[] }>('/api/admin/companies').then((r) => setCompanies(r.companies));
  }, []);

  useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyDrive, company_id: companies[0] ? String(companies[0].id) : '' });
    setModalOpen(true);
  };

  const openEdit = (d: PlacementDrive) => {
    setEditingId(d.id);
    setForm({
      title: d.title,
      company_id: String(d.company_id),
      job_role: d.job_role,
      drive_date: d.drive_date,
      registration_deadline: d.registration_deadline,
      venue: d.venue,
      description: d.description || '',
      min_cgpa: String(d.min_cgpa),
      eligible_departments: d.eligible_departments,
      eligible_year: String(d.eligible_year),
      status: d.status,
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
        min_cgpa: Number(form.min_cgpa),
        eligible_year: Number(form.eligible_year),
      };
      if (editingId) {
        await apiFetch(`/api/admin/drives/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Placement drive updated.');
      } else {
        await apiFetch('/api/admin/drives', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Placement drive created.');
      }
      setModalOpen(false);
      loadDrives();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save drive.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/drives/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Placement drive deleted.');
      setDeleteTarget(null);
      loadDrives();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete drive.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const viewCandidates = async (driveId: number) => {
    try {
      const res = await apiFetch<{
        drive: PlacementDrive;
        eligibleStudents: Student[];
        applicants: Application[];
      }>(`/api/admin/drives/${driveId}/candidates`);
      setCandidatesModal(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load candidates.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Placement Drives</h1>
          <p className="text-sm text-[#5A6B69]">Schedule campus recruitment drives, registration cutoffs, and eligible student rosters.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Drive</span>
        </button>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drive title, company, or role..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white"
        >
          <option value="ALL">All Statuses</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white border border-[#E3E7E4] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : drives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E3E7E4] bg-white p-12 text-center space-y-2">
          <CalendarClock className="w-8 h-8 text-[#5A6B69] mx-auto" />
          <p className="font-display font-semibold text-[#142B2A]">No placement drives found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {drives.map((d) => (
            <div key={d.id} className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#176B5B]">
                      {d.company_name} · {d.status}
                    </p>
                    <h2 className="font-display font-semibold text-lg text-[#142B2A]">{d.title}</h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => viewCandidates(d.id)}
                      title="View eligible & applicants"
                      className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(d)}
                      title="Edit drive"
                      className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(d)}
                      title="Delete drive"
                      className="p-1.5 rounded-lg text-[#5A6B69] hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#5A6B69]">
                  Role: <strong className="text-[#142B2A]">{d.job_role}</strong> · Venue: {d.venue}
                </p>
                <p className="text-xs text-[#5A6B69]">
                  Drive Date: <strong className="font-mono text-[#142B2A]">{d.drive_date}</strong> · Deadline:{' '}
                  <strong className="font-mono text-[#142B2A]">{d.registration_deadline}</strong>
                </p>
                <p className="text-sm text-[#5A6B69]">{d.description}</p>
              </div>

              <div className="pt-3 border-t border-[#F5F3EC] flex items-center justify-between text-xs text-[#5A6B69]">
                <span>
                  Criteria: CGPA ≥ {Number(d.min_cgpa).toFixed(1)} · {d.eligible_departments} ({d.eligible_year})
                </span>
                <button
                  type="button"
                  onClick={() => viewCandidates(d.id)}
                  className="font-semibold text-[#176B5B] hover:underline whitespace-nowrap"
                >
                  Eligible & Applicants ({d.applicants_count ?? 0})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Placement Drive' : 'Create Placement Drive'} maxWidthClass="max-w-2xl">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Drive Title</label>
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
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Job Role</label>
            <input type="text" required value={form.job_role} onChange={(e) => setForm({ ...form, job_role: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Drive Date</label>
            <input type="date" required value={form.drive_date} onChange={(e) => setForm({ ...form, drive_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Registration Deadline</label>
            <input type="date" required value={form.registration_deadline} onChange={(e) => setForm({ ...form, registration_deadline: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Venue</label>
            <input type="text" required value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlacementDrive['status'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Min CGPA</label>
            <input type="number" step="0.1" min="0" max="10" value={form.min_cgpa} onChange={(e) => setForm({ ...form, min_cgpa: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Eligible Departments (e.g. CSE,IT or ALL)</label>
            <input type="text" value={form.eligible_departments} onChange={(e) => setForm({ ...form, eligible_departments: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Eligible Batch Year</label>
            <input type="number" value={form.eligible_year} onChange={(e) => setForm({ ...form, eligible_year: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {saving ? 'Saving...' : 'Save Drive'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(candidatesModal)}
        onClose={() => setCandidatesModal(null)}
        title={candidatesModal?.drive.title || 'Drive Roster'}
        subtitle={candidatesModal ? `${candidatesModal.drive.company_name} · Criteria CGPA ≥ ${candidatesModal.drive.min_cgpa}` : ''}
        maxWidthClass="max-w-2xl"
      >
        {candidatesModal && (
          <div className="space-y-5 text-sm">
            <div>
              <p className="text-xs font-semibold text-[#176B5B] mb-2">
                Eligible Students ({candidatesModal.eligibleStudents.length})
              </p>
              <div className="max-h-48 overflow-y-auto divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
                {candidatesModal.eligibleStudents.map((s) => (
                  <div key={s.id} className="px-3 py-2 flex items-center justify-between text-xs">
                    <span>
                      <strong>{s.full_name}</strong> ({s.roll_number}) · {s.department_code}
                    </span>
                    <span className="font-mono">CGPA {Number(s.cgpa).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#142B2A] mb-2">
                Registered Applicants ({candidatesModal.applicants.length})
              </p>
              {candidatesModal.applicants.length === 0 ? (
                <p className="text-xs text-[#5A6B69]">No registered applicants linked to this drive yet.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
                  {candidatesModal.applicants.map((a) => (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span>
                        <strong>{a.student_name}</strong> ({a.roll_number}) · {a.job_title}
                      </span>
                      <span className="font-semibold text-[#176B5B]">{a.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Placement Drive"
        message={`Delete "${deleteTarget?.title}"? Linked job openings will remain available without a drive reference.`}
      />
    </div>
  );
}
