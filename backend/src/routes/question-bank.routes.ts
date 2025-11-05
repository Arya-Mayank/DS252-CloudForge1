import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import * as questionBankController from '../controllers/question-bank.controller';

const router = express.Router();

/**
 * @route   GET /api/question-bank/:courseId
 * @desc    Get questions from question bank with filters
 * @access  Private (Instructor only)
 * @query   difficulty, bloom_level, question_type, topic_id, subtopic_id
 */
router.get('/:courseId', authenticateToken, questionBankController.getQuestionBank);

/**
 * @route   DELETE /api/question-bank/:id
 * @desc    Delete a question from the question bank
 * @access  Private (Instructor only)
 */
router.delete('/:id', authenticateToken, questionBankController.deleteQuestionFromBank);

export default router;

