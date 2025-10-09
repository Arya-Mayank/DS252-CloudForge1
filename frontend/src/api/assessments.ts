import apiClient from './client';

export interface Assessment {
  id: string;
  course_id: string;
  instructor_id: string;
  title: string;
  description?: string;
  is_published: boolean;
  published_at?: string;
  total_questions: number;
  mcq_count: number;
  msq_count: number;
  subjective_count: number;
  time_limit_minutes?: number;
  passing_score?: number;
  created_at: string;
  updated_at: string;
  topicIds?: string[];
}

export interface Question {
  id: string;
  assessment_id: string;
  topic_id?: string;
  subtopic_id?: string;
  question_type: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  question_text: string;
  question_number: number;
  points: number;
  explanation?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  created_at: string;
  updated_at: string;
  options?: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  option_label: string;
  is_correct: boolean;
  created_at: string;
}

export interface CreateAssessmentRequest {
  courseId: string;
  title: string;
  description?: string;
  subtopics: Array<{
    topicTitle: string;
    subtopic: string;
    mcqCount: number;
    msqCount: number;
    subjectiveCount: number;
  }>;
  timeLimit?: number;
  passingScore?: number;
}

export const assessmentsAPI = {
  /**
   * Create a new assessment with AI-generated questions
   */
  create: async (data: CreateAssessmentRequest): Promise<{
    assessment: Assessment;
    questionsGenerated: number;
  }> => {
    const response = await apiClient.post<{
      assessment: Assessment;
      questionsGenerated: number;
    }>('/assessments', data);
    return response.data;
  },

  /**
   * Get all assessments for a course
   */
  getByCourseId: async (courseId: string): Promise<Assessment[]> => {
    const response = await apiClient.get<{ assessments: Assessment[] }>(
      `/assessments/course/${courseId}`
    );
    return response.data.assessments;
  },

  /**
   * Get assessment by ID with questions
   */
  getById: async (id: string): Promise<{
    assessment: Assessment;
    questions: Question[];
  }> => {
    const response = await apiClient.get<{
      assessment: Assessment;
      questions: Question[];
    }>(`/assessments/${id}`);
    return response.data;
  },

  /**
   * Update assessment
   */
  update: async (id: string, updates: Partial<Assessment>): Promise<Assessment> => {
    const response = await apiClient.put<{ assessment: Assessment }>(
      `/assessments/${id}`,
      updates
    );
    return response.data.assessment;
  },

  /**
   * Publish assessment
   */
  publish: async (id: string): Promise<Assessment> => {
    const response = await apiClient.put<{ assessment: Assessment }>(
      `/assessments/${id}/publish`
    );
    return response.data.assessment;
  },

  /**
   * Unpublish assessment
   */
  unpublish: async (id: string): Promise<Assessment> => {
    const response = await apiClient.put<{ assessment: Assessment }>(
      `/assessments/${id}/unpublish`
    );
    return response.data.assessment;
  },

  /**
   * Delete assessment
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/assessments/${id}`);
  },
};


