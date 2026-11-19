import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Eye, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';
import type { Company, JobOpening, Placement, PlacementDrive } from '../../types';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CsvImportModal } from '../../components/ui/CsvImportModal';

const emptyCompany = {
  name: '',
  industry: '',
  location: '',
  website: '',
  hr_contact: '',
  contact_email: '',
  description: '',
};

export function AdminCompanies() {
  const { showToast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyCompany);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [detail, setDetail] = useState<{
    company: Company;
    jobs: JobOpening[];
    drives: PlacementDrive[];
    placements: Placement[];
  } | null>(null);

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const qs = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiFetch<{ companies: Company[] }>(`/api/admin/companies${qs}`);
      setCompanies(res.companies);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load companies.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyCompany);
    setModalOpen(true);
  };

  const openEdit = (c: Company) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      industry: c.industry,
      location: c.location,
      website: c.website || '',
      hr_contact: c.hr_contact,
      contact_email: c.contact_email,
      description: c.description || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/admin/companies/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        showToast('Company updated.');
      } else {
        await apiFetch('/api/admin/companies', { method: 'POST', body: JSON.stringify(form) });
        showToast('Company added.');
      }
      setModalOpen(false);
      loadCompanies();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to save company.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/admin/companies/${deleteTarget.id}`, { method: 'DELETE' });
      showToast(`${deleteTarget.name} deleted.`);
      setDeleteTarget(null);
      loadCompanies();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to delete company.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const viewDetail = async (id: number) => {
    try {
      const res = await apiFetch<{
        company: Company;
        jobs: JobOpening[];
        drives: PlacementDrive[];
        placements: Placement[];
      }>(`/api/admin/companies/${id}`);
      setDetail(res);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to load company details.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[#142B2A]">Company Management</h1>
          <p className="text-sm text-[#5A6B69]">Maintain recruiting partners, HR contacts, and campus hiring pipelines.</p>
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
            <span>Add Company</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white p-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, industry, location, or HR..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#E3E7E4] text-sm focus:outline-none focus:border-[#176B5B]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[#E3E7E4] bg-white overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F5F3EC] rounded animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No companies found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#F5F3EC]/70 border-b border-[#E3E7E4] text-xs text-[#5A6B69]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Industry & Location</th>
                  <th className="px-4 py-3 font-semibold">HR Contact</th>
                  <th className="px-4 py-3 font-semibold text-right">Jobs</th>
                  <th className="px-4 py-3 font-semibold text-right">Drives</th>
                  <th className="px-4 py-3 font-semibold text-right">Hires</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F3EC]">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F5F3EC]/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#142B2A]">{c.name}</p>
                      {c.website && <p className="text-xs text-[#5A6B69]">{c.website}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#142B2A]">
                      <p>{c.industry}</p>
                      <p className="text-[#5A6B69]">{c.location}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <p className="font-medium text-[#142B2A]">{c.hr_contact}</p>
                      <p className="text-[#5A6B69]">{c.contact_email}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{c.jobs_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{c.drives_count ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-[#176B5B]">
                      {c.placements_count ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => viewDetail(c.id)}
                          title="Inspect company"
                          className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Edit company"
                          className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#176B5B] hover:bg-[#F5F3EC]"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          title="Delete company"
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
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Company' : 'Add Partner Company'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Company Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Industry</label>
              <input
                type="text"
                required
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Location</label>
              <input
                type="text"
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">HR Contact Name</label>
              <input
                type="text"
                required
                value={form.hr_contact}
                onChange={(e) => setForm({ ...form, hr_contact: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#142B2A] mb-1">Contact Email</label>
              <input
                type="email"
                required
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#142B2A] mb-1">Company Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-[#176B5B] text-white text-sm font-semibold">
              {saving ? 'Saving...' : 'Save Company'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.company.name || 'Company Details'}
        subtitle={detail ? `${detail.company.industry} · ${detail.company.location}` : ''}
        maxWidthClass="max-w-2xl"
      >
        {detail && (
          <div className="space-y-5 text-sm">
            <p className="text-[#5A6B69]">{detail.company.description}</p>
            <div>
              <p className="text-xs font-semibold text-[#5A6B69] mb-1.5">Associated Job Openings ({detail.jobs.length})</p>
              {detail.jobs.length === 0 ? (
                <p className="text-xs text-[#5A6B69]">No job openings posted yet.</p>
              ) : (
                <div className="divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
                  {detail.jobs.map((j) => (
                    <div key={j.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-[#142B2A]">{j.title}</span>
                      <span className="font-mono">{j.package_lpa} LPA · {j.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[#5A6B69] mb-1.5">Placement Drives ({detail.drives.length})</p>
              {detail.drives.length === 0 ? (
                <p className="text-xs text-[#5A6B69]">No placement drives associated.</p>
              ) : (
                <div className="divide-y divide-[#F5F3EC] border border-[#E3E7E4] rounded-lg">
                  {detail.drives.map((d) => (
                    <div key={d.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-[#142B2A]">{d.title}</span>
                      <span className="font-mono">{d.drive_date} · {d.status}</span>
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
        title="Delete Company"
        message={`Delete ${deleteTarget?.name}? Associated job openings and drives without confirmed placements will be removed.`}
      />

      <CsvImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Companies from CSV"
        subtitle="Bulk upload recruiting partner companies into the database"
        endpoint="/api/admin/companies/import-csv"
        templateFilename="placify-companies-template.csv"
        columnsHint="name, industry, location, website, hr_contact, contact_email, description"
        templateContent={`name,industry,location,website,hr_contact,contact_email,description\nAtlassian India,Enterprise Software,Bengaluru,https://atlassian.com,Meera Nair,campus@atlassian.example.com,"Collaboration and developer productivity software"\nFlipkart Tech,E-Commerce Technology,Bengaluru,https://flipkart.com,Arjun Rao,university@flipkart.example.com,"Large scale e-commerce supply chain and cloud systems"`}
        onImported={loadCompanies}
      />
    </div>
  );
}
