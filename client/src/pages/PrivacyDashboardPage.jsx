import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Download, Trash2, ShieldAlert } from 'lucide-react';
import ConsentToggle from '../components/privacy/ConsentToggle';
import RedactionPreview from '../components/privacy/RedactionPreview';
import { privacyApi } from '../api/privacyApi';

const CATEGORY_PLURAL = { resume: 'Resumes', memory: 'Memories' };

export default function PrivacyDashboardPage() {
  const [consents, setConsents]       = useState([]);
  const [flags, setFlags]             = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const stored  = localStorage.getItem('resumes');
      const resumes = stored ? JSON.parse(stored) : [];
      const resume  = resumes[0];
      if (resume) {
        setActiveResume(resume);
        const f = await privacyApi.getFlags(resume._id);
        setFlags(f);
      }
      const c = await privacyApi.getConsents();
      setConsents(c);
    } catch (err) {
      console.error('Failed to load privacy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConsentStatus = (purpose, dataCategory) => {
    const c = consents.find(x => x.purpose === purpose && x.dataCategory === dataCategory);
    return c ? c.granted : false;
  };

  const handleExport = async (category) => {
    try {
      const data = await privacyApi.exportData(category);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `careerpilot_export_${category}.json`;
      a.click();
    } catch { alert('Failed to export data.'); }
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Are you sure you want to delete all ${category} data? This is irreversible.`)) return;
    try {
      await privacyApi.deleteDataCategory(category);
      alert(`${category} data deleted successfully.`);
      fetchData();
    } catch { alert('Failed to delete data.'); }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '2rem', height: '2rem', border: '3px solid rgba(59,130,246,0.3)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', fontFamily: "'Sora', system-ui, sans-serif", color: '#111827' }}>
      <main className="page-wrap py-10 space-y-10" style={{ maxWidth: '880px' }}>
        {/* Header */}
        <section>
          <div style={{ width: '3rem', height: '3rem', background: 'rgba(59,130,246,0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid rgba(59,130,246,0.2)' }}>
            <Shield style={{ width: '1.35rem', height: '1.35rem', color: '#1d4ed8' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>Privacy &amp; Consent</h1>
          <p style={{ color: '#6b7280', lineHeight: 1.7, fontSize: '0.9rem', maxWidth: '560px' }}>
            You own your career data. Control what the AI remembers, preview redactions before exporting, and manage your data footprint.
          </p>
        </section>

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Consent Toggles */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>AI Capabilities &amp; Permissions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <ConsentToggle
              purpose="chat_memory"
              dataCategory="sensitive_memory"
              initialGranted={getConsentStatus('chat_memory', 'sensitive_memory')}
              label="Allow AI to remember sensitive details"
              description="If the AI detects sensitive info (like compensation or layoff history) during a chat, it will ask before remembering it."
            />
            <ConsentToggle
              purpose="scoring"
              dataCategory="resume"
              initialGranted={getConsentStatus('scoring', 'resume')}
              label="Use data for ATS Score benchmarking"
              description="Allows your anonymized score metrics to improve the overarching ATS engine accuracy."
            />
          </div>
        </section>

        {/* Redaction Preview */}
        {activeResume && (
          <>
            <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert style={{ width: '1rem', height: '1rem', color: '#6b7280' }} />
                Export Redaction
              </h2>
              <RedactionPreview resumeId={activeResume._id} flags={flags} />
            </section>
          </>
        )}

        <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

        {/* Data Footprint */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h2 style={{ fontWeight: 700, color: '#111827', fontSize: '1rem' }}>Your Data Footprint</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export */}
            <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Download style={{ width: '1.35rem', height: '1.35rem', color: '#6b7280' }} />
              <div>
                <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '0.3rem' }}>Download your data</h3>
                <p style={{ color: '#9ca3af', fontSize: '0.78rem', lineHeight: 1.6 }}>Get a copy of everything you've saved or the AI has learned about you.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {['resume', 'memory'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleExport(cat)}
                    className="btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
                  >
                    {CATEGORY_PLURAL[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Delete */}
            <div className="panel-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
              <Trash2 style={{ width: '1.35rem', height: '1.35rem', color: '#dc2626' }} />
              <div>
                <h3 style={{ fontWeight: 700, color: '#111827', fontSize: '0.95rem', marginBottom: '0.3rem' }}>Delete your data</h3>
                <p style={{ color: '#dc2626', fontSize: '0.78rem', lineHeight: 1.6, opacity: 0.75 }}>Permanently wipe your data from our servers. This action cannot be undone.</p>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                {['resume', 'memory'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleDelete(cat)}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: '999px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    {CATEGORY_PLURAL[cat]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
