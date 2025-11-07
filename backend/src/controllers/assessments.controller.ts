import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import assessmentModel from '../models/assessment.model';
import topicModel, { Topic, Subtopic } from '../models/topic.model';
import azureOpenAIService from '../services/azure-openai.service';
import courseModel from '../models/course.model';

/**
 * Create a new assessment with AI-generated questions
 * POST /api/assessments
 */
export const createAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { courseId, title, description, subtopics, timeLimit, passingScore, difficultyDistribution, quizLevel } = req.body;

    // Validate required fields
    if (!courseId || !title || !subtopics || !Array.isArray(subtopics) || subtopics.length === 0) {
      res.status(400).json({ error: 'Missing required fields: courseId, title, subtopics' });
      return;
    }

    // Verify course exists and user is the instructor
    const course = await courseModel.findById(courseId);
    if (!course) {
      res.status(404).json({ error: 'Course not found' });
      return;
    }

    if (course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only create assessments for your own courses' });
      return;
    }

    console.log(`📝 Creating assessment "${title}" for course ${courseId}`);
    console.log(`📊 Selected ${subtopics.length} subtopic(s)`);

    // Step 1: Create the assessment record
    const assessment = await assessmentModel.create({
      course_id: courseId,
      instructor_id: req.user.id,
      title,
      description,
      time_limit_minutes: timeLimit,
      passing_score: passingScore
    });

    console.log(`✅ Assessment created with ID: ${assessment.id}`);

    // Step 2: Prepare subtopic data with topic IDs and Bloom's taxonomy levels
    const enrichedSubtopics = await Promise.all(
      subtopics.map(async (st: any) => {
        // Find topic and subtopic IDs from database
        const topics = await topicModel.findTopicsByCourse(courseId);
        const topic = topics.find((t: Topic) => t.title === st.topicTitle);
        
        let subtopic_id = null;
        let bloom_level: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | undefined = undefined;
        let topic_bloom_level: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' | undefined = undefined;
        
        if (topic && topic.id) {
          topic_bloom_level = topic.bloom_level || undefined;
          const subtopicsFromDb = await topicModel.findSubtopicsByTopic(topic.id);
          const subtopic = subtopicsFromDb.find((s: Subtopic) => s.title === st.subtopic);
          subtopic_id = subtopic?.id || null;
          // Get Bloom's taxonomy level from subtopic (preferred) or topic (fallback)
          bloom_level = subtopic?.bloom_level || topic_bloom_level;
        }

        return {
          topicTitle: st.topicTitle,
          subtopic: st.subtopic,
          mcqCount: st.mcqCount || 0,
          msqCount: st.msqCount || 0,
          subjectiveCount: st.subjectiveCount || 0,
          topic_id: topic?.id || null,
          subtopic_id,
          bloom_level // Include Bloom's taxonomy level from syllabus
        };
      })
    );

    // Step 3: Generate questions using AI
    console.log(`🤖 Generating questions with Azure OpenAI...`);
    
    const { questions } = await azureOpenAIService.generateQuestionsForAssessment({
      subtopics: enrichedSubtopics,
      courseContext: course.description || undefined,
      difficultyDistribution: difficultyDistribution || undefined,
      quizLevel: quizLevel || 'UG'
    });

    console.log(`✅ Generated ${questions.length} questions`);

    // Step 4: Save questions to database
    let questionNumber = 1;
    const savedQuestions = [];

    for (const q of questions) {
      // Find the matching enriched subtopic to get IDs
      const matchingSubtopic = enrichedSubtopics.find(
        s => s.topicTitle === q.topicTitle && s.subtopic === q.subtopic
      );

      // Map AI service options format to database format
      const mappedOptions = q.options?.map(opt => ({
        option_label: opt.label,
        option_text: opt.text,
        is_correct: opt.isCorrect
      }));

      const savedQuestion = await assessmentModel.createQuestion({
        assessment_id: assessment.id,
        topic_id: matchingSubtopic?.topic_id || undefined,
        subtopic_id: matchingSubtopic?.subtopic_id || undefined,
        question_type: q.questionType,
        question_text: q.questionText,
        question_number: questionNumber++,
        points: q.points,
        explanation: q.explanation,
        difficulty: q.difficulty,
        bloom_level: q.bloom_level,
        options: mappedOptions
      });

      savedQuestions.push(savedQuestion);
    }

    console.log(`✅ Saved ${savedQuestions.length} questions to database`);

    // Step 5: Link unique topics to assessment
    const uniqueTopicIds = [...new Set(enrichedSubtopics.map(s => s.topic_id).filter(Boolean))] as string[];
    if (uniqueTopicIds.length > 0) {
      await assessmentModel.linkTopics(assessment.id, uniqueTopicIds);
      console.log(`✅ Linked ${uniqueTopicIds.length} topic(s) to assessment`);
    }

    // Step 6: Fetch updated assessment with counts (trigger should have updated these)
    const updatedAssessment = await assessmentModel.findById(assessment.id);

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment: updatedAssessment,
      questionsGenerated: savedQuestions.length
    });

  } catch (error) {
    console.error('Create assessment error:', error);
    res.status(500).json({ 
      error: 'Failed to create assessment',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Get all assessments for a course
 * GET /api/assessments/course/:courseId
 */
export const getCourseAssessments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;

    const assessments = await assessmentModel.findByCourseId(courseId);

    // Get topics for each assessment
    const assessmentsWithTopics = await Promise.all(
      assessments.map(async (assessment) => {
        const topicIds = await assessmentModel.getTopics(assessment.id);
        return {
          ...assessment,
          topicIds
        };
      })
    );

    res.json({ assessments: assessmentsWithTopics });
  } catch (error) {
    console.error('Get course assessments error:', error);
    res.status(500).json({ error: 'Failed to fetch assessments' });
  }
};

/**
 * Get assessment by ID with questions
 * GET /api/assessments/:id
 */
export const getAssessmentWithQuestions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    const questions = await assessmentModel.getQuestions(id);
    const topicIds = await assessmentModel.getTopics(id);

    res.json({
      assessment: {
        ...assessment,
        topicIds
      },
      questions
    });
  } catch (error) {
    console.error('Get assessment error:', error);
    res.status(500).json({ error: 'Failed to fetch assessment' });
  }
};

/**
 * Update assessment
 * PUT /api/assessments/:id
 */
export const updateAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    // Verify assessment exists and user is the instructor
    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (assessment.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only update your own assessments' });
      return;
    }

    const updatedAssessment = await assessmentModel.update(id, updates);

    res.json({
      message: 'Assessment updated successfully',
      assessment: updatedAssessment
    });
  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({ error: 'Failed to update assessment' });
  }
};

/**
 * Publish assessment
 * PUT /api/assessments/:id/publish
 */
export const publishAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (assessment.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only publish your own assessments' });
      return;
    }

    if (assessment.total_questions === 0) {
      res.status(400).json({ error: 'Cannot publish assessment without questions' });
      return;
    }

    const updatedAssessment = await assessmentModel.publish(id);

    res.json({
      message: 'Assessment published successfully',
      assessment: updatedAssessment
    });
  } catch (error) {
    console.error('Publish assessment error:', error);
    res.status(500).json({ error: 'Failed to publish assessment' });
  }
};

/**
 * Unpublish assessment
 * PUT /api/assessments/:id/unpublish
 */
export const unpublishAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (assessment.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only unpublish your own assessments' });
      return;
    }

    const updatedAssessment = await assessmentModel.unpublish(id);

    res.json({
      message: 'Assessment unpublished successfully',
      assessment: updatedAssessment
    });
  } catch (error) {
    console.error('Unpublish assessment error:', error);
    res.status(500).json({ error: 'Failed to unpublish assessment' });
  }
};

/**
 * Delete assessment
 * DELETE /api/assessments/:id
 */
export const deleteAssessment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;

    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    if (assessment.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only delete your own assessments' });
      return;
    }

    await assessmentModel.delete(id);

    res.json({ message: 'Assessment deleted successfully' });
  } catch (error) {
    console.error('Delete assessment error:', error);
    res.status(500).json({ error: 'Failed to delete assessment' });
  }
};

/**
 * Save selected questions from an assessment to the question bank
 * POST /api/assessments/:id/save-to-bank
 */
export const saveQuestionsToBank = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { questionIds } = req.body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      res.status(400).json({ error: 'Missing or invalid questionIds array' });
      return;
    }

    // Get assessment to verify ownership and get course_id
    const assessment = await assessmentModel.findById(id);
    if (!assessment) {
      res.status(404).json({ error: 'Assessment not found' });
      return;
    }

    // Verify user is the instructor
    const course = await courseModel.findById(assessment.course_id);
    if (!course || course.instructor_id !== req.user.id) {
      res.status(403).json({ error: 'You can only save questions from your own assessments' });
      return;
    }

    // Save each question to the bank
    const savedQuestions = [];
    for (const questionId of questionIds) {
      try {
        const bankQuestion = await assessmentModel.saveToQuestionBank(questionId, assessment.course_id);
        savedQuestions.push(bankQuestion);
      } catch (error) {
        console.error(`Error saving question ${questionId} to bank:`, error);
        // Continue with other questions
      }
    }

    res.status(201).json({
      message: `Saved ${savedQuestions.length} question(s) to question bank`,
      savedCount: savedQuestions.length,
      totalRequested: questionIds.length
    });

  } catch (error) {
    console.error('Save questions to bank error:', error);
    res.status(500).json({ 
      error: 'Failed to save questions to bank',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};


