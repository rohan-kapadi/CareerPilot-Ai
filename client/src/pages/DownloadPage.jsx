import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { exportDocx, exportPdf, exportEmail } from '../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react';
import {
  getAuthToken,
  getStoredUser,
  requireAuth,
} from '../utils/auth';

export default function DownloadPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const [loadingDocx, setLoadingDocx] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    requireAuth(navigate);
  }, [navigate]);

  const token = getAuthToken();
  if (!token) return null;

  const user = getStoredUser() || {};

  const downloadBlob = (data, type, filename) => {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDocx = async () => {
    setLoadingDocx(true);
    try {
      const response = await exportDocx(resumeId);
      downloadBlob(
        response.data,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Resume.docx'
      );
      toast.success('DOCX downloaded!');
    } catch {
      toast.error('Failed to generate DOCX');
    } finally {
      setLoadingDocx(false);
    }
  };

  const handlePdf = async () => {
    setLoadingPdf(true);
    try {
      const response = await exportPdf(resumeId);
      downloadBlob(response.data, 'application/pdf', 'Resume.pdf');
      toast.success('PDF downloaded!');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleEmail = async () => {
    if (!user.email) {
      toast.error('No email found in your profile');
      return;
    }

    setLoadingEmail(true);
    try {
      await exportEmail(resumeId, user.email);
      setEmailSent(true);
      toast.success(`Resume sent to ${user.email}`);
    } catch {
      toast.error('Failed to send email');
    } finally {
      setLoadingEmail(false);
    }
  };

  const exportActions = [
    {
      id: 'download-docx-btn',
      title: 'Download DOCX',
      description: 'Editable Word format for custom edits.',
      icon: FileText,
      iconColor: 'text-amber-600',
      hoverClass: 'hover:border-amber-300/60 hover:bg-amber-200/15',
      loading: loadingDocx,
      onClick: handleDocx,
      disabled: false,
    },
    {
      id: 'download-pdf-btn',
      title: 'Download PDF',
      description: 'Print-ready layout for direct applications.',
      icon: FileDown,
      iconColor: 'text-orange-600',
      hoverClass: 'hover:border-orange-300/60 hover:bg-orange-200/15',
      loading: loadingPdf,
      onClick: handlePdf,
      disabled: false,
    },
    {
      id: 'email-resume-btn',
      title: emailSent ? 'Email sent' : 'Email to me',
      description: emailSent
        ? `Sent to ${user.email}`
        : `Send both files to ${user.email || 'your account email'}`,
      icon: emailSent ? CheckCircle2 : Mail,
      iconColor: 'text-teal-600',
      hoverClass: 'hover:border-teal-300/60 hover:bg-teal-200/15',
      loading: loadingEmail,
      onClick: handleEmail,
      disabled: emailSent,
    },
  ];

  return (
    <div className="app-shell flex flex-col">
      <header className="bg-white/75 backdrop-blur-md border-b border-black/5 z-40 py-2">
        <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button onClick={() => navigate(`/editor/${resumeId}`)} className="btn-ghost flex items-center gap-2 px-3 py-2">
              <span className="hidden sm:inline">← Back to editor</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="brand-mark h-9 w-9 rounded-xl">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-display text-base font-semibold" style={{ color: '#111827' }}>Export Resume</span>
            </div>
          </div>
        </div>
      </header>

      <main className="page-wrap flex flex-1 items-center py-8">
        <div className="w-full animate-fade-in">
          <section className="panel-card-strong p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="brand-mark mx-auto h-16 w-16 rounded-2xl">
                <Download className="h-8 w-8" />
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold" style={{ color: '#111827' }}>Export your resume</h1>
              <p className="mt-2" style={{ color: '#6b7280' }}>
                Download polished files instantly or email them directly to your account.
              </p>
            </div>

            <div className="space-y-4">
              {exportActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    id={action.id}
                    onClick={action.onClick}
                    disabled={action.loading || action.disabled}
                    className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${action.hoverClass}`}
                    style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.02)' }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border" style={{ borderColor: 'rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.7)' }}>
                      {action.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <Icon className={`h-5 w-5 ${action.iconColor}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold" style={{ color: '#111827' }}>{action.title}</h3>
                      <p className="text-sm" style={{ color: '#6b7280' }}>{action.description}</p>
                    </div>
                    <ArrowLeft className="ml-auto h-4 w-4 rotate-180 transition-transform group-hover:translate-x-0.5" style={{ color: '#9ca3af' }} />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl px-4 py-3 text-sm" style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(0,0,0,0.025)', color: '#6b7280' }}>
              Tip: Export after running ATS analysis to ensure your resume reflects the latest skill edits.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
