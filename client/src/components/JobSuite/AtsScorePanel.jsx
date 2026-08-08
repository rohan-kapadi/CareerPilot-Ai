import React, { useEffect, useState } from 'react';
import { useJobAnalysis } from '../../context/JobAnalysisContext';
import { Download, AlertCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';

export default function AtsScorePanel() {
  const { atsScore, analysisStatus } = useJobAnalysis();
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    if (analysisStatus === 'complete' && atsScore) {
      let current = 0;
      const target = atsScore.overall_score || 0;
      const duration = 1200; // 1.2s
      const increment = target / (duration / 16); 
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setAnimatedScore(target);
          clearInterval(timer);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, 16);
      return () => clearInterval(timer);
    } else {
      setAnimatedScore(0);
    }
  }, [atsScore, analysisStatus]);

  if (analysisStatus === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: '#6b7280' }}>
        <Zap className="h-12 w-12 mb-4 opacity-50" />
        <p>Paste a job description to unlock ATS compatibility score.</p>
      </div>
    );
  }

  if (analysisStatus === 'loading') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-center">
          <div className="h-32 w-32 rounded-full border-4" style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.04)' }}></div>
        </div>
        <div className="space-y-4">
          <div className="h-4 w-full rounded" style={{ background: 'rgba(0,0,0,0.06)' }}></div>
          <div className="h-4 w-4/5 rounded" style={{ background: 'rgba(0,0,0,0.06)' }}></div>
          <div className="h-4 w-full rounded" style={{ background: 'rgba(0,0,0,0.06)' }}></div>
        </div>
      </div>
    );
  }

  if (analysisStatus === 'error' || !atsScore) {
    return <p className="text-red-400">Failed to load ATS score. Please try again.</p>;
  }

  const getScoreColor = (score) => {
    if (score < 50) return 'text-red-500';
    if (score < 70) return 'text-amber-500';
    if (score < 85) return 'text-emerald-500';
    return 'text-cyan-500';
  };

  const getScoreRingColor = (score) => {
    if (score < 50) return 'stroke-red-500';
    if (score < 70) return 'stroke-amber-500';
    if (score < 85) return 'stroke-emerald-500';
    return 'stroke-cyan-500';
  };

  const breakdown = atsScore.breakdown || {};
  const kwMatch = breakdown.keyword_match || { score: 0, matched: [], missing: [] };
  const structMatch = breakdown.section_structure || { score: 0 };
  const skillMatch = breakdown.skills_alignment || { score: 0 };
  const formatMatch = breakdown.formatting_score || { score: 0 };
  const verbMatch = breakdown.action_verbs || { score: 0 };

  const bars = [
    { label: 'Keyword Match', score: kwMatch.score, notice: `+${kwMatch.matched?.length || 0} keywords used` },
    { label: 'Section Structure', score: structMatch.score, notice: '' },
    { label: 'Skills Alignment', score: skillMatch.score, notice: `${skillMatch.matched_count || 0}/${skillMatch.total_required || 0} skills match` },
    { label: 'Formatting Score', score: formatMatch.score, notice: '' },
    { label: 'Action Verbs', score: verbMatch.score, notice: `${verbMatch.count || 0} strong verbs` },
  ];

  const strokeDashoffset = 100 - animatedScore;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Score Ring */}
      <div className="flex flex-col items-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
            <path
              style={{ stroke: 'rgba(0,0,0,0.08)' }}
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={`${getScoreRingColor(animatedScore)} transition-all duration-100 ease-out`}
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-display font-bold ${getScoreColor(animatedScore)}`}>
              {animatedScore}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider mt-1 pt-1 w-16 text-center" style={{ color: '#6b7280', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              / 100
            </span>
          </div>
        </div>
        <p className="mt-4 text-sm font-medium" style={{ color: '#111827' }}>
          ● {atsScore.score_label || 'Evaluated'}
        </p>
      </div>

      {/* Breakdown Bars */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold uppercase tracking-wider pb-2" style={{ color: '#374151', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          Score Breakdown
        </h4>
        {bars.map((item, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: '#111827' }}>{item.label}</span>
              <span className="font-semibold" style={{ color: '#111827' }}>{item.score}%</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className={`h-full ${getScoreRingColor(item.score).replace('stroke-', 'bg-')}`}
                style={{ width: `${item.score}%`, transition: 'width 1s ease-out' }}
              />
            </div>
            {item.notice && <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>{item.notice}</div>}
          </div>
        ))}
      </div>

      {/* Keywords */}
      <div className="space-y-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {kwMatch.matched && kwMatch.matched.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-emerald-600 mb-2">
              <CheckCircle2 className="h-4 w-4" /> Matched Keywords ({kwMatch.matched.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {kwMatch.matched.map((kw, i) => (
                <span key={i} className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-700">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}

        {kwMatch.missing && kwMatch.missing.length > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium text-red-500 mt-4 mb-2">
              <AlertCircle className="h-4 w-4" /> Missing Keywords ({kwMatch.missing.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {kwMatch.missing.map((kw, i) => (
                <span key={i} className="rounded border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-600">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Wins */}
      {atsScore.quick_wins && atsScore.quick_wins.length > 0 && (
        <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <h4 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#374151' }}>Quick Wins</h4>
          {atsScore.quick_wins.map((qw, i) => (
            <div key={i} className="rounded-lg p-3 flex gap-3 items-start" style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)' }}>
              <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${qw.priority === 'HIGH' ? 'text-red-500' : qw.priority === 'MEDIUM' ? 'text-amber-500' : 'text-slate-500'}`} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>{qw.action}</p>
                <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{qw.impact}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Button */}
      <button className="w-full btn-secondary mt-6 flex items-center justify-center gap-2 py-2.5">
        <Download className="h-4 w-4" /> Download ATS Report PDF
      </button>

    </div>
  );
}
