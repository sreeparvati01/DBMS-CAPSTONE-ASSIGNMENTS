import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { Modal } from './Modal';
import { apiFetch, ApiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';

interface CsvImportModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  endpoint: string;
  templateFilename: string;
  templateContent: string;
  columnsHint: string;
  onImported: () => void;
}

export function CsvImportModal({
  open,
  onClose,
  title,
  subtitle,
  endpoint,
  templateFilename,
  templateContent,
  columnsHint,
  onImported,
}: CsvImportModalProps) {
  const { showToast } = useToast();
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    setCsvText(text);
  };

  const downloadTemplate = () => {
    const blob = new Blob([templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      showToast('Please choose a CSV file or paste CSV data.', 'error');
      return;
    }
    setImporting(true);
    try {
      const res = await apiFetch<{ imported: number; skipped: number; errors: string[]; message: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ csv: csvText }),
      });
      setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors || [] });
      showToast(res.message);
      if (res.imported > 0) {
        onImported();
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Failed to import CSV.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const rowEstimate = Math.max(0, csvText.trim().split(/\r?\n/).filter(Boolean).length - 1);

  return (
    <Modal
      open={open}
      onClose={() => {
        setCsvText('');
        setFileName('');
        setResult(null);
        onClose();
      }}
      title={title}
      subtitle={subtitle}
      maxWidthClass="max-w-xl"
    >
      <form onSubmit={handleImport} className="space-y-4 text-sm">
        <div className="rounded-lg bg-[#F5F3EC] border border-[#E3E7E4] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#5A6B69]">
            <p className="font-semibold text-[#142B2A]">Expected CSV Columns</p>
            <p className="font-mono mt-0.5">{columnsHint}</p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E3E7E4] hover:border-[#176B5B] text-xs font-semibold text-[#142B2A] shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#176B5B]" />
            <span>Sample CSV</span>
          </button>
        </div>

        <label className="block rounded-xl border-2 border-dashed border-[#E3E7E4] hover:border-[#176B5B] p-5 text-center cursor-pointer transition-colors">
          <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
          <FileSpreadsheet className="w-7 h-7 text-[#176B5B] mx-auto mb-2" />
          <p className="font-semibold text-[#142B2A]">
            {fileName ? fileName : 'Click to select a .csv file from your computer'}
          </p>
          <p className="text-xs text-[#5A6B69] mt-1">
            {csvText ? `${rowEstimate} data row(s) detected` : 'Supports UTF-8 CSV exported from Excel or Google Sheets'}
          </p>
        </label>

        <div>
          <label className="block text-xs font-semibold text-[#142B2A] mb-1">Or Paste CSV Content</label>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setResult(null);
            }}
            placeholder={templateContent}
            className="w-full px-3 py-2 rounded-lg border border-[#E3E7E4] font-mono text-xs focus:outline-none focus:border-[#176B5B]"
          />
        </div>

        {result && (
          <div className="rounded-lg border border-[#E3E7E4] bg-[#F5F3EC] p-3.5 space-y-2 text-xs">
            <p className="font-semibold text-[#142B2A]">
              Import Complete: <span className="text-[#176B5B]">{result.imported} added</span> ·{' '}
              <span className="text-[#5A6B69]">{result.skipped} skipped</span>
            </p>
            {result.errors.length > 0 && (
              <ul className="space-y-1 text-red-700 max-h-28 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <li key={idx}>• {err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#F5F3EC] text-sm font-medium text-[#142B2A]"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={importing || !csvText.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#176B5B] hover:bg-[#142B2A] text-white text-sm font-semibold disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>{importing ? 'Importing...' : 'Import into Database'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
