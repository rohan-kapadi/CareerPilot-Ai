import React, { useState } from 'react';
import { privacyApi } from '../../api/privacyApi';

/**
 * Visual UI showing the before/after effect of redaction.
 */
export default function RedactionPreview({ resumeId, flags = [] }) {
  const [redactedData, setRedactedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRedact = async () => {
    setLoading(true);
    setError(null);
    try {
      const fieldPaths = flags.filter(f => !f.redacted).map(f => f.fieldPath);
      const res = await privacyApi.redactResume(resumeId, fieldPaths);
      setRedactedData(res.redacted);
    } catch (err) {
      console.error('Failed to redact:', err);
      setError('Failed to preview redaction.');
    } finally {
      setLoading(false);
    }
  };

  if (!flags.length) {
    return (
      <div className="panel-card p-4">
        <p style={{ color: '#6b7280' }}>No sensitive fields flagged for redaction.</p>
      </div>
    );
  }

  return (
    <div className="panel-card p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ color: '#111827' }}>Export Redaction Preview</h3>

      <div className="mb-6 space-y-2">
        <p className="text-sm" style={{ color: '#6b7280' }}>The following fields were flagged as potentially sensitive:</p>
        <ul className="list-disc pl-5" style={{ color: '#374151' }}>
          {flags.map((flag, idx) => (
            <li key={idx}>
              <span className="font-medium text-blue-400">{flag.flagType}</span>
              <span className="text-sm ml-2" style={{ color: '#9ca3af' }}>({flag.fieldPath})</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleRedact}
        disabled={loading}
        className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Preview Redacted Export'}
      </button>

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      {redactedData && (
        <div className="mt-6">
          <h4 className="font-medium mb-2" style={{ color: '#374151' }}>Redacted Output:</h4>
          <pre className="draft-json text-green-700">
            {JSON.stringify(redactedData.sections.personalInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
