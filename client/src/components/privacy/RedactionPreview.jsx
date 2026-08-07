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
      <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-gray-400">No sensitive fields flagged for redaction.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-4">Export Redaction Preview</h3>
      
      <div className="mb-6 space-y-2">
        <p className="text-gray-400 text-sm">The following fields were flagged as potentially sensitive:</p>
        <ul className="list-disc pl-5 text-gray-300">
          {flags.map((flag, idx) => (
            <li key={idx}>
              <span className="font-medium text-blue-400">{flag.flagType}</span>
              <span className="text-gray-500 text-sm ml-2">({flag.fieldPath})</span>
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
          <h4 className="text-gray-300 font-medium mb-2">Redacted Output:</h4>
          <pre className="bg-black/40 p-4 rounded-lg overflow-x-auto text-xs text-green-400 border border-white/5">
            {JSON.stringify(redactedData.sections.personalInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
