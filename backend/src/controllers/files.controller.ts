import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import courseModel from '../models/course.model';
import azureBlobService from '../services/azure-blob.service';
import { promises as fs } from 'fs';
import path from 'path';
import { CourseFile } from '../models/course.model';

const formatCourseFile = (file: CourseFile) => ({
  id: file.id,
  name: file.file_name,
  url: file.file_url,
  uploadedAt: file.uploaded_at,
  uploadedBy: file.uploaded_by
});

const extractBlobName = (fileUrl: string | null, fallback: string): string => {
  if (!fileUrl) {
    return fallback;
  }

  if (fileUrl.includes('blob.core.windows.net') || fileUrl.includes('/uploads/')) {
    const parts = fileUrl.split('/');
    return parts[parts.length - 1];
  }

  return fallback;
};

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

    const { id, fileId } = req.params;

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

    let courseFile = await courseModel.getCourseFileById(id, fileId);
    let isLegacyFile = false;

    // Support legacy single-file storage by matching on file name
    if (!courseFile && course.file_name && course.file_name === fileId) {
      isLegacyFile = true;
      const legacyFileName = course.file_name ?? 'legacy-file';
      const legacyFileUrl = course.file_url || '';
      courseFile = {
        id: legacyFileName,
        course_id: id,
        file_name: legacyFileName,
        file_url: legacyFileUrl,
        blob_name: extractBlobName(legacyFileUrl, legacyFileName),
        uploaded_by: course.instructor_id,
        uploaded_at: course.updated_at || new Date().toISOString()
      };
    }

    if (!courseFile) {
      res.status(404).json({ error: 'File not found in this course' });
      return;
    }

    const blobName = courseFile.blob_name || extractBlobName(courseFile.file_url, courseFile.file_name);

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

    if (isLegacyFile) {
      await courseModel.update(id, { file_url: null, file_name: null });
    } else {
      await courseModel.deleteCourseFile(courseFile.id);

      // Update course with the latest file (if any)
      const latestFile = await courseModel.getLatestCourseFile(id);
      await courseModel.update(id, {
        file_url: latestFile?.file_url || null,
        file_name: latestFile?.file_name || null
      });
    }

    const files = await courseModel.getCourseFiles(id);

    res.json({
      message: 'File deleted successfully',
      files: files.map(formatCourseFile)
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

    const courseFiles = await courseModel.getCourseFiles(id);
    let files = courseFiles.map(formatCourseFile);

    // Fallback for legacy single-file storage
    if (files.length === 0 && course.file_name && course.file_url) {
      const legacyFileName = course.file_name ?? 'legacy-file';
      const legacyFileUrl = course.file_url ?? '';
      files = [{
        id: legacyFileName,
        name: legacyFileName,
        url: legacyFileUrl,
        uploadedAt: course.updated_at || new Date().toISOString(),
        uploadedBy: course.instructor_id
      }];
    }

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

    const { id, fileId } = req.params;

    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    let courseFile = await courseModel.getCourseFileById(id, fileId);
    let isLegacyFile = false;

    if (!courseFile && course.file_name && course.file_name === fileId) {
      isLegacyFile = true;
      const legacyFileName = course.file_name ?? 'legacy-file';
      const legacyFileUrl = course.file_url || '';
      courseFile = {
        id: legacyFileName,
        course_id: id,
        file_name: legacyFileName,
        file_url: legacyFileUrl,
        blob_name: extractBlobName(legacyFileUrl, legacyFileName),
        uploaded_by: course.instructor_id,
        uploaded_at: course.updated_at || new Date().toISOString()
      };
    }

    if (!courseFile) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Get file size from local storage
    let fileSize = 0;
    let mimeType = 'application/octet-stream';

    const blobName = courseFile.blob_name || extractBlobName(courseFile.file_url, courseFile.file_name);
    const localPath = path.join(process.cwd(), 'uploads', blobName);
    try {
      const stats = await fs.stat(localPath);
      fileSize = stats.size;
      
      // Determine mime type from extension
      const ext = path.extname(courseFile.file_name).toLowerCase();
      if (ext === '.pdf') mimeType = 'application/pdf';
      else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      else if (ext === '.doc') mimeType = 'application/msword';
    } catch (error) {
      console.error('Could not get file stats:', error);
    }

    res.json({
      name: courseFile.file_name,
      url: courseFile.file_url,
      size: fileSize,
      sizeFormatted: formatFileSize(fileSize),
      mimeType,
      uploadedAt: courseFile.uploaded_at,
      isLegacy: isLegacyFile
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

