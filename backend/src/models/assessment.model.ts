import { getSupabaseClient } from '../config/supabase.config';

export interface Assessment {
  id: string;
  course_id: string;
  instructor_id: string;
  title: string;
  description?: string | null;
  is_published: boolean;
  published_at?: string | null;
  total_questions: number;
  mcq_count: number;
  msq_count: number;
  subjective_count: number;
  time_limit_minutes?: number | null;
  passing_score?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Question {
  id?: string;
  assessment_id: string;
  topic_id?: string | null;
  subtopic_id?: string | null;
  question_type: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  question_text: string;
  question_number: number;
  points: number;
  explanation?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionOption {
  id?: string;
  question_id: string;
  option_text: string;
  option_label: string;
  is_correct: boolean;
  created_at?: string;
}

export interface StudentAttempt {
  id?: string;
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
  id?: string;
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

export interface QuestionBank {
  id?: string;
  course_id: string;
  topic_id?: string | null;
  subtopic_id?: string | null;
  question_type: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  question_text: string;
  points: number;
  explanation?: string | null;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | null;
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | null;
  created_at?: string;
  updated_at?: string;
}

export interface QuestionBankOption {
  id?: string;
  question_bank_id: string;
  option_text: string;
  option_label: string;
  is_correct: boolean;
  created_at?: string;
}

export interface CreateAssessmentParams {
  course_id: string;
  instructor_id: string;
  title: string;
  description?: string;
  time_limit_minutes?: number;
  passing_score?: number;
}

export interface CreateQuestionParams {
  assessment_id: string;
  topic_id?: string;
  subtopic_id?: string;
  question_type: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
  question_text: string;
  question_number: number;
  points: number;
  explanation?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  options?: Array<{
    option_label: string;
    option_text: string;
    is_correct: boolean;
  }>;
}

class AssessmentModel {
  private table = 'assessments';
  private questionsTable = 'questions';
  private optionsTable = 'question_options';
  private topicsJunctionTable = 'assessment_topics';
  private attemptsTable = 'student_attempts';
  private answersTable = 'student_answers';
  private questionBankTable = 'question_bank';
  private questionBankOptionsTable = 'question_bank_options';

  /**
   * Create a new assessment
   */
  async create(params: CreateAssessmentParams): Promise<Assessment> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .insert({
        course_id: params.course_id,
        instructor_id: params.instructor_id,
        title: params.title,
        description: params.description,
        time_limit_minutes: params.time_limit_minutes,
        passing_score: params.passing_score,
        is_published: false,
        total_questions: 0,
        mcq_count: 0,
        msq_count: 0,
        subjective_count: 0
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create assessment: ${error.message}`);
    return data;
  }

  /**
   * Find assessment by ID
   */
  async findById(id: string): Promise<Assessment | null> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Find all assessments for a course
   */
  async findByCourseId(courseId: string): Promise<Assessment[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch assessments: ${error.message}`);
    return data || [];
  }

  /**
   * Find all assessments by instructor
   */
  async findByInstructorId(instructorId: string): Promise<Assessment[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('instructor_id', instructorId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch assessments: ${error.message}`);
    return data || [];
  }

  /**
   * Update assessment
   */
  async update(id: string, updates: Partial<Assessment>): Promise<Assessment> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update assessment: ${error.message}`);
    return data;
  }

  /**
   * Publish assessment
   */
  async publish(id: string): Promise<Assessment> {
    return this.update(id, {
      is_published: true,
      published_at: new Date().toISOString()
    });
  }

  /**
   * Unpublish assessment
   */
  async unpublish(id: string): Promise<Assessment> {
    return this.update(id, {
      is_published: false
    });
  }

  /**
   * Delete assessment
   */
  async delete(id: string): Promise<void> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Failed to delete assessment: ${error.message}`);
  }

  /**
   * Create a question for an assessment
   */
  async createQuestion(params: CreateQuestionParams): Promise<Question> {
    const supabase = getSupabaseClient();
    
    const { data: question, error: questionError } = await supabase
      .from(this.questionsTable)
      .insert({
        assessment_id: params.assessment_id,
        topic_id: params.topic_id,
        subtopic_id: params.subtopic_id,
        question_type: params.question_type,
        question_text: params.question_text,
        question_number: params.question_number,
        points: params.points,
        explanation: params.explanation,
        difficulty: params.difficulty,
        bloom_level: params.bloom_level
      })
      .select()
      .single();

    if (questionError) throw new Error(`Failed to create question: ${questionError.message}`);

    // Create options if provided
    if (params.options && params.options.length > 0) {
      const optionsToInsert = params.options.map(opt => ({
        question_id: question.id,
        option_label: opt.option_label,
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }));

      const { error: optionsError } = await supabase
        .from(this.optionsTable)
        .insert(optionsToInsert);

      if (optionsError) throw new Error(`Failed to create question options: ${optionsError.message}`);
    }

    return question;
  }

  /**
   * Get all questions for an assessment
   */
  async getQuestions(assessmentId: string): Promise<Array<Question & { options?: QuestionOption[] }>> {
    const supabase = getSupabaseClient();
    
    // Get all questions
    const { data: questions, error: questionsError } = await supabase
      .from(this.questionsTable)
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('question_number', { ascending: true });

    if (questionsError) throw new Error(`Failed to fetch questions: ${questionsError.message}`);
    if (!questions) return [];

    // Get options for all questions
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const { data: options } = await supabase
          .from(this.optionsTable)
          .select('*')
          .eq('question_id', question.id)
          .order('option_label', { ascending: true });

        return {
          ...question,
          options: options || []
        };
      })
    );

    return questionsWithOptions;
  }

  /**
   * Link topics to assessment
   */
  async linkTopics(assessmentId: string, topicIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();
    
    const records = topicIds.map(topicId => ({
      assessment_id: assessmentId,
      topic_id: topicId
    }));

    const { error } = await supabase
      .from(this.topicsJunctionTable)
      .insert(records);

    if (error) throw new Error(`Failed to link topics to assessment: ${error.message}`);
  }

  /**
   * Get topics for an assessment
   */
  async getTopics(assessmentId: string): Promise<string[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.topicsJunctionTable)
      .select('topic_id')
      .eq('assessment_id', assessmentId);

    if (error) throw new Error(`Failed to fetch assessment topics: ${error.message}`);
    return (data || []).map(record => record.topic_id);
  }

  /**
   * Create a new student attempt
   */
  async createStudentAttempt(assessmentId: string, studentId: string): Promise<StudentAttempt> {
    const supabase = getSupabaseClient();
    
    // First, get the enrollment_id for this student and course
    const assessment = await this.findById(assessmentId);
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', assessment.course_id)
      .single();

    if (enrollmentError || !enrollment) {
      throw new Error('Student enrollment not found for this course');
    }

    const { data, error } = await supabase
      .from(this.attemptsTable)
      .insert({
        assessment_id: assessmentId,
        student_id: studentId,
        enrollment_id: enrollment.id,
        started_at: new Date().toISOString(),
        is_completed: false
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create student attempt: ${error.message}`);
    return data;
  }

  /**
   * Submit student answers for an attempt
   */
  async submitStudentAnswers(
    attemptId: string, 
    answers: Array<{
      questionId: string;
      answerText?: string;
      selectedOptionIds?: string[];
      timeTakenSeconds?: number;
    }>
  ): Promise<StudentAnswer[]> {
    const supabase = getSupabaseClient();
    
    // Calculate correctness and points for each answer
    const answersWithResults = await Promise.all(
      answers.map(async (answer) => {
        let isCorrect = false;
        let pointsEarned = 0;

        // Get question details to calculate points
        const { data: question } = await supabase
          .from(this.questionsTable)
          .select('points, question_type, question_text, explanation')
          .eq('id', answer.questionId)
          .single();

        if (question) {
          if (question.question_type === 'SUBJECTIVE') {
            // For subjective questions, use AI to evaluate the answer
            isCorrect = await this.evaluateSubjectiveAnswer(
              answer.answerText || '', 
              question.question_text, 
              question.explanation || ''
            );
          } else {
            // For MCQ/MSQ, check against correct options
            const { data: correctOptions } = await supabase
              .from(this.optionsTable)
              .select('id')
              .eq('question_id', answer.questionId)
              .eq('is_correct', true);

            if (correctOptions) {
              const correctOptionIds = correctOptions.map(opt => opt.id);
              const selectedIds = answer.selectedOptionIds || [];
              
              if (question.question_type === 'MCQ') {
                // MCQ: exactly one correct answer
                isCorrect = selectedIds.length === 1 && correctOptionIds.includes(selectedIds[0]);
              } else if (question.question_type === 'MSQ') {
                // MSQ: all correct answers selected, no incorrect ones
                isCorrect = selectedIds.length === correctOptionIds.length && 
                           selectedIds.every(id => correctOptionIds.includes(id));
              }
            }
          }

          pointsEarned = isCorrect ? question.points : 0;
        }

        return {
          attempt_id: attemptId,
          question_id: answer.questionId,
          text_answer: answer.answerText,
          selected_option_ids: answer.selectedOptionIds,
          is_correct: isCorrect,
          points_earned: pointsEarned
        };
      })
    );

    // Insert all answers
    const { data, error } = await supabase
      .from(this.answersTable)
      .insert(answersWithResults)
      .select();

    if (error) throw new Error(`Failed to submit student answers: ${error.message}`);
    return data || [];
  }

  /**
   * Complete a student attempt
   */
  async completeStudentAttempt(
    attemptId: string, 
    answers: Array<{
      questionId: string;
      answerText?: string;
      selectedOptionIds?: string[];
      timeTakenSeconds?: number;
    }>
  ): Promise<StudentAttempt> {
    const supabase = getSupabaseClient();

    // Submit answers
    const submittedAnswers = await this.submitStudentAnswers(attemptId, answers);

    // Calculate total score
    const totalPoints = submittedAnswers.reduce((sum, answer) => sum + (answer.points_earned || 0), 0);

    // Calculate time taken
    const { data: attempt } = await supabase
      .from(this.attemptsTable)
      .select('started_at')
      .eq('id', attemptId)
      .single();

    const startedAt = new Date(attempt?.started_at || new Date().toISOString());
    const submittedAt = new Date();
    const timeTakenMinutes = Math.round((submittedAt.getTime() - startedAt.getTime()) / (1000 * 60));

    // Get assessment_id from attempt
    const { data: attemptData } = await supabase
      .from(this.attemptsTable)
      .select('assessment_id')
      .eq('id', attemptId)
      .single();

    // Calculate total possible points
    const { data: questions } = await supabase
      .from(this.questionsTable)
      .select('points')
      .eq('assessment_id', attemptData?.assessment_id || '');

    const maxPoints = questions?.reduce((sum, q) => sum + q.points, 0) || 0;
    const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    // Update attempt
    const { data, error } = await supabase
      .from(this.attemptsTable)
      .update({
        submitted_at: submittedAt.toISOString(),
        is_completed: true,
        score: totalPoints,
        total_points: maxPoints,
        percentage: percentage,
        time_taken_minutes: timeTakenMinutes
      })
      .eq('id', attemptId)
      .select()
      .single();

    if (error) throw new Error(`Failed to complete student attempt: ${error.message}`);
    return data;
  }

  /**
   * Get student attempt with answers
   */
  async getStudentAttempt(attemptId: string): Promise<{
    attempt: StudentAttempt;
    answers: StudentAnswer[];
    questions: Question[];
  }> {
    const supabase = getSupabaseClient();

    // Get attempt
    const { data: attempt, error: attemptError } = await supabase
      .from(this.attemptsTable)
      .select('*')
      .eq('id', attemptId)
      .single();

    if (attemptError) throw new Error(`Failed to fetch student attempt: ${attemptError.message}`);

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from(this.answersTable)
      .select('*')
      .eq('attempt_id', attemptId);

    if (answersError) throw new Error(`Failed to fetch student answers: ${answersError.message}`);

    // Get questions with options
    const questionsWithOptions = await this.getQuestions(attempt.assessment_id);

    if (!questionsWithOptions) throw new Error('Failed to fetch questions with options');

    return {
      attempt,
      answers: answers || [],
      questions: questionsWithOptions || []
    };
  }

  /**
   * Get student attempts for an assessment
   */
  async getStudentAttempts(assessmentId: string, studentId: string): Promise<StudentAttempt[]> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.attemptsTable)
      .select('*')
      .eq('assessment_id', assessmentId)
      .eq('student_id', studentId)
      .order('started_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch student attempts: ${error.message}`);
    return data || [];
  }

  /**
   * Evaluate subjective answer using AI
   */
  private async evaluateSubjectiveAnswer(
    studentAnswer: string, 
    questionText: string, 
    expectedAnswer: string
  ): Promise<boolean> {
    try {
      // If no answer provided or just "NA", mark as incorrect
      if (!studentAnswer || studentAnswer.trim().length === 0 || 
          studentAnswer.trim().toLowerCase() === 'na' || 
          studentAnswer.trim().toLowerCase() === 'n/a') {
        return false;
      }

      // For now, use a simple heuristic approach
      // In the future, this could be enhanced with AI evaluation
      const answerLength = studentAnswer.trim().length;
      const minLength = 10; // Minimum characters for a meaningful answer
      
      if (answerLength < minLength) {
        return false;
      }

      // Check for common non-answers
      const nonAnswers = ['idk', 'dont know', "don't know", 'no idea', 'blank', 'nothing', 'none'];
      const lowerAnswer = studentAnswer.toLowerCase();
      
      if (nonAnswers.some(nonAnswer => lowerAnswer.includes(nonAnswer))) {
        return false;
      }

      // For basic evaluation, if answer is substantial and doesn't contain non-answers, consider it correct
      // This is a simplified approach - in production, you'd want more sophisticated AI evaluation
      return answerLength >= minLength;
      
      // TODO: Implement AI-powered evaluation for more accurate assessment
      // const aiEvaluation = await azureOpenAIService.evaluateSubjectiveAnswer({
      //   question: questionText,
      //   studentAnswer: studentAnswer,
      //   expectedAnswer: expectedAnswer
      // });
      // return aiEvaluation.isCorrect;
      
    } catch (error) {
      console.error('Error evaluating subjective answer:', error);
      // Default to incorrect if evaluation fails
      return false;
    }
  }

  /**
   * Save a question to the question bank
   */
  async saveToQuestionBank(
    questionId: string,
    courseId: string
  ): Promise<QuestionBank> {
    const supabase = getSupabaseClient();

    // Get the question with its assessment_id first
    const { data: questionData } = await supabase
      .from(this.questionsTable)
      .select('assessment_id')
      .eq('id', questionId)
      .single();

    if (!questionData) {
      throw new Error('Question not found');
    }

    // Get the question with options
    const questions = await this.getQuestions(questionData.assessment_id);
    const question = questions.find(q => q.id === questionId);
    
    if (!question) {
      throw new Error('Question not found');
    }

    // Create question in bank
    const { data: bankQuestion, error: bankError } = await supabase
      .from(this.questionBankTable)
      .insert({
        course_id: courseId,
        topic_id: question.topic_id,
        subtopic_id: question.subtopic_id,
        question_type: question.question_type,
        question_text: question.question_text,
        points: question.points,
        explanation: question.explanation,
        difficulty: question.difficulty,
        bloom_level: question.bloom_level
      })
      .select()
      .single();

    if (bankError) throw new Error(`Failed to save question to bank: ${bankError.message}`);

    // Copy options if they exist
    if (question.options && question.options.length > 0) {
      const optionsToInsert = question.options.map(opt => ({
        question_bank_id: bankQuestion.id,
        option_label: opt.option_label,
        option_text: opt.option_text,
        is_correct: opt.is_correct
      }));

      const { error: optionsError } = await supabase
        .from(this.questionBankOptionsTable)
        .insert(optionsToInsert);

      if (optionsError) throw new Error(`Failed to save question options to bank: ${optionsError.message}`);
    }

    return bankQuestion;
  }

  /**
   * Get questions from bank with filters
   */
  async getQuestionsFromBank(
    courseId: string,
    filters: {
      difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
      bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
      question_type?: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
      topic_id?: string;
      subtopic_id?: string;
    } = {}
  ): Promise<Array<QuestionBank & { options?: QuestionBankOption[] }>> {
    const supabase = getSupabaseClient();

    let query = supabase
      .from(this.questionBankTable)
      .select('*')
      .eq('course_id', courseId);

    if (filters.difficulty) {
      query = query.eq('difficulty', filters.difficulty);
    }
    if (filters.bloom_level) {
      query = query.eq('bloom_level', filters.bloom_level);
    }
    if (filters.question_type) {
      query = query.eq('question_type', filters.question_type);
    }
    if (filters.topic_id) {
      query = query.eq('topic_id', filters.topic_id);
    }
    if (filters.subtopic_id) {
      query = query.eq('subtopic_id', filters.subtopic_id);
    }

    const { data: questions, error } = await query;

    if (error) throw new Error(`Failed to fetch questions from bank: ${error.message}`);
    if (!questions) return [];

    // Get options for all questions
    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const { data: options } = await supabase
          .from(this.questionBankOptionsTable)
          .select('*')
          .eq('question_bank_id', question.id)
          .order('option_label', { ascending: true });

        return {
          ...question,
          options: options || []
        };
      })
    );

    return questionsWithOptions;
  }

  /**
   * Get next adaptive question based on current performance
   */
  async getAdaptiveQuestion(
    courseId: string,
    currentDifficulty: 'EASY' | 'MEDIUM' | 'HARD',
    wasCorrect: boolean,
    filters: {
      question_type?: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
      topic_id?: string;
      subtopic_id?: string;
      excludeIds?: string[];
    } = {}
  ): Promise<(QuestionBank & { options?: QuestionBankOption[] }) | null> {
    // Adaptive logic: correct → increase difficulty, wrong → decrease
    let targetDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
    
    if (wasCorrect) {
      // Increase difficulty
      if (currentDifficulty === 'EASY') {
        targetDifficulty = 'MEDIUM';
      } else if (currentDifficulty === 'MEDIUM') {
        targetDifficulty = 'HARD';
      } else {
        targetDifficulty = 'HARD'; // Already at max
      }
    } else {
      // Decrease difficulty
      if (currentDifficulty === 'HARD') {
        targetDifficulty = 'MEDIUM';
      } else if (currentDifficulty === 'MEDIUM') {
        targetDifficulty = 'EASY';
      } else {
        targetDifficulty = 'EASY'; // Already at min
      }
    }

    // Try to get a question at target difficulty
    const questions = await this.getQuestionsFromBank(courseId, {
      difficulty: targetDifficulty,
      question_type: filters.question_type,
      topic_id: filters.topic_id,
      subtopic_id: filters.subtopic_id
    });

    // Filter out excluded questions
    const availableQuestions = questions.filter(q => 
      !filters.excludeIds || !filters.excludeIds.includes(q.id!)
    );

    if (availableQuestions.length === 0) {
      // Fallback: try any difficulty within the same course
      const allQuestions = await this.getQuestionsFromBank(courseId, {
        question_type: filters.question_type,
        topic_id: filters.topic_id,
        subtopic_id: filters.subtopic_id
      });
      
      const fallbackQuestions = allQuestions.filter(q => 
        !filters.excludeIds || !filters.excludeIds.includes(q.id!)
      );

      if (fallbackQuestions.length === 0) {
        return null;
      }

      // Return random question from fallback
      return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
    }

    // Return random question at target difficulty
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }
}

export default new AssessmentModel();
