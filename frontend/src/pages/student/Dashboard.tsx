import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { coursesAPI } from '../../api/courses';
import { aiAPI } from '../../api/ai';
import { Course, Recommendation } from '../../types';
import { useAuth } from '../../hooks/useAuth';

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'browse'>('enrolled');
  const [leavingCourseId, setLeavingCourseId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [enrolled, all] = await Promise.all([
        coursesAPI.getAll(), // Enrolled courses
        coursesAPI.getAllCourses(), // All courses
      ]);
      
      setEnrolledCourses(enrolled);
      
      // Filter out already enrolled courses
      const enrolledIds = new Set(enrolled.map(c => c.id));
      setAvailableCourses(all.filter(c => !enrolledIds.has(c.id)));

      // Load recommendations if student has results
      try {
        const recs = await aiAPI.getRecommendations();
        setRecommendations(recs);
      } catch (error) {
        // No recommendations yet
        console.log('No recommendations available');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      await coursesAPI.enroll(courseId);
      // Reload data to update course lists
      await loadData();
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      
      // Show more specific error message from backend
      const errorMessage = error?.response?.data?.error || error?.response?.data?.details || 'Failed to enroll in course';
      alert(errorMessage);
    }
  };

  const handleUnenroll = async (courseId: string, courseTitle: string) => {
    const confirmed = window.confirm(
      `Leave "${courseTitle}"?\n\nYou will lose access to its materials and assessments until you enroll again.`
    );
    if (!confirmed) {
      return;
    }

    try {
      setLeavingCourseId(courseId);
      await coursesAPI.unenroll(courseId);
      await loadData();
    } catch (error: any) {
      console.error('Failed to unenroll:', error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.details ||
        'Failed to leave course. Please try again.';
      alert(errorMessage);
    } finally {
      setLeavingCourseId(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.first_name || 'Student'}!</p>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="card bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <h2 className="text-xl font-semibold mb-4 text-primary-900">
              🎯 Personalized Recommendations
            </h2>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec, index) => (
                <div key={index} className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{rec.topic}</h3>
                      <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                      <div className="mt-2 text-sm text-gray-700">
                        <strong>Suggested resources:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {rec.resources.slice(0, 2).map((resource, i) => (
                            <li key={i}>{resource}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        rec.priority === 'high'
                          ? 'bg-red-100 text-red-700'
                          : rec.priority === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {rec.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'enrolled'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Courses ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'browse'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Courses ({availableCourses.length})
            </button>
          </nav>
        </div>

        {/* Enrolled Courses */}
        {activeTab === 'enrolled' && (
          <div>
            {enrolledCourses.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="btn-primary"
                >
                  Browse Available Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
                  <div
                    key={course.id}
                    className="card hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/student/course/${course.id}`)}
                  >
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {course.description || 'No description'}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-500">
                        {course.file_name ? '📄 Course materials available' : '📄 No materials yet'}
                      </div>
                      {course.is_published && (
                        <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                          ✓ Syllabus
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/student/course/${course.id}`);
                        }}
                        className="flex-1 btn-primary text-sm"
                      >
                        View Course
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleUnenroll(course.id, course.title);
                        }}
                        disabled={leavingCourseId === course.id}
                        className={`flex-1 text-sm border rounded-md px-3 py-2 transition-colors ${
                          leavingCourseId === course.id
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >
                        {leavingCourseId === course.id ? 'Leaving...' : 'Leave Course'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Courses */}
        {activeTab === 'browse' && (
          <div>
            {availableCourses.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-500">No new courses available at the moment.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableCourses.map((course) => (
                  <div key={course.id} className="card hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {course.description || 'No description'}
                    </p>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="w-full btn-primary text-sm"
                    >
                      Enroll Now
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
