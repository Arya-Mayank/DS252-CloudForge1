import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { BlobServiceClient } from '@azure/storage-blob';
import { SearchClient, AzureKeyCredential as SearchKeyCredential } from '@azure/search-documents';

/**
 * Azure AI Foundry (OpenAI) Configuration
 * 
 * Setup Instructions:
 * 1. Go to https://ai.azure.com
 * 2. Create a new project or use existing one
 * 3. Deploy a gpt-4o-mini model
 * 4. Copy the endpoint and API key to your .env file
 * 
 * Environment Variables Required:
 * - AZURE_OPENAI_ENDPOINT: Your AI Foundry endpoint
 * - AZURE_OPENAI_KEY: Your Azure subscription key
 * - AZURE_OPENAI_DEPLOYMENT: Model deployment name (e.g., gpt-4o-mini)
 */

const MOCK_MODE = !process.env.AZURE_OPENAI_ENDPOINT || !process.env.AZURE_OPENAI_KEY;

export const getOpenAIClient = (): OpenAIClient | null => {
  if (MOCK_MODE) {
    console.warn('⚠️  Azure OpenAI running in MOCK mode. Add credentials to .env for real API calls.');
    return null;
  }

  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT!;
    const apiKey = process.env.AZURE_OPENAI_KEY!;
    return new OpenAIClient(endpoint, new AzureKeyCredential(apiKey));
  } catch (error) {
    console.error('Failed to initialize Azure OpenAI client:', error);
    return null;
  }
};

export const getDeploymentName = (): string => {
  return process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
};

/**
 * Azure Blob Storage Configuration
 * 
 * Setup Instructions:
 * 1. Create a Storage Account in Azure Portal
 * 2. Create a container named 'course-files'
 * 3. Copy the connection string to .env
 * 
 * Environment Variables Required:
 * - AZURE_STORAGE_CONNECTION_STRING: Storage account connection string
 * - AZURE_STORAGE_CONTAINER: Container name (default: course-files)
 */

export const getBlobServiceClient = (): BlobServiceClient | null => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    console.warn('⚠️  Azure Blob Storage running in MOCK mode. Add connection string to .env.');
    return null;
  }

  try {
    return BlobServiceClient.fromConnectionString(connectionString);
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage client:', error);
    return null;
  }
};

export const getBlobContainerName = (): string => {
  return process.env.AZURE_STORAGE_CONTAINER || 'course-files';
};

/**
 * Azure Cognitive Search Configuration
 * 
 * Setup Instructions:
 * 1. Create a Cognitive Search service in Azure Portal
 * 2. Create an index named 'course-embeddings'
 * 3. Copy the endpoint and admin key to .env
 * 
 * Environment Variables Required:
 * - AZURE_SEARCH_ENDPOINT: Search service endpoint
 * - AZURE_SEARCH_KEY: Admin API key
 * - AZURE_SEARCH_INDEX: Index name (default: course-embeddings)
 */

export const getSearchClient = (): SearchClient<any> | null => {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_KEY;
  const indexName = process.env.AZURE_SEARCH_INDEX || 'course-embeddings';

  if (!endpoint || !apiKey) {
    console.warn('⚠️  Azure Cognitive Search running in MOCK mode. Add credentials to .env.');
    return null;
  }

  try {
    return new SearchClient(endpoint, indexName, new SearchKeyCredential(apiKey));
  } catch (error) {
    console.error('Failed to initialize Azure Cognitive Search client:', error);
    return null;
  }
};

export const isAzureMockMode = (): boolean => MOCK_MODE;

