import { Router } from 'express';
import * as studentAssessmentsController from '../controllers/student-assessments.controller';
import { authenticateToken, requireStudent } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/student/assessments/:assessmentId/start
 * @desc    Start a student assessment attempt
 * @access  Private (Student only)
 */
router.post(
  '/:assessmentId/start',
  authenticateToken,
  requireStudent,
  studentAssessmentsController.startAssessment
);

/**
 * @route   POST /api/student/assessments/:assessmentId/submit
 * @desc    Submit student assessment answers
 * @access  Private (Student only)
 */
router.post(
  '/:assessmentId/submit',
  authenticateToken,
  requireStudent,
  studentAssessmentsController.submitAssessment
);

/**
 * @route   GET /api/student/assessments/:assessmentId/results/:attemptId
 * @desc    Get student assessment results
 * @access  Private (Student only)
 */
router.get(
  '/:assessmentId/results/:attemptId',
  authenticateToken,
  requireStudent,
  studentAssessmentsController.getAssessmentResults
);

/**
 * @route   GET /api/student/assessments/:assessmentId/attempts
 * @desc    Get student's attempts for an assessment
 * @access  Private (Student only)
 */
router.get(
  '/:assessmentId/attempts',
  authenticateToken,
  requireStudent,
  studentAssessmentsController.getStudentAttempts
);

export default router;
