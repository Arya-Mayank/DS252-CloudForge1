import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticateToken, requireInstructor } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/ai/syllabus
 * @desc    Generate syllabus from course document
 * @access  Private (Instructor only)
 */
router.post(
  '/syllabus',
  authenticateToken,
  requireInstructor,
  aiController.generateSyllabus
);

/**
 * @route   POST /api/ai/assessment
 * @desc    Generate assessment questions from topics
 * @access  Private (Instructor only)
 */
router.post(
  '/assessment',
  authenticateToken,
  requireInstructor,
  aiController.generateAssessment
);

/**
 * @route   POST /api/ai/recommend
 * @desc    Generate personalized learning recommendations
 * @access  Private
 */
router.post(
  '/recommend',
  authenticateToken,
  aiController.generateRecommendations
);

/**
 * @route   POST /api/ai/search
 * @desc    Search course content using RAG
 * @access  Private
 */
router.post(
  '/search',
  authenticateToken,
  aiController.searchCourseContent
);

export default router;

