/**
 * MemoryContext — Phase 3
 * Single source of truth for memory state on the frontend.
 *
 * Phase 4 and Phase 6 MUST consume this context rather than fetching
 * memory state independently (per phases-1.md §3 context handoff).
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { listMemories, getProposed } from '../api/memoryApi';

const MemoryContext = createContext(null);

export function MemoryProvider({ children }) {
  const [memories, setMemories]   = useState([]);  // accepted/modified
  const [proposed, setProposed]   = useState([]);  // pending Memory Cards
  const [loading, setLoading]     = useState(false);

  const refreshMemories = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const [memRes, propRes] = await Promise.allSettled([
        listMemories({ status: 'accepted' }),
        getProposed(),
      ]);
      if (memRes.status === 'fulfilled')  setMemories(memRes.value.data?.data?.memories ?? []);
      if (propRes.status === 'fulfilled') setProposed(propRes.value.data?.data?.proposed ?? []);
    } catch (err) {
      console.error('MemoryContext refresh error:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshMemories();
  }, [refreshMemories]);

  return (
    <MemoryContext.Provider value={{ memories, proposed, loading, refreshMemories }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error('useMemory must be used inside <MemoryProvider>');
  return ctx;
}

export default MemoryContext;
