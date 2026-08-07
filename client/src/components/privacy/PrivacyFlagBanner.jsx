import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Inline banner displayed when sensitive fields are detected.
 */
export default function PrivacyFlagBanner({ flags = [] }) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start space-x-4 mb-6">
      <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
      </div>
      <div className="flex-1">
        <h4 className="text-amber-400 font-medium mb-1">Sensitive Information Detected</h4>
        <p className="text-gray-400 text-sm mb-3">
          We noticed fields like {flags.map(f => f.flagType).join(', ')} in your profile. 
          Modern resumes typically do not require this information.
        </p>
        <Link 
          to="/privacy"
          className="text-sm font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
        >
          Review Privacy Settings &rarr;
        </Link>
      </div>
    </div>
  );
}
