import { Request, Response } from 'express';
import { getOpenAIClient, getDeploymentName, isAzureMockMode } from '../config/azure.config';

/**
 * Test Azure OpenAI connection
 * GET /api/test/azure-openai
 */
export const testAzureOpenAI = async (_req: Request, res: Response): Promise<void> => {
  try {
    console.log(' Testing Azure OpenAI connection...');
    
    const client = getOpenAIClient();
    
    if (isAzureMockMode() || !client) {
      res.json({
        success: false,
        mode: 'MOCK',
        message: 'Azure OpenAI is in MOCK mode. Add credentials to .env file.',
        instructions: {
          AZURE_OPENAI_ENDPOINT: 'Your Azure endpoint',
          AZURE_OPENAI_KEY: 'Your API key', 
          AZURE_OPENAI_DEPLOYMENT: 'Your deployment name'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Try a simple chat completion
    const deployment = getDeploymentName();
    console.log(`📡 Testing deployment: ${deployment}`);
    
    const response = await client.getChatCompletions(
      deployment,
      [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello from Azure OpenAI!" and nothing else.' }
      ],
      {
        maxCompletionTokens: 50,
      } as any
    );

    const reply = response.choices[0]?.message?.content || 'No response';
    
    res.json({
      success: true,
      mode: 'PRODUCTION',
      message: 'Azure OpenAI connection successful!',
      deployment: deployment,
      response: reply,
      usage: response.usage,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Azure OpenAI test failed:', error);
    res.status(500).json({
      success: false,
      mode: 'ERROR',
      error: error.message || 'Unknown error',
      details: error.toString(),
      code: error.code,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString()
    });
  }
};

