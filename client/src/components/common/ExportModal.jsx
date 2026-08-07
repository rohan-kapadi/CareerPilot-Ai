/**
 * ExportModal — Phase 7 (PROJECT.md §6.8)
 *
 * The final step before a resume leaves the system: pick a template, choose
 * what to redact, review the redaction, then download.
 *
 * Two guarantees this UI is built around:
 *   1. Export is AI-free — no agent touches the generated file.
 *   2. Redaction is export-time only — your stored resume is never modified.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import TemplatePicker from './TemplatePicker';
import {
  getExportOptions,
  previewExport,
  exportResume,
  downloadBlob,
} from '../../api/versionApi';

const FORMATS = [
  { key: 'pdf', label: 'PDF', icon: '📕' },
  { key: 'docx', label: 'DOCX', icon: '📘' },
];

export default function ExportModal({ resumeId, resumeName = 'Resume', onClose }) {
  const [templates, setTemplates] = useState([]);
  const [flags, setFlags] = useState([]);
  const [template, setTemplate] = useState('modern');
  const [format, setFormat] = useState('pdf');
  const [redactPaths, setRedactPaths] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getExportOptions(resumeId)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data;
        setTemplates(data?.templates ?? []);
        setFlags(data?.flags ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load export options');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resumeId]);

  function toggleRedact(fieldPath) {
    setPreview(null); // selection changed — the old preview no longer applies
    setRedactPaths((prev) =>
      prev.includes(fieldPath) ? prev.filter((p) => p !== fieldPath) : [...prev, fieldPath]
    );
  }

  async function handlePreview() {
    setWorking(true);
    try {
      const res = await previewExport(resumeId, redactPaths);
      setPreview(res.data?.data);
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Preview failed');
    } finally {
      setWorking(false);
    }
  }

  async function handleDownload() {
    setWorking(true);
    try {
      const res = await exportResume(resumeId, { format, template, redactFieldPaths: redactPaths });
      const suffix = redactPaths.length ? '-redacted' : '';
      downloadBlob(res.data, `${resumeName}${suffix}.${format}`);
      toast.success(`${format.toUpperCase()} downloaded`);
      onClose?.();
    } catch (err) {
      toast.error('Export failed. Please try again.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-white">📤 Export resume</h3>
            <p className="mt-1 text-sm text-gray-400">
              Generated without AI — exactly what your resume says, nothing invented.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-white"
            aria-label="Close export dialog"
          >
            ✕
          </button>
        </header>

        {loading ? (
          <p className="py-8 text-center text-gray-400">Loading options…</p>
        ) : (
          <>
            <TemplatePicker templates={templates} value={template} onChange={setTemplate} />

            {/* ── Format ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Format</p>
              <div className="flex gap-3">
                {FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key)}
                    className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                      format === f.key
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                        : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
              {format === 'docx' && (
                <p className="text-xs text-gray-500">
                  DOCX uses the fixed Word template — the template picker applies to PDF only.
                </p>
              )}
            </div>

            {/* ── Redaction ── */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Redact before export
              </p>
              {flags.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-400">
                  No sensitive fields flagged on this resume.
                </p>
              ) : (
                <ul className="space-y-2">
                  {flags.map((flag) => (
                    <li key={flag._id ?? flag.fieldPath}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 transition-colors hover:bg-white/10">
                        <input
                          type="checkbox"
                          checked={redactPaths.includes(flag.fieldPath)}
                          onChange={() => toggleRedact(flag.fieldPath)}
                          className="h-4 w-4 accent-amber-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-white">
                            {flag.flagType}
                          </span>
                          <span className="font-mono text-xs text-gray-500">{flag.fieldPath}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-gray-500">
                Redaction applies to this download only — your stored resume is unchanged.
              </p>
            </div>

            {/* ── Redaction preview ── */}
            {redactPaths.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={handlePreview}
                  disabled={working}
                  className="rounded-lg border border-blue-500/30 bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-600/30 disabled:opacity-50"
                >
                  {working ? 'Working…' : '👁 Preview redacted export'}
                </button>
                {preview && (
                  <pre className="max-h-48 overflow-auto rounded-lg border border-white/5 bg-black/40 p-3 text-xs text-emerald-400">
                    {JSON.stringify(preview.sections?.personalInfo ?? preview.sections, null, 2)}
                  </pre>
                )}
              </div>
            )}

            {/* ── Actions ── */}
            <footer className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                disabled={working}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {working ? 'Generating…' : `⬇ Download ${format.toUpperCase()}`}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
