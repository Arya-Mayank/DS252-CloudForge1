import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { coursesAPI } from '../../api/courses';
import { assessmentsAPI, Assessment } from '../../api/assessments';
import { studentAssessmentsAPI, StudentAttempt } from '../../api/student-assessments';
import { Course } from '../../types';

export const StudentCourseView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'materials' | 'assessments'>('syllabus');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);
  const [studentAttempts, setStudentAttempts] = useState<{ [assessmentId: string]: StudentAttempt[] }>({});
  const [completedAssessmentId, setCompletedAssessmentId] = useState<string | null>(null);

  useEffect(() => {
    loadCourse();
    
    // Check if we just completed an assessment
    const urlParams = new URLSearchParams(location.search);
    const assessmentCompleted = urlParams.get('assessmentCompleted');
    if (assessmentCompleted) {
      setCompletedAssessmentId(assessmentCompleted);
      setActiveTab('assessments'); // Switch to assessments tab
      // Clear the URL parameter
      navigate(location.pathname, { replace: true });
    }
  }, [id, location.search, location.pathname, navigate]);

  useEffect(() => {
    if (activeTab === 'assessments') {
      loadAssessments();
    }
  }, [activeTab, id]);

  const loadCourse = async () => {
    if (!id) return;
    try {
      const data = await coursesAPI.getById(id);
      setCourse(data);
    } catch (error) {
      console.error('Failed to load course:', error);
      alert('Failed to load course');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadAssessments = async () => {
    if (!id) return;
    setLoadingAssessments(true);
    try {
      const data = await assessmentsAPI.getByCourseId(id);
      // Only show published assessments to students
      const publishedAssessments = data.filter(assessment => assessment.is_published);
      setAssessments(publishedAssessments);

      // Load student attempts for each assessment
      const attemptsMap: { [assessmentId: string]: StudentAttempt[] } = {};
      for (const assessment of publishedAssessments) {
        try {
          const attemptsData = await studentAssessmentsAPI.getStudentAttempts(assessment.id);
          attemptsMap[assessment.id] = attemptsData.attempts;
        } catch (error) {
          console.error(`Failed to load attempts for assessment ${assessment.id}:`, error);
          attemptsMap[assessment.id] = [];
        }
      }
      setStudentAttempts(attemptsMap);
    } catch (error) {
      console.error('Failed to load assessments:', error);
      setAssessments([]);
    } finally {
      setLoadingAssessments(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-gray-600">Loading course...</div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">Course not found</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const hasSyllabus = course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0;
  const isSyllabusPublished = course.is_published;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            {course.description && course.description.length < 500 && (
              <p className="text-gray-600 mt-2">{course.description}</p>
            )}
            
            {isSyllabusPublished && (
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Syllabus Available
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('syllabus')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'syllabus'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📄 Course Syllabus
            </button>
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📚 Course Materials
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assessments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              ✏️ Assessments
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Syllabus Tab */}
          {activeTab === 'syllabus' && (
            <div>
              {!hasSyllabus ? (
                <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No syllabus available yet</h3>
                  <p className="mt-2 text-gray-500">
                    The instructor hasn't published the course syllabus yet. Check back soon!
                  </p>
                </div>
              ) : !isSyllabusPublished ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Syllabus Not Published</h3>
                  <p className="mt-2 text-gray-600">
                    The instructor is still working on the course syllabus. It will be available soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-primary-900">Course Syllabus</h2>
                    <p className="text-sm text-primary-700 mt-1">
                      Below is the detailed breakdown of topics and subtopics for this course.
                    </p>
                  </div>

                  {course.syllabus.map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">{item.topic}</h3>
                          <span className="text-sm text-gray-600">
                            {item.subtopics.length} subtopic{item.subtopics.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="px-6 py-4">
                        <ul className="space-y-2">
                          {item.subtopics.map((subtopic: string, subIndex: number) => (
                            <li key={subIndex} className="flex items-start space-x-3">
                              <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-gray-700">{subtopic}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Materials Tab */}
          {activeTab === 'materials' && (
            <div className="bg-white rounded-xl p-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Materials</h2>
              {course.file_url ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{course.file_name || 'Course Material'}</p>
                        <p className="text-sm text-gray-500">Uploaded by instructor</p>
                      </div>
                    </div>
                    <a
                      href={course.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No course materials uploaded yet</p>
                </div>
              )}
            </div>
          )}

          {/* Assessments Tab */}
          {activeTab === 'assessments' && (
            <div>
              {loadingAssessments ? (
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600">Loading assessments...</p>
                </div>
              ) : assessments.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-gray-200 text-center">
                  <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Assessments Available</h3>
                  <p className="mt-2 text-gray-500">
                    The instructor hasn't published any assessments yet. Check back soon!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Success Banner for Completed Assessment */}
                  {completedAssessmentId && (() => {
                    const completedAssessment = assessments.find(a => a.id === completedAssessmentId);
                    const attempts = studentAttempts[completedAssessmentId] || [];
                    const completedAttempt = attempts.find(attempt => attempt.is_completed);
                    
                    if (completedAssessment && completedAttempt) {
                      return (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-green-900 mb-2">
                                🎉 Assessment Completed Successfully!
                              </h3>
                              <p className="text-green-800 mb-3">
                                You've completed <strong>{completedAssessment.title}</strong>
                              </p>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <p className="text-sm text-green-600">Score</p>
                                  <p className="text-2xl font-bold text-green-900">
                                    {completedAttempt.score || 0}/{completedAttempt.total_points || 0}
                                  </p>
                                  <p className="text-sm text-green-600">
                                    ({Math.round((completedAttempt.score || 0) / (completedAttempt.total_points || 1) * 100)}%)
                                  </p>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-green-200">
                                  <p className="text-sm text-green-600">Time Taken</p>
                                  <p className="text-2xl font-bold text-green-900">
                                    {completedAttempt.time_taken_minutes || 0}m
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => navigate(`/student/assessment/${completedAssessmentId}/analyze`)}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                <span>Analyze Your Performance</span>
                              </button>
                            </div>
                            <button
                              onClick={() => setCompletedAssessmentId(null)}
                              className="flex-shrink-0 text-green-400 hover:text-green-600"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold text-green-900">Available Assessments</h2>
                    <p className="text-sm text-green-700 mt-1">
                      Below are the published assessments and quizzes for this course.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.map((assessment) => (
                      <div
                        key={assessment.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                      >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {assessment.title}
                              </h3>
                              <div className="flex items-center space-x-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Published
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="px-6 py-4 space-y-4">
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">{assessment.mcq_count}</div>
                              <div className="text-xs text-gray-600 mt-1">MCQ</div>
                            </div>
                            <div className="text-center p-3 bg-purple-50 rounded-lg">
                              <div className="text-2xl font-bold text-purple-600">{assessment.msq_count}</div>
                              <div className="text-xs text-gray-600 mt-1">MSQ</div>
                            </div>
                            <div className="text-center p-3 bg-orange-50 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600">{assessment.subjective_count}</div>
                              <div className="text-xs text-gray-600 mt-1">Subjective</div>
                            </div>
                          </div>

                          {/* Total Questions */}
                          <div className="flex items-center justify-between py-2 border-t border-gray-200">
                            <span className="text-sm font-medium text-gray-700">Total Questions</span>
                            <span className="text-lg font-bold text-gray-900">{assessment.total_questions}</span>
                          </div>

                          {/* Published Date */}
                          {assessment.published_at && (
                            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                              Published {new Date(assessment.published_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                          {(() => {
                            const attempts = studentAttempts[assessment.id] || [];
                            const completedAttempt = attempts.find(attempt => attempt.is_completed);
                            
                            if (completedAttempt) {
                              return (
                                <div className="space-y-3">
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-green-800">Completed!</p>
                                        <p className="text-xs text-green-600">
                                          Score: {completedAttempt.score || 0}/{completedAttempt.total_points || 0} 
                                          ({Math.round((completedAttempt.score || 0) / (completedAttempt.total_points || 1) * 100)}%)
                                        </p>
                                      </div>
                                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => navigate(`/student/assessment/${assessment.id}/analyze`)}
                                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <span>Analyze Quiz</span>
                                  </button>
                                </div>
                              );
                            } else {
                              return (
                                <button 
                                  onClick={() => navigate(`/student/assessment/${assessment.id}`)}
                                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  <span>Start Assessment</span>
                                </button>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

