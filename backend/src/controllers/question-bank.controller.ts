import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import assessmentModel from '../models/assessment.model';
import courseModel from '../models/course.model';
import { requireSupabaseClient } from '../config/supabase.config';

/**
 * Get questions from the question bank with filters
 * GET /api/question-bank/:courseId
 */
export const getQuestionBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { courseId } = req.params;
    const { difficulty, bloom_level, question_type, topic_id, subtopic_id } = req.query;

    // Verify course exists
    const course = await courseModel.findById(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Verify user has access (instructor or enrolled student)
    if (course.instructor_id !== req.user.id) {
      // Could add enrollment check here for students
      // For now, only instructors can access question bank
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build filters
    const filters: any = {};
    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty as string)) {
      filters.difficulty = difficulty as 'EASY' | 'MEDIUM' | 'HARD';
    }
    if (bloom_level && ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'].includes(bloom_level as string)) {
      filters.bloom_level = bloom_level as any;
    }
    if (question_type && ['MCQ', 'MSQ', 'SUBJECTIVE'].includes(question_type as string)) {
      filters.question_type = question_type as 'MCQ' | 'MSQ' | 'SUBJECTIVE';
    }
    if (topic_id) {
      filters.topic_id = topic_id as string;
    }
    if (subtopic_id) {
      filters.subtopic_id = subtopic_id as string;
    }

    const questions = await assessmentModel.getQuestionsFromBank(courseId, filters);

    res.json({
      questions,
      count: questions.length
    });

  } catch (error) {
    console.error('Get question bank error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch questions from bank',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Delete a question from the question bank
 * DELETE /api/question-bank/:id
 */
export const deleteQuestionFromBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const supabase = requireSupabaseClient();

    // Get question to verify course ownership
    const { data: question, error: fetchError } = await supabase
      .from('question_bank')
      .select('course_id')
      .eq('id', id)
      .single();

    if (fetchError || !question) {
      res.status(404).json({ error: 'Question not found in bank' });
      return;
    }

    // Verify user is the instructor
    const course = await courseModel.findById(question.course_id);
    if (!course || course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete questions from your own courses' });
      return;
    }

    // Delete question (cascade will delete options)
    const { error: deleteError } = await supabase
      .from('question_bank')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    res.json({ message: 'Question deleted from bank successfully' });

  } catch (error) {
    console.error('Delete question from bank error:', error);
    res.status(500).json({ 
      error: 'Failed to delete question from bank',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

