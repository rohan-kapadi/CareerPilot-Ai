/**
 * useApprovalQueue — Phase 6
 *
 * Fetches and manages pending Suggestions across the app. Any surface that
 * needs the pending count (Dashboard badge, AISuggestionsPage, resume viewer)
 * uses this hook rather than querying /api/suggestions itself.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  listSuggestions,
  approveSuggestion,
  rejectSuggestion,
  bulkApproveSuggestions,
} from '../api/suggestionApi';

export default function useApprovalQueue({ status = 'pending', resumeId, autoLoad = true } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(null); // id currently being decided

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await listSuggestions({ status, ...(resumeId ? { resumeId } : {}) });
      setSuggestions(res.data?.data?.suggestions ?? []);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  }, [status, resumeId]);

  useEffect(() => {
    if (autoLoad) refresh();
  }, [autoLoad, refresh]);

  /**
   * Approve one suggestion.
   * On a 409 the resume changed since the suggestion was written — we surface
   * the conflict to the caller instead of silently forcing the overwrite.
   */
  const approve = useCallback(
    async (id, { force = false } = {}) => {
      setDeciding(id);
      try {
        const res = await approveSuggestion(id, force);
        setSuggestions((prev) => prev.filter((s) => s._id !== id));
        return { ok: true, message: res.data?.message, data: res.data?.data };
      } catch (err) {
        const conflict = err.response?.status === 409 && err.response?.data?.data?.stale;
        return {
          ok: false,
          stale: Boolean(conflict),
          message: err.response?.data?.message ?? 'Failed to approve suggestion',
          data: err.response?.data?.data,
        };
      } finally {
        setDeciding(null);
      }
    },
    []
  );

  const reject = useCallback(async (id) => {
    setDeciding(id);
    try {
      const res = await rejectSuggestion(id);
      setSuggestions((prev) => prev.filter((s) => s._id !== id));
      return { ok: true, message: res.data?.message };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message ?? 'Failed to reject suggestion' };
    } finally {
      setDeciding(null);
    }
  }, []);

  /** Bulk approve — the server re-checks the confirmed count before applying. */
  const bulkApprove = useCallback(
    async (ids) => {
      try {
        const res = await bulkApproveSuggestions(ids);
        await refresh();
        return { ok: true, message: res.data?.message, data: res.data?.data };
      } catch (err) {
        return { ok: false, message: err.response?.data?.message ?? 'Bulk approval failed' };
      }
    },
    [refresh]
  );

  return {
    suggestions,
    pendingCount: suggestions.filter((s) => s.status === 'pending').length,
    loading,
    error,
    deciding,
    refresh,
    approve,
    reject,
    bulkApprove,
  };
}
