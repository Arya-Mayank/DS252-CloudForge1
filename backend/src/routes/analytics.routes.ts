import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/analytics/overview/:courseId
 * @desc    Get analytics overview for a course
 * @access  Private (Instructor only for their courses)
 */
router.get(
  '/overview/:courseId',
  authenticateToken,
  analyticsController.getCourseAnalytics
);

/**
 * @route   GET /api/analytics/student/:studentId
 * @desc    Get student performance analytics
 * @access  Private (Student for own data, Instructor for their students)
 */
router.get(
  '/student/:studentId',
  authenticateToken,
  analyticsController.getStudentAnalytics
);

export default router;

