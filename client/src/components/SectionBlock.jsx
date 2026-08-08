import { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

const COLOR_MAP = {
  primary: {
    icon: 'text-orange-600',
    bg: 'bg-orange-200/15',
    border: 'border-orange-300/40',
  },
  cyan: {
    icon: 'text-teal-600',
    bg: 'bg-teal-300/15',
    border: 'border-teal-300/40',
  },
  violet: {
    icon: 'text-amber-600',
    bg: 'bg-amber-200/15',
    border: 'border-amber-300/40',
  },
  emerald: {
    icon: 'text-emerald-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  amber: {
    icon: 'text-amber-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  rose: {
    icon: 'text-rose-600',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
};

export default function SectionBlock({ title, icon, color = 'primary', children, onAdd }) {
  const [open, setOpen] = useState(true);
  const c = COLOR_MAP[color] || COLOR_MAP.primary;

  return (
    <section className="glass-card overflow-hidden transition-shadow duration-300 hover:shadow-[0_22px_45px_-25px_rgba(251,146,60,0.5)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${c.border} ${c.bg}`}>
            <span className={c.icon}>{icon}</span>
          </span>
          <span className="truncate font-semibold tracking-tight" style={{ color: '#111827' }}>{title}</span>
          <ChevronDown
            className={`ml-auto h-4 w-4 flex-shrink-0 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
            style={{ color: '#9ca3af' }}
          />
        </button>

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:border-orange-300/50 hover:bg-orange-200/15 hover:text-orange-700"
            style={{ borderColor: 'rgba(0,0,0,0.09)', background: 'rgba(0,0,0,0.03)', color: '#6b7280' }}
            aria-label={`Add item to ${title}`}
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-3 p-4 sm:p-5 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}
