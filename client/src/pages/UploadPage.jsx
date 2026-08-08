import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { uploadResume } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FileType2,
  Shield,
  Sparkles,
  Upload,
} from 'lucide-react';
import { JobAnalysisProvider } from '../context/JobAnalysisContext';
import {
  getAuthToken,
  getDisplayName,
  getStoredUser,
  getUserInitial,
  requireAuth,
} from '../utils/auth';
import { addCachedResume } from '../utils/resumeStore';

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedResume, setParsedResume] = useState(null);

  useEffect(() => {
    requireAuth(navigate);
  }, [navigate]);

  const token = getAuthToken();
  if (!token) return null;

  const user = getStoredUser();
  const userName = getDisplayName(user);
  const userInitial = getUserInitial(user);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');

    const formData = new FormData();
    formData.append('file', file);
    formData._onProgress = (p) => setProgress(p);

    setUploading(true);
    setProgress(0);

    try {
      const { data } = await uploadResume(formData);
      toast.success(data.message);
      setParsedResume(data.data);

      // Make the new resume immediately selectable on the dashboard, JD matcher,
      // suggestions picker and career chat.
      addCachedResume({
        _id: data.data.resumeId,
        originalFileName: file.name,
        atsScore: null,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveToDB = () => {
    if (!parsedResume) return;
    toast.success('Resume saved to database');
    navigate(`/editor/${parsedResume.resumeId}`);
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="w-12 h-12 text-primary-400" />;
    return file.name.endsWith('.pdf')
      ? <FileText className="w-12 h-12 text-red-400" />
      : <FileType2 className="w-12 h-12 text-blue-400" />;
  };

  return (
    <JobAnalysisProvider resumeId={parsedResume?.resumeId}>
      <div className="app-shell min-h-screen flex flex-col overflow-y-auto">
        <main className="page-wrap py-8 space-y-12">
          {/* Step 1: Upload */}
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="panel-card-strong relative overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute -right-20 -top-16 h-48 w-48 rounded-full bg-orange-300/15 blur-3xl" />
              <div className="flex items-center gap-3 mb-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-300 text-dark-950 font-bold text-sm">1</span>
                <span className="section-kicker">Upload Source</span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Start with your current resume.
              </h1>
              <p style={{ color: '#6b7280', maxWidth: '480px', lineHeight: 1.7 }}>
                Drag and drop your latest file. We'll extract your history and skills for AI optimization.
              </p>

              <div
                {...getRootProps()}
                className={`mt-7 cursor-pointer rounded-3xl p-8 text-center transition-all duration-300
                  ${isDragActive
                    ? 'border-orange-200 bg-orange-200/10'
                    : file
                      ? 'border-emerald-400/60 bg-emerald-500/10'
                      : 'hover:bg-black/5'
                  }`}
                style={{ border: isDragActive || file ? '1px dashed' : '1px dashed rgba(0,0,0,0.15)', background: isDragActive || file ? '' : 'rgba(0,0,0,0.02)' }}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {getFileIcon()}
                  </div>
                  {file ? (
                    <p className="max-w-full truncate text-sm" style={{ color: '#374151', fontWeight: 500 }}>{file.name}</p>
                  ) : (
                    <p className="text-lg font-semibold" style={{ color: '#111827' }}>Drop PDF or DOCX</p>
                  )}
                </div>
              </div>

              {!parsedResume && (
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 shadow-[0_16px_28px_-14px_rgba(251,146,60,0.72)]"
                >
                  {uploading ? (
                    <>Parsing Resume...</>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Initialize Profile
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </section>

            <section className="space-y-6">
              {parsedResume ? (
                <article className="panel-card border-emerald-400/30 bg-emerald-500/5 p-6 animate-slide-up">
                  <div className="mb-5 flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    <div>
                      <h2 style={{ fontWeight: 700, color: '#111827' }}>Profile Ready</h2>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Basic extraction complete.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSaveToDB}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    Open Full Editor <ArrowRight className="h-4 w-4" />
                  </button>
                </article>
              ) : (
                <article className="panel-card p-6" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <h2 style={{ fontWeight: 700, color: '#111827', marginBottom: '1rem', fontSize: '1.05rem' }}>Quick Start Guide</h2>
                  <ul className="space-y-4 text-sm" style={{ color: '#4b5563' }}>
                    <li className="flex gap-3">
                      <span style={{ color: '#d97706', fontWeight: 800 }}>01</span>
                      <span>Upload your PDF or DOCX file first.</span>
                    </li>
                    <li className="flex gap-3">
                      <span style={{ color: '#d97706', fontWeight: 800 }}>02</span>
                      <span>Enter the job description in the panel below.</span>
                    </li>
                    <li className="flex gap-3">
                      <span style={{ color: '#d97706', fontWeight: 800 }}>03</span>
                      <span>Generate ATS insights and a custom cover letter.</span>
                    </li>
                  </ul>
                </article>
              )}
              <article className="panel-card p-5" style={{ background: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(0,0,0,0.1)' }}>
                <div className="flex items-center gap-3 text-xs" style={{ color: '#6b7280' }}>
                  <Shield className="h-4 w-4" />
                  Your data is encrypted and used only for your session.
                </div>
              </article>
            </section>
          </div>


          <footer style={{ textAlign: 'center', padding: '2rem 1rem', color: '#9ca3af', fontSize: '0.78rem', borderTop: '1px solid rgba(0,0,0,0.07)', marginTop: '2rem' }}>
            &copy; 2026 CareerPilot AI — Premium Intelligence Suite
          </footer>
        </main>
      </div>
    </JobAnalysisProvider>
  );
}
