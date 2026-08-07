import React, { useState } from 'react';
import JobInputHub from './JobInputHub';
import AtsScorePanel from './AtsScorePanel';
import EnhancementAdvisor from './EnhancementAdvisor';
import CoverLetterGenerator from './CoverLetterGenerator';
import { useJobAnalysis } from '../../context/JobAnalysisContext';
import { BarChart3, Sparkles, Mail, Download, Loader2, Wand2 } from 'lucide-react';
import { exportTailoredPdf } from '../../services/api';
import toast from 'react-hot-toast';

export default function JobDashboard({ resume }) {
  const { analysisStatus, tailoredResume, isTailoring, runTailorResume } = useJobAnalysis();
  const [activeTab, setActiveTab] = useState('ats'); // ats, enhance, cover
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadTailored = async () => {
    if (!tailoredResume) return;
    setIsDownloading(true);
    try {
      const response = await exportTailoredPdf(tailoredResume);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Tailored_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tailored Resume downloaded!');
    } catch {
      toast.error('Failed to download tailored resume');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="mb-12 flex h-full flex-col animate-slide-up">
      <JobInputHub resumeData={resume?.sections} />

      <div className="panel-card flex min-h-[500px] flex-1 flex-col rounded-[1.5rem] p-5">
        
        {/* Tabs */}
        <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-4 border-b border-dark-700 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ats')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'ats' 
              ? 'bg-orange-200/10 text-orange-100' 
              : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            ATS Score
          </button>
          <button
            onClick={() => setActiveTab('enhance')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'enhance' 
              ? 'bg-orange-200/10 text-orange-100' 
              : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Enhancements
          </button>
          <button
            onClick={() => setActiveTab('cover')}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              activeTab === 'cover' 
              ? 'bg-orange-200/10 text-orange-100' 
              : 'text-dark-400 hover:bg-dark-800/50 hover:text-dark-200'
            }`}
          >
            <Mail className="h-4 w-4" />
            Cover Letter
          </button>
        </div>

        {analysisStatus === 'complete' && (
          <div className="flex items-center">
            {tailoredResume ? (
              <button 
                onClick={handleDownloadTailored} 
                disabled={isDownloading}
                className="btn-primary flex items-center gap-2 py-1.5 px-3 text-sm shadow-[0_8px_16px_-8px_rgba(251,146,60,0.85)]"
              >
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Tailored Resume
              </button>
            ) : (
              <button 
                onClick={runTailorResume} 
                disabled={isTailoring}
                className="btn-secondary flex items-center gap-2 py-1.5 px-3 text-sm"
                title="Use AI to completely rewrite and tailor your resume to this JD"
              >
                {isTailoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Generate Tailored Resume
              </button>
            )}
          </div>
        )}
      </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'ats' && <AtsScorePanel />}
          {activeTab === 'enhance' && <EnhancementAdvisor />}
          {activeTab === 'cover' && <CoverLetterGenerator resumeData={resume?.sections} />}
        </div>
        
      </div>
    </div>
  );
}
