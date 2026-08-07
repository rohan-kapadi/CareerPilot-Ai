/**
 * ProtectedRoute
 *
 * Single auth gate for every signed-in route. Before this existed, guards were
 * applied per page in three different styles and eight pages had none at all —
 * visiting those logged-out fired API calls that 401'd, flashing error toasts
 * before the axios interceptor bounced the user to /login.
 *
 * Redirecting here happens *before* the page renders, so no request is ever
 * made without a token. The attempted URL is preserved in location state so
 * LoginPage can send the user back to where they were headed.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../../utils/auth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = getAuthToken();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
}
