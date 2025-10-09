import { Router } from 'express';
import * as aiFeedbackController from '../controllers/ai-feedback.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/ai/feedback/challenge-question
 * @desc    Generate a challenge question for correct answers
 * @access  Private
 */
router.post(
  '/challenge-question',
  authenticateToken,
  aiFeedbackController.generateChallengeQuestion
);

/**
 * @route   POST /api/ai/feedback/practice-question
 * @desc    Generate a practice question for incorrect answers
 * @access  Private
 */
router.post(
  '/practice-question',
  authenticateToken,
  aiFeedbackController.generatePracticeQuestion
);

/**
 * @route   POST /api/ai/feedback/personalized
 * @desc    Generate personalized feedback and recommendations
 * @access  Private
 */
router.post(
  '/personalized',
  authenticateToken,
  aiFeedbackController.generatePersonalizedFeedback
);

/**
 * @route   POST /api/ai/feedback/question
 * @desc    Generate question feedback for assessment analysis
 * @access  Private
 */
router.post(
  '/question',
  authenticateToken,
  aiFeedbackController.generateQuestionFeedback
);

export default router;
