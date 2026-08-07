/**
 * useMemoryCards — Phase 3
 * Polls /api/memory/proposed during an active chat session.
 * Returns proposed Memory Cards and a decide() callback.
 *
 * Polling interval: 5s (stops when component unmounts or conversationId changes).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getProposed, decideMemory } from '../api/memoryApi';
import { useMemory } from '../context/MemoryContext';

export function useMemoryCards(conversationId) {
  const [cards, setCards]         = useState([]);
  const [deciding, setDeciding]   = useState(null); // ID of card being processed
  const intervalRef               = useRef(null);
  const { refreshMemories }       = useMemory();

  const fetchCards = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await getProposed(conversationId);
      setCards(res.data?.data?.proposed ?? []);
    } catch {
      // silent — non-critical
    }
  }, [conversationId]);

  // Poll every 5 seconds while chat is active
  useEffect(() => {
    fetchCards();
    intervalRef.current = setInterval(fetchCards, 5000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCards]);

  /**
   * Handle user decision on a Memory Card.
   * @param {string} id     - Memory._id
   * @param {string} action - 'accept' | 'modify' | 'reject' | 'timebox'
   * @param {object} [opts] - { content?, expiresAt? } for modify/timebox
   */
  const decide = useCallback(async (id, action, opts = {}) => {
    setDeciding(id);
    try {
      await decideMemory(id, { action, ...opts });
      setCards(prev => prev.filter(c => c._id !== id));
      await refreshMemories(); // sync MemoryContext
    } catch (err) {
      console.error('useMemoryCards.decide error:', err.message);
    } finally {
      setDeciding(null);
    }
  }, [refreshMemories]);

  return { cards, decide, deciding };
}
