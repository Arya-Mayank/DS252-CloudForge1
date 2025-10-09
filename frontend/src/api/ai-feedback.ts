import apiClient from './client';

export interface ChallengeQuestion {
  questionType: 'MCQ' | 'MSQ';
  questionText: string;
  topicTitle: string;
  subtopic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: Array<{
    label: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  points: number;
}

export interface PracticeQuestion {
  questionType: 'MCQ' | 'MSQ';
  questionText: string;
  topicTitle: string;
  subtopic: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: Array<{
    label: string;
    text: string;
    isCorrect: boolean;
  }>;
  explanation: string;
  points: number;
}

export interface PersonalizedFeedback {
  explanation: string;
  subtopicRecommendations: string[];
  studyTips: string[];
}

export interface QuestionFeedback {
  explanation: string;
  improvementTips: string[];
  relatedConcepts: string[];
}

export interface GenerateChallengeQuestionRequest {
  originalQuestion: string;
  topicTitle: string;
  subtopic: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface GeneratePracticeQuestionRequest {
  originalQuestion: string;
  topicTitle: string;
  subtopic: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface GeneratePersonalizedFeedbackRequest {
  questionText: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  topicTitle: string;
  subtopic: string;
}

export interface GenerateQuestionFeedbackRequest {
  question: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export const aiFeedbackAPI = {
  /**
   * Generate a challenge question for correct answers
   */
  generateChallengeQuestion: async (data: GenerateChallengeQuestionRequest): Promise<ChallengeQuestion> => {
    const response = await apiClient.post<{
      question: ChallengeQuestion;
    }>('/ai/feedback/challenge-question', data);
    return response.data.question;
  },

  /**
   * Generate a practice question for incorrect answers
   */
  generatePracticeQuestion: async (data: GeneratePracticeQuestionRequest): Promise<PracticeQuestion> => {
    const response = await apiClient.post<{
      question: PracticeQuestion;
    }>('/ai/feedback/practice-question', data);
    return response.data.question;
  },

  /**
   * Generate personalized feedback and recommendations
   */
  generatePersonalizedFeedback: async (data: GeneratePersonalizedFeedbackRequest): Promise<PersonalizedFeedback> => {
    const response = await apiClient.post<{
      feedback: PersonalizedFeedback;
    }>('/ai/feedback/personalized', data);
    return response.data.feedback;
  },

  /**
   * Generate question feedback for assessment analysis
   */
  generateQuestionFeedback: async (data: GenerateQuestionFeedbackRequest): Promise<QuestionFeedback> => {
    const response = await apiClient.post<{
      feedback: QuestionFeedback;
    }>('/ai/feedback/question', data);
    return response.data.feedback;
  },
};
