import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isInstructor = user?.role === 'instructor';
  const containerClass = isInstructor
    ? 'w-full px-4 sm:px-6 lg:px-10'
    : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className={containerClass}>
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">DoodleOnMoodle</h1>
              <span className="ml-4 px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full">
                {user?.role === 'instructor' ? 'Instructor' : 'Student'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                {user?.first_name || user?.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`${containerClass} py-8`}>
        {children}
      </main>
    </div>
  );
};

