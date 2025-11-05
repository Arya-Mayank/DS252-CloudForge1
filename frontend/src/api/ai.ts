import apiClient from './client';
import { SyllabusItem, Question, Recommendation } from '../types';

export const aiAPI = {
  generateSyllabus: async (courseId: string, documentText: string, updateExisting: boolean = false): Promise<SyllabusItem[]> => {
    const response = await apiClient.post<{ syllabus: SyllabusItem[] }>('/ai/syllabus', {
      courseId,
      documentText,
      updateExisting,
    });
    return response.data.syllabus;
  },

  generateAssessment: async (courseId: string, topics: string[], questionCount: number = 10, assessmentTitle?: string): Promise<{ assessment: any; questions: Question[] }> => {
    const response = await apiClient.post('/ai/assessment', {
      courseId,
      topics,
      questionCount,
      assessmentTitle,
    });
    return response.data;
  },

  getRecommendations: async (studentId?: string, courseId?: string): Promise<Recommendation[]> => {
    const response = await apiClient.post<{ recommendations: Recommendation[] }>('/ai/recommend', {
      studentId,
      courseId,
    });
    return response.data.recommendations;
  },

  searchContent: async (query: string, courseId?: string): Promise<any[]> => {
    const response = await apiClient.post<{ results: any[] }>('/ai/search', {
      query,
      courseId,
    });
    return response.data.results;
  },
};

