import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { coursesAPI } from '../../api/courses';
import { Course } from '../../types';

export const InstructorDashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '' });

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await coursesAPI.getAll();
      setCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await coursesAPI.create(newCourse.title, newCourse.description);
      setNewCourse({ title: '', description: '' });
      setShowCreateForm(false);
      loadCourses();
    } catch (error) {
      console.error('Failed to create course:', error);
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary"
          >
            + Create Course
          </button>
        </div>

        {showCreateForm && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Create New Course</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="label">Course Title</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  placeholder="Introduction to Machine Learning"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="Course description..."
                />
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="btn-primary">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {courses.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              Create Your First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="card hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {course.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {course.description || 'No description'}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>
                    {course.file_name ? '📄 Material uploaded' : '📄 No materials'}
                  </span>
                  <span>
                    {course.syllabus ? '✅ Syllabus' : '⏳ No syllabus'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/instructor/course/${course.id}`}
                    className="flex-1 text-center btn-primary text-sm"
                  >
                    Manage
                  </Link>
                  <Link
                    to={`/instructor/analytics/${course.id}`}
                    className="flex-1 text-center btn-secondary text-sm"
                  >
                    Analytics
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

