export interface User {
  id: string;
  email: string;
  role: 'instructor' | 'student';
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  syllabus?: SyllabusItem[];
  is_published?: boolean;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SyllabusItem {
  topic: string;
  subtopics: string[];
  estimatedHours: number;
}

export interface Assessment {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  type: string;
  duration_minutes?: number;
  passing_score?: number;
  is_published: boolean;
  created_at?: string;
}

export interface Question {
  id: string;
  assessment_id: string;
  question_text: string;
  type: 'mcq' | 'short-answer' | 'true-false';
  options?: string[];
  correct_answer?: string;
  difficulty?: string;
  topic?: string;
  points?: number;
}

export interface Result {
  id: string;
  student_id: string;
  assessment_id: string;
  answers: any;
  score?: number;
  total_points?: number;
  percentage?: number;
  time_taken_minutes?: number;
  completed_at?: string;
  feedback?: any;
}

export interface Recommendation {
  topic: string;
  reason: string;
  resources: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface Analytics {
  courseId?: string;
  courseTitle?: string;
  totalAssessments: number;
  totalAttempts: number;
  overallAverageScore?: number;
  averageScore?: number;
  weakTopics?: { topic: string; averageAccuracy: number }[];
  assessments?: any[];
}

