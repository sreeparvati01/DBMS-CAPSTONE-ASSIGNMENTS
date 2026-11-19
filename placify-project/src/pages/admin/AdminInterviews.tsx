import React, { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, Video } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Application, Interview, JobOpening, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

const emptyInterview = {
  application_id: '',
  student_id: '',
  job_id: '',
  interview_date: '',
  interview_time: '10:30 AM',
  mode: 'Online' as Interview['mode'],
  location_or_link: '',
  status: 'Scheduled' as Interview['status'],
  result: 'Pending' as Interview['result'],
  feedback: '',
};

export function AdminInterviews() {
  const { showToast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyInterview);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (statusFilter !== 'ALL') qs.set('status', statusFilter);
      const res = await apiFetch<{ interviews: Interview[] }>(`/api/admin/interviews?${qs.toString()}`);
      setInterviews(res.interviews);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load interviews.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, showToast]);

  useEffect(() => {
    apiFetch<{ applications: Application[] }>('/api/admin/applications').then((r) => setApplications(r.applications));
    apiFetch<{ students: Student[] }>('/api/admin/students').then((r) => setStudents(r.students));
    apiFetch<{ jobs: JobOpening[] }>('/api/admin/jobs').then((r) => setJobs(r.jobs));
  }, []);

  useEffect(() => {
    loadInterviews();
  }, [loadInterviews]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyInterview,
      student_id: students[0] ? String(students[0].id) : '',
      job_id: jobs[0] ? String(jobs[0].id) : '',
    });
    setModalOpen(true);
  };

  const openEdit = (i: Interview) => {
    setEditingId(i.id);
    setForm({
      application_id: i.application_id ? String(i.application_id) : '',
      student_id: String(i.student_id),
      job_id: String(i.job_id),
      interview_date: i.interview_date,
      interview_time: i.interview_time,
      mode: i.mode,
      location_or_link: i.location_or_link,
      status: i.status,
      result: i.result,
      feedback: i.feedback || '',
    });
    setModalOpen(true);
  };

  const handleSelectApp = (appId: string) => {
    const matched = applications.find((a) => String(a.id) === appId);
    setForm((prev) => ({
      ...prev,
      application_id: appId,
      student_id: matched ? String(matched.student_id) : prev.student_id,
      job_id: matched ? String(matched.job_id) : prev.job_id,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        application_id: form.application_id ? Number(form.application_id) : null,
        student_id: Number(form.student_id),
        job_id: Number(form.job_id),
      };
      if (editingId) {
        await apiFetch(`/api/admin/interviews/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Interview updated.');
      } else {
        await apiFetch('/api/admin/interviews', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Interview scheduled.');
      }
      setModalOpen(false);
      loadInterviews();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save interview.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/interviews/${deleteTarget.id}`, { method: 'DELETE' });
      showToast('Interview cancelled.');
      setDeleteTarget(null);
      loadInterviews();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to cancel interview.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Interview Management</h1>
          <p className="text-sm text-[#5A6B69]">Schedule candidate interviews, track modes, and record panel evaluations.</p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule Interview</span>
        </button>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate, company, or role..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
          <option value="ALL">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Completed">Completed</option>
          <option value="Rescheduled">Rescheduled</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : interviews.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Video className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No interviews found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Candidate</th>
                  <th className="px-4 py-3 font-semibold">Company & Role</th>
                  <th className="px-4 py-3 font-semibold">Schedule</th>
                  <th className="px-4 py-3 font-semibold">Mode & Venue/Link</th>
                  <th className="px-4 py-3 font-semibold">Status & Result</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {interviews.map((i) => (
                  <tr key={i.id} className="hover:bg-[#F5F3EC]/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#142B2A]">{i.student_name}</p>
                      <p className="text-xs font-mono text-[#5A6B69]">
                        {i.roll_number} · {i.department_code}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#142B2A]">{i.company_name}</p>
                      <p className="text-xs text-[#5A6B69]">{i.job_title}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono tabular-nums">
                      <p className="font-semibold text-[#142B2A]">{i.interview_date}</p>
                      <p className="text-[#5A6B69]">{i.interview_time}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-[#142B2A]">{i.mode}</p>
                      <p className="text-[#5A6B69] max-w-[220px] truncate">{i.location_or_link}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-semibold text-[#142B2A]">{i.status}</p>
                      <p className={i.result === 'Passed' ? 'text-[#176B5B] font-semibold' : i.result === 'Failed' ? 'text-red-700 font-semibold' : 'text-[#5A6B69]'}>
                        Result: {i.result}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(i)} title="Edit interview" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => setDeleteTarget(i)} title="Cancel interview" className="p-1.5 rounded-lg text-[#5A6B69] hover:text-red-700 hover:bg-red-50">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Interview' : 'Schedule Interview'} maxWidthClass="max-w-xl">
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!editingId && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Link Application (Optional)</label>
              <select value={form.application_id} onChange={(e) => handleSelectApp(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
                <option value="">Select manually below</option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.student_name} ({a.roll_number}) — {a.company_name} · {a.job_title} [{a.status}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {!editingId && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Student</label>
                <select required value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#142B2A] mb-1">Job Opening</label>
                <select required value={form.job_id} onChange={(e) => setForm({ ...form, job_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.company_name} — {j.title}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Interview Date</label>
            <input type="date" required value={form.interview_date} onChange={(e) => setForm({ ...form, interview_date: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Interview Time</label>
            <input type="text" required value={form.interview_time} onChange={(e) => setForm({ ...form, interview_time: e.target.value })} placeholder="e.g. 10:30 AM" className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Mode</label>
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as Interview['mode'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Online">Online</option>
              <option value="In-Person">In-Person</option>
              <option value="Hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Interview['status'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Scheduled">Scheduled</option>
              <option value="Completed">Completed</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Location or Meeting Link</label>
            <input type="text" required value={form.location_or_link} onChange={(e) => setForm({ ...form, location_or_link: e.target.value })} placeholder="Room name or https://meet..." className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Result</label>
            <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value as Interview['result'] })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white">
              <option value="Pending">Pending</option>
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Panel Feedback</label>
            <textarea rows={2} value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm" />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {saving ? 'Saving...' : 'Save Interview'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Cancel Interview"
        confirmLabel="Remove Interview"
        message={`Remove the scheduled interview for ${deleteTarget?.student_name} with ${deleteTarget?.company_name}?`}
      />
    </div>
  );
}
