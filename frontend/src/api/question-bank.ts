import apiClient from './client';

export interface QuestionBankQuestion {
  id: string;
  course_id: string;
  topic_id?: string;
  subtopic_id?: string;
  question_type: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  question_text: string;
  points: number;
  explanation?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  created_at: string;
  updated_at: string;
  options?: QuestionBankOption[];
}

export interface QuestionBankOption {
  id: string;
  question_bank_id: string;
  option_text: string;
  option_label: string;
  is_correct: boolean;
  created_at: string;
}

export interface QuestionBankFilters {
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  question_type?: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  topic_id?: string;
  subtopic_id?: string;
}

export const questionBankAPI = {
  /**
   * Get questions from question bank with filters
   */
  getQuestions: async (courseId: string, filters?: QuestionBankFilters): Promise<QuestionBankQuestion[]> => {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.bloom_level) params.append('bloom_level', filters.bloom_level);
    if (filters?.question_type) params.append('question_type', filters.question_type);
    if (filters?.topic_id) params.append('topic_id', filters.topic_id);
    if (filters?.subtopic_id) params.append('subtopic_id', filters.subtopic_id);

    const response = await apiClient.get<{
      questions: QuestionBankQuestion[];
      count: number;
    }>(`/question-bank/${courseId}?${params.toString()}`);
    return response.data.questions;
  },

  /**
   * Delete a question from question bank
   */
  deleteQuestion: async (questionId: string): Promise<void> => {
    await apiClient.delete(`/question-bank/${questionId}`);
  },
};

