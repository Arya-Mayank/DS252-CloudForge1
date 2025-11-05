import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { InstructorDashboard } from './pages/instructor/Dashboard';
import { CourseBuilder } from './pages/instructor/CourseBuilder';
import { Analytics } from './pages/instructor/Analytics';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentCourseView } from './pages/student/CourseView';
import { TakeAssessment } from './pages/student/TakeAssessment';
import { AssessmentResults } from './pages/student/AssessmentResults';
import { AssessmentAnalysis } from './pages/student/AssessmentAnalysis';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Instructor Routes */}
          <Route
            path="/instructor"
            element={
              <ProtectedRoute requireInstructor>
                <InstructorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/course/:id"
            element={
              <ProtectedRoute requireInstructor>
                <CourseBuilder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/analytics/:id"
            element={
              <ProtectedRoute requireInstructor>
                <Analytics />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requireStudent>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute requireStudent>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/course/:id"
            element={
              <ProtectedRoute requireStudent>
                <StudentCourseView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assessment/:assessmentId"
            element={
              <ProtectedRoute requireStudent>
                <TakeAssessment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assessment/:assessmentId/results/:attemptId"
            element={
              <ProtectedRoute requireStudent>
                <AssessmentResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/assessment/:assessmentId/analyze"
            element={
              <ProtectedRoute requireStudent>
                <AssessmentAnalysis />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

