import { useEffect, useState } from 'react';
import { Building2, ExternalLink, MapPin, Search } from 'lucide-react';
import { PublicNavbar } from '../components/layout/PublicNavbar';
import { Footer } from '../components/layout/Footer';
import { apiFetch } from '../lib/api';
import type { Company } from '../types';

export function PublicCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<{ companies: Company[] }>('/api/public/companies')
      .then((res) => setCompanies(res.companies))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.industry.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EC]/50 text-[#122120]">
      <PublicNavbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#176B5B]">Recruiting Ecosystem</p>
            <h1 className="font-display font-bold text-3xl text-[#142B2A] mt-1">Partner Companies</h1>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-[#5A6B69] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or industry..."
              className="pl-9 pr-4 py-2 rounded-lg border border-[#E3E7E4] bg-white text-sm w-full sm:w-64 focus:outline-none focus:border-[#176B5B]"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-white border border-[#E3E7E4] animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E3E7E4] bg-white p-12 text-center space-y-2">
            <Building2 className="w-8 h-8 text-[#5A6B69] mx-auto" />
            <p className="font-display font-semibold text-[#142B2A]">No partner companies match your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((company) => (
              <div key={company.id} className="rounded-xl border border-[#E3E7E4] bg-white p-6 flex flex-col justify-between gap-4">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#176B5B]">{company.industry}</p>
                      <h2 className="font-display font-semibold text-lg text-[#142B2A] mt-0.5">{company.name}</h2>
                    </div>
                    {company.website && (
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Visit ${company.name} website`}
                        className="p-1.5 rounded-lg text-[#5A6B69] hover:text-[#142B2A] hover:bg-[#F5F3EC]"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="text-xs text-[#5A6B69] inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {company.location}
                  </p>
                  <p className="text-sm text-[#5A6B69] leading-relaxed">{company.description}</p>
                </div>

                <div className="pt-3 border-t border-[#F5F3EC] grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="font-mono tabular-nums font-bold text-[#142B2A] text-sm">{company.open_jobs_count ?? 0}</p>
                    <p className="text-[#5A6B69]">Open Jobs</p>
                  </div>
                  <div>
                    <p className="font-mono tabular-nums font-bold text-[#142B2A] text-sm">{company.drives_count ?? 0}</p>
                    <p className="text-[#5A6B69]">Drives</p>
                  </div>
                  <div>
                    <p className="font-mono tabular-nums font-bold text-[#176B5B] text-sm">{company.placements_count ?? 0}</p>
                    <p className="text-[#5A6B69]">Hires</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
