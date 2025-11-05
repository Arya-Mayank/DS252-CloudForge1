import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import azureOpenAIService from '../services/azure-openai.service';
import azureSearchService from '../services/azure-search.service';
import courseModel from '../models/course.model';
import assessmentModel from '../models/assessment.model';
import { parseDocument, chunkText } from '../utils/fileParser';
import path from 'path';

/**
 * Generate syllabus from uploaded document
 * POST /api/ai/syllabus
 */
export const generateSyllabus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { courseId, documentText, updateExisting } = req.body;

    if (!courseId) {
      res.status(400).json({ error: 'Course ID is required' });
      return;
    }

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only generate syllabus for your own courses' });
      return;
    }

    let textToAnalyze = documentText;

    // If no text provided, try to parse the uploaded file
    if (!textToAnalyze && course.file_url) {
      console.log('📄 Extracting text from uploaded file...');
      try {
        // Get local file path (for mock mode) or download from Azure
        const filePath = course.file_url.startsWith('http://localhost') 
          ? course.file_url.replace('http://localhost:5000/', '')
          : course.file_url;
        
        // Determine mime type from filename
        const fileName = course.file_name || '';
        let mimeType = 'application/pdf';
        if (fileName.endsWith('.docx')) {
          mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (fileName.endsWith('.doc')) {
          mimeType = 'application/msword';
        }
        
        textToAnalyze = await parseDocument(filePath, mimeType);
        console.log(`✅ Extracted ${textToAnalyze.length} characters from file`);
      } catch (error) {
        console.error('Failed to parse file:', error);
        res.status(400).json({ 
          error: 'Failed to extract text from uploaded file. Please try uploading again.' 
        });
        return;
      }
    }

    if (!textToAnalyze) {
      res.status(400).json({ 
        error: 'No content to analyze. Please upload a file or provide text.' 
      });
      return;
    }

    console.log(`🤖 Generating syllabus from ${textToAnalyze.length} characters of content`);
    
    // Generate syllabus using Azure OpenAI
    // If updating existing syllabus and course has one, merge intelligently
    let syllabus;
    if (updateExisting && course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0) {
      console.log('📝 Updating existing syllabus with new content...');
      syllabus = await azureOpenAIService.updateSyllabus(textToAnalyze, course.syllabus);
    } else {
      syllabus = await azureOpenAIService.generateSyllabus(textToAnalyze);
    }

    // Update course with generated syllabus
    await courseModel.update(courseId, { syllabus });

    // Index document chunks for search (Phase 2 RAG enhancement)
    const chunks = chunkText(textToAnalyze);
    const documentChunks = chunks.map((chunk, index) => ({
      id: `${courseId}-chunk-${index}`,
      courseId,
      content: chunk,
      metadata: {
        section: `Chunk ${index + 1}`
      }
    }));
    await azureSearchService.indexDocument(documentChunks);

    res.json({
      message: updateExisting ? 'Syllabus updated successfully' : 'Syllabus generated successfully',
      syllabus,
      isUpdate: updateExisting || false
    });
  } catch (error) {
    console.error('Generate syllabus error:', error);
    res.status(500).json({ error: 'Failed to generate syllabus' });
  }
};

/**
 * Generate assessment questions
 * POST /api/ai/assessment
 */
export const generateAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { courseId, topics, questionCount = 10, assessmentTitle } = req.body;

    if (!courseId || !topics || !Array.isArray(topics) || topics.length === 0) {
      res.status(400).json({ error: 'Course ID and topics array are required' });
      return;
    }

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only generate assessments for your own courses' });
      return;
    }

    // Generate questions using Azure OpenAI
    const questions = await azureOpenAIService.generateAssessment(topics, questionCount);

    // NOTE: This is the old assessment generation method.
    // Use POST /api/assessments endpoint instead (assessments.controller.ts)
    
    res.json({
      message: 'Assessment questions generated (use /api/assessments endpoint to create full assessment)',
      questions,
      deprecationWarning: 'This endpoint is deprecated. Use POST /api/assessments instead.'
    });
  } catch (error) {
    console.error('Generate assessment error:', error);
    res.status(500).json({ error: 'Failed to generate assessment' });
  }
};

/**
 * Generate personalized learning recommendations
 * POST /api/ai/recommend
 */
export const generateRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { studentId, courseId } = req.body;

    // If no studentId provided, use current user (must be student)
    const targetStudentId = studentId || req.user.id;

    // Verify user can access this data
    if (req.user.role === 'student' && targetStudentId !== req.user.id) {
      res.status(403).json({ error: 'You can only view your own recommendations' });
      return;
    }

    // TODO: Implement student results fetching (Phase 2)
    // For now, return placeholder response
    
    res.json({
      message: 'Recommendations feature coming in Phase 2',
      recommendations: [],
      note: 'This feature will be available after student assessment attempts are implemented'
    });
    return;

    // NOTE: Below code is commented out until Phase 2 implementation
    /*
    const results = await assessmentModel.findResultsByStudent(targetStudentId);
    if (results.length === 0) {
      res.json({
        message: 'No assessment results found. Complete some assessments to get recommendations.',
        recommendations: []
      });
      return;
    }

    let relevantResults = results;
    if (courseId) {
      const courseAssessments = await assessmentModel.findByCourseId(courseId);
      const assessmentIds = new Set(courseAssessments.map((a: any) => a.id));
      relevantResults = results.filter((r: any) => assessmentIds.has(r.assessment_id));
    }

    const performanceData = {
      studentId: targetStudentId,
      totalAssessments: relevantResults.length,
      averageScore: relevantResults.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0) / relevantResults.length,
      results: relevantResults.map((r: any) => ({
        assessmentId: r.assessment_id,
        score: r.percentage,
        completedAt: r.completed_at
      }))
    };

    const recommendations = await azureOpenAIService.generateRecommendations(performanceData);
    
    res.json({
      message: 'Recommendations generated successfully',
      recommendations,
      performanceSummary: {
        totalAssessments: performanceData.totalAssessments,
        averageScore: Math.round(performanceData.averageScore * 100) / 100
      }
    });
    */
  } catch (error) {
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
};

/**
 * Search course content using RAG
 * POST /api/ai/search
 * TODO Phase 2: Implement full RAG pipeline with embeddings
 */
export const searchCourseContent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { query, courseId } = req.body;

    if (!query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }

    // Search using Azure Cognitive Search
    const results = await azureSearchService.searchSimilar(query, courseId, 5);

    res.json({
      message: 'Search completed',
      query,
      results
    });
  } catch (error) {
    console.error('Search course content error:', error);
    res.status(500).json({ error: 'Failed to search course content' });
  }
};

