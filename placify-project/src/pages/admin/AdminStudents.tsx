import React, { useCallback, useEffect, useState } from 'react';
import { Eye, Pencil, Plus, Search, Trash2, Upload, Users } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Application, Department, Interview, Placement, Student } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CsvImportModal } from '../../components/ui/CsvImportModal';

const emptyForm = {
  roll_number: '',
  full_name: '',
  email: '',
  phone: '',
  department_id: '',
  course: 'B.Tech',
  graduation_year: '2026',
  cgpa: '8.00',
  skills: '',
  resume_url: '',
  resume_summary: '',
  placement_status: 'Unplaced' as Student['placement_status'],
};

export function AdminStudents() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [minCgpaFilter, setMinCgpaFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [profileDetail, setProfileDetail] = useState<{
    student: Student;
    applications: Application[];
    interviews: Interview[];
    placement: Placement | null;
  } | null>(null);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search) qs.set('search', search);
      if (deptFilter) qs.set('department_id', deptFilter);
      if (yearFilter) qs.set('graduation_year', yearFilter);
      if (minCgpaFilter) qs.set('min_cgpa', minCgpaFilter);
      const res = await apiFetch<{ students: Student[] }>(`/api/admin/students?${qs.toString()}`);
      setStudents(res.students);
      setPage(1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load students.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, deptFilter, yearFilter, minCgpaFilter, showToast]);

  useEffect(() => {
    apiFetch<{ departments: Department[] }>('/api/departments').then((r) => setDepartments(r.departments));
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      department_id: departments[0] ? String(departments[0].id) : '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingId(s.id);
    setForm({
      roll_number: s.roll_number,
      full_name: s.full_name,
      email: s.email,
      phone: s.phone,
      department_id: String(s.department_id),
      course: s.course,
      graduation_year: String(s.graduation_year),
      cgpa: String(s.cgpa),
      skills: s.skills,
      resume_url: s.resume_url || '',
      resume_summary: s.resume_summary || '',
      placement_status: s.placement_status,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
        graduation_year: Number(form.graduation_year),
        cgpa: Number(form.cgpa),
      };
      if (editingId) {
        await apiFetch(`/api/admin/students/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
        showToast('Student profile updated.');
      } else {
        await apiFetch('/api/admin/students', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Student added successfully (default password: Student@123).');
      }
      setModalOpen(false);
      loadStudents();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save student.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/students/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`${deleteTarget.full_name} deleted.`);
      setDeleteTarget(null);
      loadStudents();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete student.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const openProfile = async (id: number) => {
    try {
      const res = await apiFetch<{
        student: Student;
        applications: Application[];
        interviews: Interview[];
        placement: Placement | null;
      }>(`/api/admin/students/${id}`);
      setProfileDetail(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load profile.', 'error');
    }
  };

  const totalPages = Math.max(1, Math.ceil(students.length / pageSize));
  const paginated = students.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Student Management</h1>
          <p className="text-sm text-[#5A6B69]">Add, filter, inspect, and maintain verified student academic profiles.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#E3E7E4] bg-white hover:bg-[#F5F3EC] text-[#142B2A] text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4 text-[#176B5B]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, roll ID, email, or skill..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white focus:outline-none focus:border-[#176B5B]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white focus:outline-none focus:border-[#176B5B]"
        >
          <option value="">All Graduation Years</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </select>
        <select
          value={minCgpaFilter}
          onChange={(e) => setMinCgpaFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white focus:outline-none focus:border-[#176B5B]"
        >
          <option value="">Any CGPA</option>
          <option value="7.0">CGPA ≥ 7.0</option>
          <option value="7.5">CGPA ≥ 7.5</option>
          <option value="8.0">CGPA ≥ 8.0</option>
          <option value="8.5">CGPA ≥ 8.5</option>
          <option value="9.0">CGPA ≥ 9.0</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No students match the current filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Student ID</th>
                    <th className="px-4 py-3 font-semibold">Name & Email</th>
                    <th className="px-4 py-3 font-semibold">Department</th>
                    <th className="px-4 py-3 font-semibold text-right">Batch</th>
                    <th className="px-4 py-3 font-semibold text-right">CGPA</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F3EC]">
                  {paginated.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F5F3EC]/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#142B2A]">{s.roll_number}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#142B2A]">{s.full_name}</p>
                        <p className="text-xs text-[#5A6B69]">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#142B2A]">
                        {s.department_code} · {s.course}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs">{s.graduation_year}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#142B2A]">
                        {Number(s.cgpa).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        <span
                          className={
                            s.placement_status === 'Placed'
                              ? 'text-[#176B5B]'
                              : s.placement_status === 'In Process'
                              ? 'text-[#B45309]'
                              : 'text-[#5A6B69]'
                          }
                        >
                          {s.placement_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openProfile(s.id)}
                            title="View profile"
                            className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            title="Edit student"
                            className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(s)}
                            title="Delete student"
                            className="p-1.5 rounded-lg text-[#5A6B69] hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-[#E3E7E4] flex items-center justify-between text-xs text-[#5A6B69]">
                <span className="font-mono tabular-nums">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, students.length)} of {students.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1 rounded border border-[#E3E7E4] disabled:opacity-40 hover:bg-[#F5F3EC]"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded border border-[#E3E7E4] disabled:opacity-40 hover:bg-[#F5F3EC]"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Student Profile' : 'Add New Student'}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Student / Roll ID</label>
            <input
              type="text"
              required
              value={form.roll_number}
              onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Phone Number</label>
            <input
              type="text"
              required
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Department</label>
            <select
              required
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Course</label>
            <input
              type="text"
              required
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Graduation Year</label>
            <input
              type="number"
              required
              value={form.graduation_year}
              onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">CGPA</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              required
              value={form.cgpa}
              onChange={(e) => setForm({ ...form, cgpa: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Skills (comma-separated)</label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Resume URL</label>
            <input
              type="text"
              value={form.resume_url}
              onChange={(e) => setForm({ ...form, resume_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Placement Status</label>
            <select
              value={form.placement_status}
              onChange={(e) => setForm({ ...form, placement_status: e.target.value as Student['placement_status'] })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm bg-white"
            >
              <option value="Unplaced">Unplaced</option>
              <option value="In Process">In Process</option>
              <option value="Placed">Placed</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Resume / Academic Summary</label>
            <textarea
              rows={2}
              value={form.resume_summary}
              onChange={(e) => setForm({ ...form, resume_summary: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium text-[#142B2A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Profile Detail Modal */}
      <Modal
        open={Boolean(profileDetail)}
        onClose={() => setProfileDetail(null)}
        title={profileDetail?.student.full_name || 'Student Profile'}
        subtitle={
          profileDetail
            ? `${profileDetail.student.roll_number} · ${profileDetail.student.department_name} · Batch ${profileDetail.student.graduation_year}`
            : ''
        }
        maxWidthClass="max-w-2xl"
      >
        {profileDetail && (
          <div className="space-y-5 text-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4 border-b border-[#E3E7E4]">
              <div>
                <p className="text-xs text-[#5A6B69]">CGPA</p>
                <p className="font-mono font-bold text-[#142B2A]">{Number(profileDetail.student.cgpa).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Status</p>
                <p className="font-semibold text-[#176B5B]">{profileDetail.student.placement_status}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Phone</p>
                <p className="text-[#142B2A]">{profileDetail.student.phone}</p>
              </div>
              <div>
                <p className="text-xs text-[#5A6B69]">Course</p>
                <p className="text-[#142B2A]">{profileDetail.student.course}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[#5A6B69]">Skills</p>
              <p className="text-[#142B2A] mt-1">{profileDetail.student.skills || 'Not listed'}</p>
            </div>

            {profileDetail.placement && (
              <div className="rounded-lg bg-[#F5F3EC] border border-[#E3E7E4] p-4">
                <p className="text-xs font-semibold text-[#176B5B]">Confirmed Placement</p>
                <p className="font-semibold text-[#142B2A] mt-1">
                  {profileDetail.placement.company_name} — {profileDetail.placement.job_role} ({profileDetail.placement.package_lpa} LPA)
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-[#5A6B69] mb-2">
                Applications ({profileDetail.applications.length})
              </p>
              {profileDetail.applications.length === 0 ? (
                <p className="text-xs text-[#5A6B69]">No applications submitted yet.</p>
              ) : (
                <div className="divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
                  {profileDetail.applications.map((a) => (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span>
                        <strong>{a.company_name}</strong> · {a.job_title}
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
        title="Delete Student"
        message={`Are you sure you want to remove ${deleteTarget?.full_name} (${deleteTarget?.roll_number})? Their applications and interview records will also be removed.`}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Students from CSV"
        subtitle="Bulk upload student records into the database (default login password: Student@123)"
        endpoint="/api/admin/students/import-csv"
        templateFilename="placify-students-template.csv"
        columnsHint="roll_number, full_name, email, phone, department, course, graduation_year, cgpa, skills"
        templateContent={`roll_number,full_name,email,phone,department,course,graduation_year,cgpa,skills\nCS2026101,Riya Nair,riya.nair@placify.edu,+91 98201 55101,CSE,B.Tech,2026,8.75,"Python, React, SQL"\nIT2026102,Varun Kulkarni,varun.kulkarni@placify.edu,+91 98201 55102,IT,B.Tech,2026,8.20,"Java, Spring Boot, MySQL"`}
        onImported={loadStudents}
      />
    </div>
  );
}
