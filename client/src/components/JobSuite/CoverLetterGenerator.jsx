import React, { useState, useEffect } from 'react';
import { useJobAnalysis } from '../../context/JobAnalysisContext';
import { generateCoverLetter } from '../../services/api';
import { Mail, Settings2, Sparkles, Copy, Download, RefreshCw, Layers, Zap, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CoverLetterGenerator({ resumeData }) {
  const { 
    analysisStatus,
    resumeId,
    jobDescription, 
    jobTitle, 
    companyName, 
    coverLetter, 
    setCoverLetter,
    coverLetterParams, 
    setCoverLetterParams,
    coverLetterHistory,
    setCoverLetterHistory
  } = useJobAnalysis();

  const [generating, setGenerating] = useState(false);
  const [editableLetter, setEditableLetter] = useState(coverLetter?.body || '');
  const [showSettings, setShowSettings] = useState(true);

  // Update editable letter when a new cover letter is set
  useEffect(() => {
    if (coverLetter?.body) {
      setEditableLetter(coverLetter.body);
    }
  }, [coverLetter]);

  const handleGenerate = async () => {
    if (!jobDescription || jobDescription.length < 100) {
      toast.error('Please provide a job description first (min 100 characters)');
      return;
    }

    setGenerating(true);
    try {
      const response = await generateCoverLetter({
        resumeId: resumeId,
        jobDescription: jobDescription,
        jobTitle: jobTitle,
        companyName: companyName,
        tone: coverLetterParams.tone,
        length: coverLetterParams.length,
        style: coverLetterParams.style,
        format: coverLetterParams.format
      });
      
      const newLetter = response.data.data;
      setCoverLetter(newLetter);
      toast.success('Cover letter generated successfully');
      setShowSettings(false);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to generate cover letter';
      toast.error(errorMsg);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!editableLetter) return;
    navigator.clipboard.writeText(editableLetter);
    toast.success('Copied to clipboard');
  };

  const handleDownload = () => {
    toast.error('Download functionality coming soon');
  };

  const isIdle = analysisStatus === 'idle';

  return (
    <div className="space-y-6 animate-fade-in flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: '#111827' }}>
          <Mail className="h-4 w-4 text-blue-500" /> Cover Letter Generator
        </h3>
        {coverLetter && (
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1.5"
          >
            <Settings2 className="h-3.5 w-3.5" /> Parameters
          </button>
        )}
      </div>

      {(showSettings || !coverLetter) && (
        <div className={`rounded-lg p-4 space-y-4 ${isIdle ? 'opacity-60 grayscale-[0.5]' : ''}`} style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Tone</label>
              <select
                value={coverLetterParams.tone}
                onChange={e => setCoverLetterParams({...coverLetterParams, tone: e.target.value})}
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', color: '#111827' }}
              >
                <option>Professional</option>
                <option>Conversational</option>
                <option>Bold</option>
                <option>Academic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Length</label>
              <select
                value={coverLetterParams.length}
                onChange={e => setCoverLetterParams({...coverLetterParams, length: e.target.value})}
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', color: '#111827' }}
              >
                <option>Standard</option>
                <option>Brief</option>
                <option>Detailed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Style</label>
              <select
                value={coverLetterParams.style}
                onChange={e => setCoverLetterParams({...coverLetterParams, style: e.target.value})}
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', color: '#111827' }}
              >
                <option>Story-driven</option>
                <option>Achievement-focused</option>
                <option>Problem-solver</option>
                <option>Straightforward</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Format</label>
              <select
                value={coverLetterParams.format}
                onChange={e => setCoverLetterParams({...coverLetterParams, format: e.target.value})}
                className="w-full rounded-md px-2 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30"
                style={{ border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.85)', color: '#111827' }}
              >
                <option>Modern</option>
                <option>Traditional</option>
                <option>Email</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="w-full btn-primary py-2 flex items-center justify-center gap-2"
          >
            {generating ? (
               <><RefreshCw className="h-4 w-4 animate-spin" /> Generating...</>
            ) : isIdle ? (
               <><Zap className="h-4 w-4" /> Enter Job Description to Generate</>
            ) : (
               <><Sparkles className="h-4 w-4" /> Generate Cover Letter</>
            )}
          </button>
        </div>
      )}

      {coverLetter && !showSettings && (
        <div className="flex-1 flex flex-col mt-4 min-h-0 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Customized Letter
            </h4>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="btn-ghost py-1 px-2 text-xs flex items-center gap-1"><Copy className="h-3 w-3"/> Copy</button>
              <button onClick={handleDownload} className="btn-secondary py-1 px-2 text-xs flex items-center gap-1"><Download className="h-3 w-3"/> DOCX</button>
            </div>
          </div>

          <div className="flex-1 relative rounded-xl bg-white shadow-inner overflow-hidden flex flex-col min-h-[400px]" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="p-6 md:p-8 flex-1 overflow-y-auto">
              <div className="font-serif max-w-2xl mx-auto space-y-4 leading-relaxed whitespace-pre-wrap" style={{ color: '#111827' }}>
                <p>{coverLetter.salutation || 'Dear Hiring Manager,'}</p>

                <textarea
                  value={editableLetter}
                  onChange={(e) => setEditableLetter(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none resize-none rounded-lg font-serif leading-relaxed min-h-[300px] focus:ring-2 focus:ring-blue-400/40"
                  style={{ color: '#111827' }}
                />
                
                <p className="mt-6 pt-2">
                  {coverLetter.closing || 'Sincerely,'}
                  <br /><br />
                  <span className="font-semibold">{coverLetter.signature || resumeData?.personalInfo?.name}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIdle && !coverLetter && (
        <div className="flex-1 flex items-center justify-center py-12 text-center rounded-xl mt-4" style={{ color: '#6b7280', border: '1px dashed rgba(0,0,0,0.15)' }}>
           <div className="flex flex-col items-center">
             <Zap className="h-10 w-10 mb-3 opacity-20" />
             <p className="text-sm">Enter job details in the panel above to unlock the AI generator.</p>
           </div>
        </div>
      )}
    </div>
  );
}
