import React, { useState } from 'react';
import { privacyApi } from '../../api/privacyApi';

/**
 * Switch component bound to a specific consent purpose/category.
 */
export default function ConsentToggle({ purpose, dataCategory, initialGranted = false, label, description }) {
  const [granted, setGranted] = useState(initialGranted);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      const newStatus = !granted;
      await privacyApi.updateConsent(purpose, dataCategory, newStatus);
      setGranted(newStatus);
    } catch (err) {
      console.error('Failed to update consent:', err);
      setError('Failed to update. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-card flex items-start justify-between p-4 transition-colors">
      <div className="flex-1 pr-6">
        <h4 className="font-medium mb-1" style={{ color: '#111827' }}>{label}</h4>
        <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>{description}</p>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>
      <div className="flex items-center h-full pt-1">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            granted ? 'bg-blue-600' : 'bg-gray-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              granted ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
