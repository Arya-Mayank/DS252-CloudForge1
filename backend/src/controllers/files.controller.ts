import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import courseModel from '../models/course.model';
import azureBlobService from '../services/azure-blob.service';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Delete a course file
 * DELETE /api/courses/:id/files/:fileName
 */
export const deleteCourseFile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id, fileName } = req.params;

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete files from your own courses' });
      return;
    }

    // Check if this is the file to delete
    if (course.file_name !== fileName) {
      res.status(404).json({ error: 'File not found in this course' });
      return;
    }

    // Extract blob name from URL if using Azure
    let blobName = fileName;
    if (course.file_url && course.file_url.includes('blob.core.windows.net')) {
      // Azure Blob Storage URL
      const urlParts = course.file_url.split('/');
      blobName = urlParts[urlParts.length - 1];
    }

    // Try to delete from Azure Blob Storage
    const deletedFromAzure = await azureBlobService.deleteFile(blobName);

    // If not deleted from Azure, try local storage
    if (!deletedFromAzure) {
      const localPath = path.join(process.cwd(), 'uploads', blobName);
      try {
        await fs.unlink(localPath);
      } catch (error) {
        console.error('Failed to delete local file:', error);
      }
    }

    // Update course to remove file references
    const updatedCourse = await courseModel.update(id, {
      file_url: null,
      file_name: null,
    });

    res.json({
      message: 'File deleted successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
};

/**
 * Get all files for a course (for future multi-file support)
 * GET /api/courses/:id/files
 */
export const getCourseFiles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // For now, return single file
    // TODO: Extend to support multiple files in Phase 2
    const files = course.file_name ? [
      {
        name: course.file_name,
        url: course.file_url,
        uploadedAt: course.updated_at,
      }
    ] : [];

    res.json({ files });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
};

/**
 * Get file size and metadata
 * GET /api/courses/:id/files/:fileName/info
 */
export const getFileInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id, fileName } = req.params;

    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.file_name !== fileName) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Get file size from local storage
    let fileSize = 0;
    let mimeType = 'application/octet-stream';

    const localPath = path.join(process.cwd(), 'uploads', fileName);
    try {
      const stats = await fs.stat(localPath);
      fileSize = stats.size;
      
      // Determine mime type from extension
      const ext = path.extname(fileName).toLowerCase();
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') mimeType = 'application/msword';
    } catch (error) {
      console.error('Could not get file stats:', error);
    }

    res.json({
      name: course.file_name,
      url: course.file_url,
      size: fileSize,
      sizeFormatted: formatFileSize(fileSize),
      mimeType,
      uploadedAt: course.updated_at,
    });
  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
};

/**
 * Helper: Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

