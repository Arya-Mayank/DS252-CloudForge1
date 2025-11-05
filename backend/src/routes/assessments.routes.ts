import { Router } from 'express';
import * as assessmentsController from '../controllers/assessments.controller';
import { authenticateToken, requireInstructor } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/assessments
 * @desc    Create a new assessment with AI-generated questions
 * @access  Private (Instructor only)
 */
router.post(
  '/',
  authenticateToken,
  requireInstructor,
  assessmentsController.createAssessment
);

/**
 * @route   GET /api/assessments/course/:courseId
 * @desc    Get all assessments for a course
 * @access  Private
 */
router.get(
  '/course/:courseId',
  authenticateToken,
  assessmentsController.getCourseAssessments
);

/**
 * @route   GET /api/assessments/:id
 * @desc    Get assessment by ID with questions
 * @access  Private
 */
router.get(
  '/:id',
  authenticateToken,
  assessmentsController.getAssessmentWithQuestions
);

/**
 * @route   PUT /api/assessments/:id
 * @desc    Update assessment
 * @access  Private (Instructor only)
 */
router.put(
  '/:id',
  authenticateToken,
  requireInstructor,
  assessmentsController.updateAssessment
);

/**
 * @route   PUT /api/assessments/:id/publish
 * @desc    Publish assessment (make visible to students)
 * @access  Private (Instructor only)
 */
router.put(
  '/:id/publish',
  authenticateToken,
  requireInstructor,
  assessmentsController.publishAssessment
);

/**
 * @route   PUT /api/assessments/:id/unpublish
 * @desc    Unpublish assessment (hide from students)
 * @access  Private (Instructor only)
 */
router.put(
  '/:id/unpublish',
  authenticateToken,
  requireInstructor,
  assessmentsController.unpublishAssessment
);

/**
 * @route   DELETE /api/assessments/:id
 * @desc    Delete assessment
 * @access  Private (Instructor only)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireInstructor,
  assessmentsController.deleteAssessment
);

/**
 * @route   POST /api/assessments/:id/save-to-bank
 * @desc    Save selected questions from assessment to question bank
 * @access  Private (Instructor only)
 */
router.post(
  '/:id/save-to-bank',
  authenticateToken,
  requireInstructor,
  assessmentsController.saveQuestionsToBank
);

export default router;


