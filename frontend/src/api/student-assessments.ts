import apiClient from './client';
import { Question } from '../types';

export interface StudentAttempt {
  id: string;
  assessment_id: string;
  student_id: string;
  enrollment_id: string;
  started_at: string;
  submitted_at?: string;
  score?: number;
  total_points?: number;
  percentage?: number;
  time_taken_minutes?: number;
  is_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_option_ids?: string[];
  text_answer?: string;
  is_correct?: boolean;
  points_earned?: number;
  feedback?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentSubmission {
  attemptId: string;
  answers: Array<{
    questionId: string;
    answerText?: string;
    selectedOptionIds?: string[];
    timeTakenSeconds?: number;
  }>;
}

export interface AssessmentResults {
  attempt: StudentAttempt;
  results: {
    correctCount: number;
    totalCount: number;
    percentage: number;
    totalPoints: number;
    maxPoints: number;
    timeTakenMinutes?: number;
  };
  answers: StudentAnswer[];
  questions: any[];
}

export const studentAssessmentsAPI = {
  /**
   * Start a new assessment attempt
   */
  startAssessment: async (assessmentId: string): Promise<{
    attemptId: string;
    assessment: {
      id: string;
      title: string;
      totalQuestions: number;
      timeLimitMinutes?: number;
    };
  }> => {
    const response = await apiClient.post<{
      attemptId: string;
      assessment: {
        id: string;
        title: string;
        totalQuestions: number;
        timeLimitMinutes?: number;
      };
    }>(`/student/assessments/${assessmentId}/start`);
    return response.data;
  },

  /**
   * Submit assessment answers
   */
  submitAssessment: async (assessmentId: string, submission: AssessmentSubmission): Promise<AssessmentResults> => {
    const response = await apiClient.post<AssessmentResults>(
      `/student/assessments/${assessmentId}/submit`,
      submission
    );
    return response.data;
  },

  /**
   * Get assessment results by attempt ID
   */
  getAssessmentResults: async (assessmentId: string, attemptId: string): Promise<AssessmentResults> => {
    const response = await apiClient.get<AssessmentResults>(
      `/student/assessments/${assessmentId}/results/${attemptId}`
    );
    return response.data;
  },

  /**
   * Get student's attempts for an assessment
   */
  getStudentAttempts: async (assessmentId: string): Promise<{
    attempts: StudentAttempt[];
  }> => {
    const response = await apiClient.get<{
      attempts: StudentAttempt[];
    }>(`/student/assessments/${assessmentId}/attempts`);
    return response.data;
  },

  /**
   * Get next question for adaptive assessment
   */
  getNextQuestion: async (assessmentId: string, attemptId: string): Promise<{
    question: Question | null;
    isComplete: boolean;
    message?: string;
  }> => {
    const response = await apiClient.get<{
      question: Question | null;
      isComplete: boolean;
      message?: string;
    }>(`/student/assessments/${assessmentId}/attempts/${attemptId}/next-question`);
    return response.data;
  },

  /**
   * Submit answer and get next question (adaptive flow)
   */
  submitAnswerAndGetNext: async (
    assessmentId: string,
    attemptId: string,
    data: {
      questionId: string;
      answerText?: string;
      selectedOptionIds?: string[];
      timeTakenSeconds?: number;
    }
  ): Promise<{
    isCorrect: boolean;
    pointsEarned: number;
    nextQuestion: Question | null;
    isComplete: boolean;
  }> => {
    const response = await apiClient.post<{
      isCorrect: boolean;
      pointsEarned: number;
      nextQuestion: Question | null;
      isComplete: boolean;
    }>(`/student/assessments/${assessmentId}/attempts/${attemptId}/submit-answer`, data);
    return response.data;
  },
};
