import { Router } from 'express';
import * as coursesController from '../controllers/courses.controller';
import * as filesController from '../controllers/files.controller';
import { authenticateToken, requireInstructor, requireStudent } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  Private (Instructor only)
 */
router.post(
  '/',
  authenticateToken,
  requireInstructor,
  coursesController.createCourse
);

/**
 * @route   GET /api/courses
 * @desc    Get courses (instructor: own courses, student: enrolled courses)
 * @access  Private
 */
router.get(
  '/',
  authenticateToken,
  coursesController.getCourses
);

/**
 * @route   GET /api/courses/all
 * @desc    Get all courses (for browsing/enrollment)
 * @access  Private
 */
router.get(
  '/all',
  authenticateToken,
  coursesController.getAllCourses
);

/**
 * @route   GET /api/courses/:id
 * @desc    Get a single course by ID
 * @access  Private
 */
router.get(
  '/:id',
  authenticateToken,
  coursesController.getCourseById
);

/**
 * @route   POST /api/courses/:id/upload
 * @desc    Upload course material (PDF/DOCX)
 * @access  Private (Instructor only)
 */
router.post(
  '/:id/upload',
  authenticateToken,
  requireInstructor,
  coursesController.uploadMiddleware,
  coursesController.uploadCourseMaterial
);

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course
 * @access  Private (Instructor only)
 */
router.put(
  '/:id',
  authenticateToken,
  requireInstructor,
  coursesController.updateCourse
);

/**
 * @route   DELETE /api/courses/:id
 * @desc    Delete course
 * @access  Private (Instructor only)
 */
router.delete(
  '/:id',
  authenticateToken,
  requireInstructor,
  coursesController.deleteCourse
);

/**
 * @route   GET /api/courses/:id/files
 * @desc    Get all files for a course
 * @access  Private
 */
router.get(
  '/:id/files',
  authenticateToken,
  filesController.getCourseFiles
);

/**
 * @route   GET /api/courses/:id/files/:fileName/info
 * @desc    Get file metadata
 * @access  Private
 */
router.get(
  '/:id/files/:fileName/info',
  authenticateToken,
  filesController.getFileInfo
);

/**
 * @route   DELETE /api/courses/:id/files/:fileName
 * @desc    Delete a course file
 * @access  Private (Instructor only)
 */
router.delete(
  '/:id/files/:fileName',
  authenticateToken,
  requireInstructor,
  filesController.deleteCourseFile
);

/**
 * @route   POST /api/courses/:id/enroll
 * @desc    Enroll in a course
 * @access  Private (Student only)
 */
router.post(
  '/:id/enroll',
  authenticateToken,
  requireStudent,
  coursesController.enrollInCourse
);

/**
 * @route   DELETE /api/courses/:id/enroll
 * @desc    Unenroll from a course
 * @access  Private (Student only)
 */
router.delete(
  '/:id/enroll',
  authenticateToken,
  requireStudent,
  coursesController.unenrollFromCourse
);

/**
 * @route   PUT /api/courses/:id/publish
 * @desc    Publish course syllabus (make visible to students)
 * @access  Private (Instructor only)
 */
router.put(
  '/:id/publish',
  authenticateToken,
  requireInstructor,
  coursesController.publishCourse
);

/**
 * @route   PUT /api/courses/:id/unpublish
 * @desc    Unpublish course syllabus (hide from students)
 * @access  Private (Instructor only)
 */
router.put(
  '/:id/unpublish',
  authenticateToken,
  requireInstructor,
  coursesController.unpublishCourse
);

export default router;

