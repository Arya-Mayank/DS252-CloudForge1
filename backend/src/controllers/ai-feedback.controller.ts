import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import azureOpenAIService from '../services/azure-openai.service';

/**
 * Generate a challenge question for correct answers
 * POST /api/ai/feedback/challenge-question
 */
export const generateChallengeQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { originalQuestion, topicTitle, subtopic, difficulty } = req.body;

    if (!originalQuestion || !topicTitle || !subtopic) {
      res.status(400).json({ error: 'Missing required fields: originalQuestion, topicTitle, subtopic' });
      return;
    }

    console.log(`🤖 Generating challenge question for: ${subtopic}`);

    const challengeQuestion = await azureOpenAIService.generateChallengeQuestion({
      originalQuestion,
      topicTitle,
      subtopic,
      difficulty
    });

    res.json({
      message: 'Challenge question generated successfully',
      question: challengeQuestion
    });

  } catch (error) {
    console.error('Generate challenge question error:', error);
    res.status(500).json({ 
      error: 'Failed to generate challenge question',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Generate a practice question for incorrect answers
 * POST /api/ai/feedback/practice-question
 */
export const generatePracticeQuestion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { originalQuestion, topicTitle, subtopic, difficulty } = req.body;

    if (!originalQuestion || !topicTitle || !subtopic) {
      res.status(400).json({ error: 'Missing required fields: originalQuestion, topicTitle, subtopic' });
      return;
    }

    console.log(`🤖 Generating practice question for: ${subtopic}`);

    const practiceQuestion = await azureOpenAIService.generatePracticeQuestion({
      originalQuestion,
      topicTitle,
      subtopic,
      difficulty
    });

    res.json({
      message: 'Practice question generated successfully',
      question: practiceQuestion
    });

  } catch (error) {
    console.error('Generate practice question error:', error);
    res.status(500).json({ 
      error: 'Failed to generate practice question',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Generate personalized feedback and recommendations
 * POST /api/ai/feedback/personalized
 */
export const generatePersonalizedFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { questionText, userAnswer, correctAnswer, isCorrect, topicTitle, subtopic } = req.body;

    if (!questionText || !userAnswer || !correctAnswer || topicTitle === undefined || subtopic === undefined) {
      res.status(400).json({ error: 'Missing required fields: questionText, userAnswer, correctAnswer, topicTitle, subtopic' });
      return;
    }

    console.log(`🤖 Generating personalized feedback for: ${subtopic}`);

    const feedback = await azureOpenAIService.generatePersonalizedFeedback({
      questionText,
      userAnswer,
      correctAnswer,
      isCorrect,
      topicTitle,
      subtopic
    });

    res.json({
      message: 'Personalized feedback generated successfully',
      feedback
    });

  } catch (error) {
    console.error('Generate personalized feedback error:', error);
    res.status(500).json({ 
      error: 'Failed to generate personalized feedback',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Generate question feedback for assessment analysis
 * POST /api/ai/feedback/question
 */
export const generateQuestionFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { question, questionType, studentAnswer, correctAnswer, isCorrect, explanation } = req.body;

    if (!question || !questionType || studentAnswer === undefined || correctAnswer === undefined || isCorrect === undefined) {
      res.status(400).json({ error: 'Missing required fields: question, questionType, studentAnswer, correctAnswer, isCorrect' });
      return;
    }

    console.log(`🤖 Generating question feedback for ${questionType} question`);

    const feedback = await azureOpenAIService.generateQuestionFeedback({
      question,
      questionType,
      studentAnswer,
      correctAnswer,
      isCorrect,
      explanation: explanation || ''
    });

    res.json({
      message: 'Question feedback generated successfully',
      feedback
    });

  } catch (error) {
    console.error('Generate question feedback error:', error);
    res.status(500).json({ 
      error: 'Failed to generate question feedback',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};
