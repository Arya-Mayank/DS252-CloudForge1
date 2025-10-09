import { getBlobServiceClient, getBlobContainerName } from '../config/azure.config';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Azure Blob Storage Service
 * Handles file uploads, downloads, and deletions
 * 
 * MOCK MODE: Stores files locally in uploads/ directory
 * PRODUCTION: Uses Azure Blob Storage for scalable cloud storage
 */

export interface UploadResult {
  url: string;
  blobName: string;
  container: string;
}

class AzureBlobService {
  private mockStoragePath = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure mock storage directory exists
    this.ensureMockStorageExists();
  }

  private async ensureMockStorageExists() {
    try {
      await fs.mkdir(this.mockStoragePath, { recursive: true });
    } catch (error) {
      console.error('Error creating mock storage directory:', error);
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   * TODO: Add your Azure Storage connection string to .env to enable real uploads
   */
  async uploadFile(filePath: string, originalName: string): Promise<UploadResult> {
    const client = getBlobServiceClient();
    const containerName = getBlobContainerName();

    if (!client) {
      console.log('📁 Using MOCK file storage (local uploads/ directory)');
      return this.mockUploadFile(filePath, originalName);
    }

    try {
      const containerClient = client.getContainerClient(containerName);
      
      // Create container if it doesn't exist
      await containerClient.createIfNotExists({ access: 'blob' });

      // Generate unique blob name
      const timestamp = Date.now();
      const blobName = `${timestamp}-${originalName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload file
      const fileContent = await fs.readFile(filePath);
      await blockBlobClient.uploadData(fileContent);

      console.log(`✅ File uploaded to Azure Blob Storage: ${blobName}`);

      return {
        url: blockBlobClient.url,
        blobName,
        container: containerName
      };
    } catch (error) {
      console.error('Error uploading to Azure Blob Storage:', error);
      console.log('Falling back to local storage...');
      return this.mockUploadFile(filePath, originalName);
    }
  }

  /**
   * Get a file URL from Azure Blob Storage
   */
  async getFileUrl(blobName: string): Promise<string> {
    const client = getBlobServiceClient();
    const containerName = getBlobContainerName();

    if (!client) {
      return `http://localhost:5000/uploads/${blobName}`;
    }

    try {
      const containerClient = client.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      return blockBlobClient.url;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return `http://localhost:5000/uploads/${blobName}`;
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(blobName: string): Promise<boolean> {
    const client = getBlobServiceClient();
    const containerName = getBlobContainerName();

    if (!client) {
      return this.mockDeleteFile(blobName);
    }

    try {
      const containerClient = client.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      
      console.log(`✅ File deleted from Azure Blob Storage: ${blobName}`);
      return true;
    } catch (error) {
      console.error('Error deleting from Azure Blob Storage:', error);
      return this.mockDeleteFile(blobName);
    }
  }

  // ============= MOCK IMPLEMENTATION =============

  private async mockUploadFile(filePath: string, originalName: string): Promise<UploadResult> {
    const timestamp = Date.now();
    const blobName = `${timestamp}-${originalName}`;
    const destPath = path.join(this.mockStoragePath, blobName);

    try {
      await fs.copyFile(filePath, destPath);
      
      return {
        url: `http://localhost:5000/uploads/${blobName}`,
        blobName,
        container: 'local-uploads'
      };
    } catch (error) {
      console.error('Error in mock file upload:', error);
      throw new Error('Failed to upload file');
    }
  }

  private async mockDeleteFile(blobName: string): Promise<boolean> {
    const filePath = path.join(this.mockStoragePath, blobName);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error('Error deleting mock file:', error);
      return false;
    }
  }

  /**
   * Get path to mock storage directory
   */
  getMockStoragePath(): string {
    return this.mockStoragePath;
  }
}

export default new AzureBlobService();

