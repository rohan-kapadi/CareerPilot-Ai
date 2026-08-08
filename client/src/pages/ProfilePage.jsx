import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserProfile, putUserProfile, exportProfilePdf } from '../services/api';
import toast from 'react-hot-toast';
import {
  Award,
  Code2,
  Loader2,
  Mail,
  PencilLine,
  Save,
  Sparkles,
  User,
  X,
  Download,
} from 'lucide-react';
import ResumeEditor from '../components/ResumeEditor';
import {
  getAuthToken,
  getDisplayName,
  getStoredUser,
  getUserInitial,
  requireAuth,
} from '../utils/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!requireAuth(navigate)) {
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data } = await getUserProfile();
        setProfile(data.data);
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [navigate]);

  const token = getAuthToken();
  if (!token) return null;

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="panel-card flex items-center gap-3 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          <span className="text-sm" style={{ color: '#374151' }}>Loading profile...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="app-shell flex items-center justify-center px-6">
        <div className="panel-card w-full max-w-md p-6 text-center">
          <p style={{ color: '#374151' }}>We could not load your profile right now.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-secondary mt-5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const localUser = getStoredUser();
  const displayName = getDisplayName(localUser || profile);
  const userInitial = getUserInitial(localUser || profile);
  const skills = profile?.skills || [];

  const handleUpdateSection = (sectionKey, value) => {
    setProfile((prev) => ({
      ...prev,
      [sectionKey]: value,
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        personalInfo: profile.personalInfo,
        summary: profile.summary,
        experience: profile.experience,
        education: profile.education,
        projects: profile.projects,
      };
      await putUserProfile(payload);
      toast.success('Profile saved successfully');
      setIsEditing(false);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const response = await exportProfilePdf();
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${displayName || 'Profile'}_Resume.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Resume downloaded!');
    } catch {
      toast.error('Failed to download resume');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="app-shell">
      <main className="page-wrap py-8 animate-fade-in">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="panel-card-strong overflow-hidden">
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(59,130,246,0.06))', padding: '1.5rem' }}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div style={{ display: 'flex', width: '4rem', height: '4rem', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.8)', fontSize: '1.5rem', fontWeight: 800, color: '#374151' }}>
                    {userInitial}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9ca3af', marginBottom: '0.2rem' }}>Global profile</p>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{displayName}</h1>
                    <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: '#6b7280' }}>
                      <Mail className="h-4 w-4" />
                      {profile?.email || localUser?.email || 'No email available'}
                    </p>
                  </div>
                </div>
                <div className="pill" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)', color: '#1d4ed8' }}>
                  <Award className="h-4 w-4" />
                  {skills.length} skills tracked
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm" style={{ color: '#6b7280' }}>
                Your profile acts as the master record. Uploading a new resume refreshes sections so your
                latest details stay in sync.
              </p>

              {!isEditing ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary flex items-center gap-2 shadow-[0_16px_28px_-16px_rgba(251,146,60,0.85)]"
                  >
                    <PencilLine className="h-4 w-4" />
                    Edit profile sections
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="btn-secondary flex items-center gap-2"
                  >
                    {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download ATS Resume
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save changes
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="panel-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-2.5">
                <Code2 className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: '#111827' }}>Skill inventory</h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>Combined from your parsed resumes and extension updates.</p>
              </div>
            </div>

            {skills.length === 0 ? (
              <p className="rounded-2xl px-4 py-6 text-center text-sm" style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)', color: '#6b7280' }}>
                No skills yet. Upload a resume or add missing skills from job analysis.
              </p>
            ) : (
              <div className="flex max-h-[380px] flex-wrap gap-2 overflow-y-auto rounded-2xl p-4" style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)' }}>
                {skills.map((skill) => (
                  <span key={skill} className="chip chip--neutral">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {isEditing && (
          <section className="panel-card mt-6 p-6">
            <div className="mb-5 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              <h2 className="font-display text-xl font-semibold" style={{ color: '#111827' }}>Edit global profile sections</h2>
            </div>
            <ResumeEditor sections={profile} onUpdateSection={handleUpdateSection} />
          </section>
        )}
      </main>
    </div>
  );
}
