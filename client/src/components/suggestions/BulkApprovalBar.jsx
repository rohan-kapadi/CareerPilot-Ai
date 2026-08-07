/**
 * BulkApprovalBar — Phase 6
 *
 * Bulk approve with the mandatory second confirmation from PROJECT.md §10:
 * the first tap arms the action and shows the exact count about to be applied;
 * only the second tap sends it. The server independently re-checks that count,
 * so a stale UI can't push through a different set than the user confirmed.
 */
import { useEffect, useState } from 'react';

export default function BulkApprovalBar({
  selectedIds,
  totalPending,
  onBulkApprove,
  onSelectAll,
  onClearSelection,
  busy = false,
}) {
  const [armed, setArmed] = useState(false);
  const count = selectedIds.length;

  // Changing the selection invalidates a pending confirmation — the user must
  // re-confirm against the new count.
  useEffect(() => {
    setArmed(false);
  }, [count]);

  if (count === 0) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
        <p className="text-sm text-gray-400">
          {totalPending} suggestion{totalPending !== 1 ? 's' : ''} awaiting your review
        </p>
        {totalPending > 0 && (
          <button
            onClick={onSelectAll}
            className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            Select all
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3 transition-colors ${
        armed ? 'border-amber-500/40 bg-amber-500/10' : 'border-blue-500/30 bg-blue-500/10'
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">
          {count} suggestion{count !== 1 ? 's' : ''} selected
        </p>
        {armed && (
          <p className="mt-0.5 text-xs text-amber-300">
            This applies {count} change{count !== 1 ? 's' : ''} to your resume. Tap again to confirm.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setArmed(false);
            onClearSelection();
          }}
          className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
        >
          Clear
        </button>

        {count < totalPending && (
          <button
            onClick={onSelectAll}
            className="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
          >
            Select all
          </button>
        )}

        <button
          disabled={busy}
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            setArmed(false);
            onBulkApprove(selectedIds);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
            armed ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          {busy
            ? 'Applying…'
            : armed
              ? `✓ Confirm ${count} change${count !== 1 ? 's' : ''}`
              : `Approve ${count} selected`}
        </button>
      </div>
    </div>
  );
}
