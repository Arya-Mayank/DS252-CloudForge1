import { Router } from 'express';
import * as testController from '../controllers/test-azure.controller';

const router = Router();

/**
 * @route   GET /api/test/azure-openai
 * @desc    Test Azure OpenAI connection
 * @access  Public (for testing purposes)
 */
router.get('/azure-openai', testController.testAzureOpenAI);

export default router;

