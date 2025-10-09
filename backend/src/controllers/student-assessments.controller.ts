import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import assessmentModel from '../models/assessment.model';

/**
 * Start a student assessment attempt
 * POST /api/student/assessments/:assessmentId/start
 */
export const startAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { assessmentId } = req.params;
    const studentId = req.user.id;

    // Verify assessment exists and is published
    const assessment = await assessmentModel.findById(assessmentId);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (!assessment.is_published) {
      res.status(403).json({ error: 'Assessment is not available for students' });
      return;
    }

    // Create student attempt
    const attempt = await assessmentModel.createStudentAttempt(assessmentId, studentId);

    res.json({
      message: 'Assessment started successfully',
      attemptId: attempt.id,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        totalQuestions: assessment.total_questions,
        timeLimitMinutes: assessment.time_limit_minutes
      }
    });

  } catch (error) {
    console.error('Start assessment error:', error);
    res.status(500).json({ 
      error: 'Failed to start assessment',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Submit student assessment answers
 * POST /api/student/assessments/:assessmentId/submit
 */
export const submitAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      console.error('❌ No user in request for assessment submission');
      res.status(401).json({ error: 'Authentication required' });
      return;
    }


    const { assessmentId } = req.params;
    const { attemptId, answers } = req.body;
    const studentId = req.user.id;

    if (!attemptId || !answers || !Array.isArray(answers)) {
      res.status(400).json({ error: 'Missing required fields: attemptId, answers' });
      return;
    }

    // Verify assessment exists and is published
    const assessment = await assessmentModel.findById(assessmentId);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (!assessment.is_published) {
      res.status(403).json({ error: 'Assessment is not available for students' });
      return;
    }

    console.log(`📝 Student ${studentId} submitting assessment ${assessmentId} with ${answers.length} answers`);

    // Complete the student attempt
    const completedAttempt = await assessmentModel.completeStudentAttempt(attemptId, answers);

    // Get the attempt with answers for response
    const attemptData = await assessmentModel.getStudentAttempt(attemptId);

    // Calculate results
    const correctCount = attemptData.answers.filter(a => a.is_correct).length;
    const totalCount = attemptData.answers.length;
    const totalPoints = attemptData.answers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
    const maxPoints = attemptData.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const responseData = {
      message: 'Assessment submitted successfully',
      attemptId: attemptId,
      results: {
        correctCount,
        totalCount,
        percentage,
        totalPoints,
        maxPoints,
        timeTakenMinutes: completedAttempt.time_taken_minutes
      },
      answers: attemptData.answers,
      questions: attemptData.questions
    };


    res.json(responseData);

  } catch (error) {
    console.error('Submit assessment error:', error);
    res.status(500).json({ 
      error: 'Failed to submit assessment',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get student assessment results
 * GET /api/student/assessments/:assessmentId/results/:attemptId
 */
export const getAssessmentResults = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { assessmentId, attemptId } = req.params;
    const studentId = req.user.id;

    // Get attempt data
    const attemptData = await assessmentModel.getStudentAttempt(attemptId);

    // Verify the attempt belongs to the student
    if (attemptData.attempt.student_id !== studentId) {
      res.status(403).json({ error: 'Access denied to this attempt' });
      return;
    }

    // Verify the attempt belongs to the assessment
    if (attemptData.attempt.assessment_id !== assessmentId) {
      res.status(400).json({ error: 'Attempt does not belong to this assessment' });
      return;
    }

    // Calculate results
    const correctCount = attemptData.answers.filter(a => a.is_correct).length;
    const totalCount = attemptData.answers.length;
    const totalPoints = attemptData.answers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
    const maxPoints = attemptData.questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    res.json({
      attempt: attemptData.attempt,
      results: {
        correctCount,
        totalCount,
        percentage,
        totalPoints,
        maxPoints,
        timeTakenMinutes: attemptData.attempt.time_taken_minutes
      },
      answers: attemptData.answers,
      questions: attemptData.questions
    });

  } catch (error) {
    console.error('Get assessment results error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch assessment results',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get student's attempts for an assessment
 * GET /api/student/assessments/:assessmentId/attempts
 */
export const getStudentAttempts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { assessmentId } = req.params;
    const studentId = req.user.id;

    const attempts = await assessmentModel.getStudentAttempts(assessmentId, studentId);

    res.json({
      attempts
    });

  } catch (error) {
    console.error('Get student attempts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch student attempts',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
