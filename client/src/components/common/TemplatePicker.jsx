/**
 * TemplatePicker — Phase 7 (§6.8)
 *
 * Templates change presentation only — never content. The server enforces this
 * by varying CSS alone, so picking a template can't alter what your resume says.
 */
export default function TemplatePicker({ templates = [], value, onChange }) {
  if (templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Template</p>
      <div className="grid grid-cols-3 gap-3">
        {templates.map((template) => {
          const active = value === template.key;
          return (
            <button
              key={template.key}
              type="button"
              onClick={() => onChange(template.key)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition-all ${
                active
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              {/* Miniature page preview tinted with the template's accent */}
              <span
                className="flex h-14 w-10 flex-col gap-1 rounded-sm bg-white p-1.5 shadow-sm"
                aria-hidden="true"
              >
                <span className="h-1 w-full rounded-sm" style={{ background: template.accent }} />
                <span className="h-0.5 w-3/4 rounded-sm bg-slate-300" />
                <span className="mt-1 h-0.5 w-full rounded-sm bg-slate-200" />
                <span className="h-0.5 w-full rounded-sm bg-slate-200" />
                <span className="h-0.5 w-2/3 rounded-sm bg-slate-200" />
              </span>
              <span className={`text-xs font-medium ${active ? 'text-blue-300' : 'text-gray-400'}`}>
                {template.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
