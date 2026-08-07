/**
 * useExplanationTrace — Phase 4
 * Hook to fetch and cache trace data by match ID.
 */
import { useEffect, useState } from 'react';
import { getMatch } from '../api/matchApi';

export function useExplanationTrace(matchId) {
  const [trace, setTrace]     = useState(null);
  const [match, setMatch]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    setError(null);

    getMatch(matchId)
      .then(res => {
        const m = res.data?.data?.match;
        setMatch(m);
        setTrace(m?.explanationTrace || null);
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load match trace');
      })
      .finally(() => setLoading(false));
  }, [matchId]);

  return { trace, match, loading, error };
}
