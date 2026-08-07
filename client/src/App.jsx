import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import UploadPage from './pages/UploadPage';
import EditorPage from './pages/EditorPage';
import DownloadPage from './pages/DownloadPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import JDViewerPage from './pages/JDViewerPage';
import ResumeViewerPage from './pages/ResumeViewerPage';
import CareerAssistantPage from './pages/CareerAssistantPage';
import ResumeBuilderPage from './pages/ResumeBuilderPage';
import MemoryDashboardPage from './pages/MemoryDashboardPage';
import ExplainabilityPage from './pages/ExplainabilityPage';
import PrivacyDashboardPage from './pages/PrivacyDashboardPage';
import AISuggestionsPage from './pages/AISuggestionsPage';
import RoadmapPage from './pages/RoadmapPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { MemoryProvider } from './context/MemoryContext';
import { getAuthToken } from './utils/auth';

const THEME_KEY = 'roleready_theme';

function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toastStyle = useMemo(() => {
    if (theme === 'light') {
      return {
        background: 'rgba(248, 250, 252, 0.95)',
        color: '#1e293b',
        border: '1px solid rgba(148, 163, 184, 0.45)',
        borderRadius: '14px',
        backdropFilter: 'blur(12px)',
      };
    }

    return {
      background: 'rgba(10, 25, 47, 0.92)',
      color: '#e2e8f0',
      border: '1px solid rgba(56, 189, 248, 0.25)',
      borderRadius: '14px',
      backdropFilter: 'blur(12px)',
    };
  }, [theme]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <MemoryProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: toastStyle,
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: theme === 'light' ? '#0f172a' : '#e2e8f0',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: theme === 'light' ? '#0f172a' : '#f1f5f9',
              },
            },
          }}
        />
        <Routes>
          {/* Root sends signed-in users to their dashboard, everyone else to sign in */}
          <Route
            path="/"
            element={<Navigate to={getAuthToken() ? '/dashboard' : '/login'} replace />}
          />

          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — the guard runs before the page renders, so no
              authenticated request is ever fired without a token. */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/editor/:resumeId" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
          <Route path="/download/:resumeId" element={<ProtectedRoute><DownloadPage /></ProtectedRoute>} />
          <Route path="/resume/:id" element={<ProtectedRoute><ResumeViewerPage /></ProtectedRoute>} />
          <Route path="/jd/new" element={<ProtectedRoute><JDViewerPage /></ProtectedRoute>} />
          <Route path="/jd/:id" element={<ProtectedRoute><JDViewerPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><CareerAssistantPage /></ProtectedRoute>} />
          <Route path="/chat/:conversationId" element={<ProtectedRoute><CareerAssistantPage /></ProtectedRoute>} />
          <Route path="/builder" element={<ProtectedRoute><ResumeBuilderPage /></ProtectedRoute>} />
          <Route path="/builder/:resumeId" element={<ProtectedRoute><ResumeBuilderPage /></ProtectedRoute>} />
          <Route path="/memory" element={<ProtectedRoute><MemoryDashboardPage /></ProtectedRoute>} />
          <Route path="/explain/:matchId" element={<ProtectedRoute><ExplainabilityPage /></ProtectedRoute>} />
          <Route path="/privacy" element={<ProtectedRoute><PrivacyDashboardPage /></ProtectedRoute>} />
          <Route path="/suggestions" element={<ProtectedRoute><AISuggestionsPage /></ProtectedRoute>} />
          <Route path="/roadmap/:skillGapId" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

          {/* Catch-all — without this an unknown URL renders a blank page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryProvider>
    </BrowserRouter>
  );
}

export default App;
