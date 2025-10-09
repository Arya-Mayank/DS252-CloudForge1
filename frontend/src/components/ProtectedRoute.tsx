import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireInstructor?: boolean;
  requireStudent?: boolean;
}

export const ProtectedRoute = ({ children, requireInstructor, requireStudent }: ProtectedRouteProps) => {
  const { isAuthenticated, isInstructor, isStudent, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireInstructor && !isInstructor) {
    return <Navigate to="/student" replace />;
  }

  if (requireStudent && !isStudent) {
    return <Navigate to="/instructor" replace />;
  }

  return <>{children}</>;
};

