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
import GlobalLayout from './components/layout/GlobalLayout';
import { MemoryProvider } from './context/MemoryContext';
import { getAuthToken } from './utils/auth';

const toastStyle = {
  background: 'rgba(248, 250, 252, 0.95)',
  color: '#1e293b',
  border: '1px solid rgba(148, 163, 184, 0.45)',
  borderRadius: '14px',
  backdropFilter: 'blur(12px)',
};

function App() {
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
                secondary: '#0f172a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#0f172a',
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
          <Route element={<GlobalLayout />}>
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
          </Route>

          {/* Catch-all — without this an unknown URL renders a blank page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MemoryProvider>
    </BrowserRouter>
  );
}

export default App;
