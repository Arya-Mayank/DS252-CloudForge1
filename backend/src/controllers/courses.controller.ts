import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import courseModel from '../models/course.model';
import azureBlobService from '../services/azure-blob.service';
import multer from 'multer';
// import path from 'path'; // Not used in current implementation
import { promises as fs } from 'fs';

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

export const uploadMiddleware = upload.single('file');

/**
 * Create a new course (Instructor only)
 */
export const createCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { title, description } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Course title is required' });
      return;
    }

    const course = await courseModel.create({
      instructor_id: req.user.id,
      title,
      description
    });

    res.status(201).json({
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Failed to create course' });
  }
};

/**
 * Get all courses (filtered by user role)
 */
export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    let courses;

    if (req.user.role === 'instructor') {
      // Instructors see only their courses
      courses = await courseModel.findAll(req.user.id);
    } else {
      // Students see enrolled courses
      courses = await courseModel.findByStudent(req.user.id);
    }

    res.json({ courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/**
 * Get all courses (for enrollment browsing)
 * Only returns published courses for students
 */
export const getAllCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only show published courses for browsing
    // Instructors can see their own unpublished courses, but students should only see published ones
    const publishedOnly = req.user?.role === 'student';
    const courses = await courseModel.findAll(undefined, publishedOnly);
    res.json({ courses });
  } catch (error) {
    console.error('Get all courses error:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/**
 * Get a single course by ID
 */
export const getCourseById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const course = await courseModel.findById(id);

    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    res.json({ course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ error: 'Failed to fetch course' });
  }
};

/**
 * Upload course material (Instructor only)
 */
export const uploadCourseMaterial = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      await fs.unlink(file.path); // Clean up uploaded file
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only upload materials to your own courses' });
      await fs.unlink(file.path);
      return;
    }

    // Upload to Azure Blob Storage
    const uploadResult = await azureBlobService.uploadFile(file.path, file.originalname);

    // Update course with file info
    const updatedCourse = await courseModel.update(id, {
      file_url: uploadResult.url,
      file_name: file.originalname
    });

    // Clean up local file
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.error('Failed to delete temp file:', err);
    }

    res.json({
      message: 'Course material uploaded successfully',
      course: updatedCourse,
      file: {
        url: uploadResult.url,
        name: file.originalname
      }
    });
  } catch (error) {
    console.error('Upload course material error:', error);
    res.status(500).json({ error: 'Failed to upload course material' });
  }
};

/**
 * Update course
 */
export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { title, description, syllabus } = req.body;

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only update your own courses' });
      return;
    }

    const updates: any = {};
    if (title) updates.title = title;
    if (description) updates.description = description;
    if (syllabus) updates.syllabus = syllabus;

    const updatedCourse = await courseModel.update(id, updates);

    res.json({
      message: 'Course updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Failed to update course' });
  }
};

/**
 * Delete course
 */
export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete your own courses' });
      return;
    }

    // Delete from database
    await courseModel.delete(id);

    // TODO: Also delete associated files from Azure Blob Storage

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Failed to delete course' });
  }
};

/**
 * Publish course syllabus (make visible to students)
 * PUT /api/courses/:id/publish
 */
export const publishCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only publish your own courses' });
      return;
    }

    // Check if syllabus exists
    if (!course.syllabus || (Array.isArray(course.syllabus) && course.syllabus.length === 0)) {
      res.status(400).json({ error: 'Cannot publish course without a syllabus. Generate a syllabus first.' });
      return;
    }

    // Publish the course
    const updatedCourse = await courseModel.publish(id);

    res.json({ 
      message: 'Course syllabus published successfully',
      course: updatedCourse 
    });
  } catch (error) {
    console.error('Publish course error:', error);
    res.status(500).json({ error: 'Failed to publish course' });
  }
};

/**
 * Unpublish course syllabus (hide from students)
 * PUT /api/courses/:id/unpublish
 */
export const unpublishCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only unpublish your own courses' });
      return;
    }

    // Unpublish the course
    const updatedCourse = await courseModel.unpublish(id);

    res.json({ 
      message: 'Course syllabus unpublished successfully',
      course: updatedCourse 
    });
  } catch (error) {
    console.error('Unpublish course error:', error);
    res.status(500).json({ error: 'Failed to unpublish course' });
  }
};

/**
 * Enroll in a course (Student only)
 */
export const enrollInCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'student') {
      res.status(403).json({ error: 'Only students can enroll in courses' });
      return;
    }

    const { id } = req.params;

    // Verify course exists
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Verify course is published
    if (!course.is_published) {
      res.status(400).json({ error: 'Course is not published yet. Please wait for the instructor to publish it.' });
      return;
    }

    // Check if already enrolled
    const isEnrolled = await courseModel.isEnrolled(req.user.id, id);
    if (isEnrolled) {
      res.status(400).json({ error: 'Already enrolled in this course' });
      return;
    }

    // Enroll student
    await courseModel.enrollStudent(req.user.id, id);

    res.json({ message: 'Successfully enrolled in course' });
  } catch (error) {
    console.error('Enroll in course error:', error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check for common database errors
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
      res.status(400).json({ error: 'Already enrolled in this course' });
      return;
    }
    
    res.status(500).json({ 
      error: 'Failed to enroll in course',
      details: errorMessage 
    });
  }
};

/**
 * Unenroll from a course (Student only)
 */
export const unenrollFromCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'student') {
      res.status(403).json({ error: 'Only students can unenroll from courses' });
      return;
    }

    const { id } = req.params;

    // Verify course exists
    const course = await courseModel.findById(id);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    // Check if enrolled
    const isEnrolled = await courseModel.isEnrolled(req.user.id, id);
    if (!isEnrolled) {
      res.status(400).json({ error: 'Not enrolled in this course' });
      return;
    }

    await courseModel.unenrollStudent(req.user.id, id);

    res.json({ message: 'Successfully unenrolled from course' });
  } catch (error) {
    console.error('Unenroll from course error:', error);
    
    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({ 
      error: 'Failed to unenroll from course',
      details: errorMessage 
    });
  }
};

