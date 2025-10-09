import apiClient from './client';
import { Analytics } from '../types';

export const analyticsAPI = {
  getCourseAnalytics: async (courseId: string): Promise<Analytics> => {
    const response = await apiClient.get<{ analytics: Analytics }>(`/analytics/overview/${courseId}`);
    return response.data.analytics;
  },

  getStudentAnalytics: async (studentId: string): Promise<Analytics> => {
    const response = await apiClient.get<{ analytics: Analytics }>(`/analytics/student/${studentId}`);
    return response.data.analytics;
  },
};

