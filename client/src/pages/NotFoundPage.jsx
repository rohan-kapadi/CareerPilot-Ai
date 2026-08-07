/**
 * NotFoundPage
 *
 * Catch-all for unmatched URLs. Without a `*` route, React Router renders
 * nothing and the user sees a blank page with no way back.
 */
import { Link, useLocation } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';

export default function NotFoundPage() {
  const location = useLocation();
  const isLoggedIn = Boolean(getAuthToken());

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <span className="block text-5xl opacity-50">🧭</span>
        <div>
          <h1 className="text-2xl font-bold text-white">Page not found</h1>
          <p className="mt-2 text-sm text-gray-400">
            Nothing lives at <span className="font-mono text-gray-300">{location.pathname}</span>.
          </p>
        </div>
        <Link
          to={isLoggedIn ? '/dashboard' : '/login'}
          className="inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          {isLoggedIn ? '← Back to dashboard' : 'Go to sign in'}
        </Link>
      </div>
    </div>
  );
}
