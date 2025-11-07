import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { analyticsAPI } from '../../api/analytics';
import { coursesAPI } from '../../api/courses';
import { Analytics as AnalyticsType, Course } from '../../types';

export const Analytics = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    
    try {
      const [courseData, analyticsData] = await Promise.all([
        coursesAPI.getById(id),
        analyticsAPI.getCourseAnalytics(id)
      ]);
      
      setCourse(courseData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading analytics...</div>
      </Layout>
    );
  }

  if (!analytics) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-600">No analytics data available yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Create assessments and wait for students to complete them.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Analytics</h1>
          <p className="text-gray-600 mt-2">{course?.title}</p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm font-medium text-gray-500">Total Assessments</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.totalAssessments}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">Total Attempts</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.totalAttempts}
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">Average Score</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.overallAverageScore?.toFixed(1) || 0}%
            </div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-500">Pass Rate</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.overallAverageScore && analytics.overallAverageScore >= 60 ? '✅' : '⚠️'} 
              {' '}{analytics.overallAverageScore && analytics.overallAverageScore >= 60 ? 'Good' : 'Needs Attention'}
            </div>
          </div>
        </div>

        {/* Weak Topics */}
        {analytics.weakTopics && analytics.weakTopics.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Topics Needing Attention</h2>
            <div className="space-y-3">
              {analytics.weakTopics.map((topic, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded">
                  <span className="font-medium">{topic.topic}</span>
                  <span className="text-red-600">
                    {topic.averageAccuracy.toFixed(1)}% accuracy
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Assessment Breakdown */}
        {analytics.assessments && analytics.assessments.length > 0 && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Assessment Performance</h2>
            <div className="space-y-4">
              {analytics.assessments.map((assessment: any, index: number) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4 py-2">
                  <h3 className="font-semibold">{assessment.assessmentTitle}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                    <div>
                      <span className="text-gray-500">Attempts:</span>
                      <span className="ml-2 font-medium">{assessment.totalAttempts}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Avg Score:</span>
                      <span className="ml-2 font-medium">{assessment.averageScore}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Highest:</span>
                      <span className="ml-2 font-medium text-green-600">{assessment.highestScore}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Lowest:</span>
                      <span className="ml-2 font-medium text-red-600">{assessment.lowestScore}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

