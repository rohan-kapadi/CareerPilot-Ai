import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Download, Trash2, ShieldAlert } from 'lucide-react';
import ConsentToggle from '../components/privacy/ConsentToggle';
import RedactionPreview from '../components/privacy/RedactionPreview';
import { privacyApi } from '../api/privacyApi';

export default function PrivacyDashboardPage() {
  const [consents, setConsents] = useState([]);
  const [flags, setFlags] = useState([]);
  const [activeResume, setActiveResume] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Fetch Resumes to get active one
      const stored = localStorage.getItem('resumes');
      const resumes = stored ? JSON.parse(stored) : [];
      const resume = resumes[0];
      if (resume) {
        setActiveResume(resume);
        // 2. Fetch Flags for this resume
        const f = await privacyApi.getFlags(resume._id);
        setFlags(f);
      }
      
      // 3. Fetch Consents
      const c = await privacyApi.getConsents();
      setConsents(c);
      
    } catch (error) {
      console.error('Failed to load privacy dashboard data:', error);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerpilot_export_${category}.json`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data.');
    }
  };

  const handleDelete = async (category) => {
    if (window.confirm(`Are you sure you want to delete all ${category} data? This is irreversible.`)) {
      try {
        await privacyApi.deleteDataCategory(category);
        alert(`${category} data deleted successfully.`);
        fetchData(); // Refresh UI
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete data.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-12 space-y-12">
      {/* Header */}
      <div>
        <Link
          to="/dashboard"
          className="mb-6 flex w-fit items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
        >
          ← Dashboard
        </Link>
        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-3xl font-semibold text-white mb-2">Privacy & Consent</h1>
        <p className="text-gray-400 max-w-2xl text-lg leading-relaxed">
          You own your career data. Control what the AI remembers, preview redactions before exporting, and manage your data footprint.
        </p>
      </div>

      {/* Consent Toggles */}
      <section className="space-y-6">
        <h2 className="text-xl font-medium text-white flex items-center gap-2">
          AI Capabilities & Permissions
        </h2>
        <div className="grid gap-4">
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

      {/* Redaction Area */}
      {activeResume && (
        <section className="space-y-6">
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-400" />
            Export Redaction
          </h2>
          <RedactionPreview resumeId={activeResume._id} flags={flags} />
        </section>
      )}

      {/* Data Export & Deletion */}
      <section className="space-y-6 pt-6 border-t border-white/5">
        <h2 className="text-xl font-medium text-white">Your Data Footprint</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Card */}
          <div className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-colors">
            <Download className="w-6 h-6 text-gray-400 mb-4" />
            <h3 className="text-white font-medium mb-1">Download your data</h3>
            <p className="text-gray-400 text-sm mb-6">Get a copy of everything you've saved or the AI has learned about you.</p>
            <div className="flex gap-3">
              <button onClick={() => handleExport('resume')} className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-colors">
                Resumes
              </button>
              <button onClick={() => handleExport('memory')} className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white border border-white/10 transition-colors">
                Memories
              </button>
            </div>
          </div>

          {/* Delete Card */}
          <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl hover:border-red-500/20 transition-colors">
            <Trash2 className="w-6 h-6 text-red-400 mb-4" />
            <h3 className="text-white font-medium mb-1">Delete your data</h3>
            <p className="text-red-400/70 text-sm mb-6">Permanently wipe your data from our servers. This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete('resume')} className="text-sm px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/20 transition-colors">
                Resumes
              </button>
              <button onClick={() => handleDelete('memory')} className="text-sm px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 border border-red-500/20 transition-colors">
                Memories
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
