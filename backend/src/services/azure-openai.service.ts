import { getOpenAIClient, getDeploymentName, isAzureMockMode } from '../config/azure.config';

/**
 * Azure OpenAI Service
 * Handles AI-powered features: syllabus generation, assessment creation, and recommendations
 * 
 * MOCK MODE: When Azure credentials are not configured, returns mock responses
 * PRODUCTION: Uses Azure AI Foundry for real GPT-4o-mini completions
 */

export interface SyllabusItem {
  topic: string;
  subtopics: Array<string | { subtopic: string; bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE' }>;
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
}

export interface Question {
  id: string;
  type: 'mcq' | 'short-answer' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
  bloom_level?: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
}

export interface Recommendation {
  topic: string;
  reason: string;
  resources: string[];
  priority: 'high' | 'medium' | 'low';
}

class AzureOpenAIService {
  /**
   * Generate a structured syllabus from document text
   * TODO: Add your Azure AI Foundry endpoint and key to .env to enable real API calls
   */
  async generateSyllabus(documentText: string): Promise<SyllabusItem[]> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK syllabus generation');
      return this.getMockSyllabus(documentText);
    }

    try {
      const deployment = getDeploymentName();
      const contentToAnalyze = documentText.substring(0, 3000);
      
      console.log(`🤖 Calling Azure OpenAI (${deployment})`);
      console.log(`📊 Analyzing ${contentToAnalyze.length} characters`);
      console.log(`📝 Content preview: ${contentToAnalyze.substring(0, 100)}...`);
      
      const prompt = `Analyze the following course document and create a structured syllabus with topics and subtopics. You may optionally suggest Bloom's Taxonomy levels, but they will be set by the instructor.

Document:
${contentToAnalyze}

Return a JSON array of syllabus items with this structure:
[
  {
    "topic": "Topic Name",
    "bloom_level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE" (optional),
    "subtopics": [
      "Subtopic 1",
      {"subtopic": "Subtopic 2", "bloom_level": "APPLY"} (bloom_level is optional),
      ...
    ]
  }
]

Bloom's Taxonomy Levels (optional suggestions):
- REMEMBER: Recalling facts, concepts
- UNDERSTAND: Explaining ideas or concepts
- APPLY: Using information in new situations
- ANALYZE: Drawing connections among ideas
- EVALUATE: Justifying a stand or decision
- CREATE: Producing new or original work

Note: Bloom's taxonomy levels are optional. You may suggest them, but instructors will set them manually in the UI.

Important: Return ONLY the JSON array, no additional text.`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert curriculum designer. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 1500
        } as any
      );

      const content = response.choices[0]?.message?.content || '[]';
      console.log(`✅ Received response from Azure OpenAI`);
      console.log(`📊 Tokens used: ${JSON.stringify(response.usage)}`);
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsedSyllabus = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      console.log(`✅ Generated ${parsedSyllabus.length} syllabus items`);
      
      return parsedSyllabus;
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      return this.getMockSyllabus(documentText);
    }
  }

  /**
   * Update existing syllabus with new content, intelligently merging
   */
  async updateSyllabus(newDocumentText: string, existingSyllabus: SyllabusItem[]): Promise<SyllabusItem[]> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK syllabus update');
      // For mock mode, combine existing with mock new content
      const newSyllabus = this.getMockSyllabus(newDocumentText);
      return [...existingSyllabus, ...newSyllabus];
    }

    try {
      const deployment = getDeploymentName();
      const contentToAnalyze = newDocumentText.substring(0, 3000);
      const existingSyllabusStr = JSON.stringify(existingSyllabus, null, 2);
      
      console.log(`🤖 Updating syllabus with new content (${contentToAnalyze.length} chars)`);
      
      const prompt = `You are updating an existing course syllabus with new material. Analyze the new document content and intelligently merge it with the existing syllabus.

Existing Syllabus:
${existingSyllabusStr}

New Document Content:
${contentToAnalyze}

Instructions:
1. Preserve existing topics that are still relevant
2. Add new topics from the new content
3. Update subtopics within existing topics if new information is provided
4. Remove or mark outdated content if replaced by new material
5. Maintain the same structure and Bloom's taxonomy levels
6. Ensure topics flow logically and don't duplicate

Return a JSON array with the updated syllabus structure:
[
  {
    "topic": "Topic Name",
    "bloom_level": "REMEMBER|UNDERSTAND|APPLY|ANALYZE|EVALUATE|CREATE",
    "subtopics": [
      "Subtopic 1",
      {"subtopic": "Subtopic 2", "bloom_level": "APPLY"},
      ...
    ]
  }
]

Important: Return ONLY the JSON array, no additional text. Make sure the syllabus is comprehensive and includes both old and new relevant content.`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert curriculum designer. Intelligently merge existing and new syllabus content. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 2000
        } as any
      );

      const content = response.choices[0]?.message?.content || '[]';
      console.log(`✅ Received updated syllabus from Azure OpenAI`);
      console.log(`📊 Tokens used: ${JSON.stringify(response.usage)}`);
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsedSyllabus = jsonMatch ? JSON.parse(jsonMatch[0]) : existingSyllabus;
      
      console.log(`✅ Updated syllabus with ${parsedSyllabus.length} items (was ${existingSyllabus.length})`);
      
      return parsedSyllabus;
    } catch (error) {
      console.error('Error updating syllabus with Azure OpenAI:', error);
      // Fallback: combine existing with new mock content
      const newSyllabus = this.getMockSyllabus(newDocumentText);
      return [...existingSyllabus, ...newSyllabus];
    }
  }

  /**
   * Generate assessment questions from topics
   * TODO: Add your Azure AI Foundry endpoint and key to .env to enable real API calls
   */
  async generateAssessment(topics: string[], questionCount: number = 10): Promise<Question[]> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK assessment generation');
      return this.getMockQuestions(topics, questionCount);
    }

    try {
      const deployment = getDeploymentName();
      const prompt = `Generate ${questionCount} assessment questions covering these topics: ${topics.join(', ')}.

Create a mix of question types (MCQ, short answer, true/false) with varying difficulty levels.

Return a JSON array with this structure:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question text?",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "difficulty": "medium",
    "topic": "Topic Name"
  }
]`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert educator creating assessment questions. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 2000
        } as any
      );

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      return parsedQuestions;
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      return this.getMockQuestions(topics, questionCount);
    }
  }

  /**
   * Generate personalized learning recommendations based on student performance
   * TODO: Add your Azure AI Foundry endpoint and key to .env to enable real API calls
   */
  async generateRecommendations(performanceData: any): Promise<Recommendation[]> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK recommendation generation');
      return this.getMockRecommendations(performanceData);
    }

    try {
      const deployment = getDeploymentName();
      const prompt = `Analyze this student performance data and provide personalized learning recommendations:

${JSON.stringify(performanceData, null, 2)}

Return a JSON array with this structure:
[
  {
    "topic": "Topic Name",
    "reason": "Why this topic needs attention",
    "resources": ["Resource 1", "Resource 2"],
    "priority": "high"
  }
]`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an AI learning advisor. Analyze performance and suggest improvements. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 1500
        } as any
      );

      const content = response.choices[0]?.message?.content || '[]';
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const parsedRecommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      
      return parsedRecommendations;
    } catch (error) {
      console.error('Error calling Azure OpenAI:', error);
      return this.getMockRecommendations(performanceData);
    }
  }

  // ============= MOCK RESPONSES =============

  private getMockSyllabus(documentText: string): SyllabusItem[] {
    // Extract some keywords from document for realistic mock
    const words = documentText.split(/\s+/).slice(0, 20);
    const hasIntro = documentText.toLowerCase().includes('introduction');
    
    return [
      {
        topic: hasIntro ? 'Introduction' : 'Course Overview',
        bloom_level: 'REMEMBER',
        subtopics: [
          'Course objectives',
          { subtopic: 'Prerequisites', bloom_level: 'UNDERSTAND' },
          'Learning outcomes'
        ]
      },
      {
        topic: 'Core Concepts',
        bloom_level: 'UNDERSTAND',
        subtopics: [
          'Fundamental principles',
          { subtopic: 'Key terminology', bloom_level: 'REMEMBER' },
          { subtopic: 'Basic operations', bloom_level: 'APPLY' }
        ]
      },
      {
        topic: 'Advanced Topics',
        bloom_level: 'ANALYZE',
        subtopics: [
          { subtopic: 'Complex applications', bloom_level: 'APPLY' },
          { subtopic: 'Best practices', bloom_level: 'EVALUATE' },
          'Case studies'
        ]
      },
      {
        topic: 'Practical Applications',
        bloom_level: 'APPLY',
        subtopics: [
          { subtopic: 'Hands-on exercises', bloom_level: 'APPLY' },
          { subtopic: 'Project work', bloom_level: 'CREATE' },
          'Real-world scenarios'
        ]
      },
      {
        topic: 'Assessment & Review',
        bloom_level: 'EVALUATE',
        subtopics: [
          'Review sessions',
          { subtopic: 'Practice tests', bloom_level: 'ANALYZE' },
          'Final assessment'
        ]
      }
    ];
  }

  private getMockQuestions(topics: string[], count: number): Question[] {
    const questions: Question[] = [];
    const types: Array<'mcq' | 'short-answer' | 'true-false'> = ['mcq', 'short-answer', 'true-false'];
    const difficulties: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const difficulty = difficulties[i % difficulties.length];
      const topic = topics[i % topics.length] || 'General';

      questions.push({
        id: `q${i + 1}`,
        type,
        question: `Sample ${type} question about ${topic}?`,
        options: type === 'mcq' ? ['Option A', 'Option B', 'Option C', 'Option D'] : undefined,
        correctAnswer: type === 'mcq' ? 'Option A' : type === 'true-false' ? 'True' : 'Sample answer',
        difficulty,
        topic
      });
    }

    return questions;
  }

  private getMockRecommendations(performanceData: any): Recommendation[] {
    return [
      {
        topic: 'Data Structures',
        reason: 'Performance analysis shows this area needs improvement (score: 65%)',
        resources: [
          'Review linked lists and trees',
          'Complete practice problems on LeetCode',
          'Watch visualization videos on YouTube'
        ],
        priority: 'high'
      },
      {
        topic: 'Algorithm Complexity',
        reason: 'Good understanding but could benefit from more practice (score: 78%)',
        resources: [
          'Study Big O notation examples',
          'Practice time complexity analysis',
          'Read recommended textbook chapters'
        ],
        priority: 'medium'
      },
      {
        topic: 'System Design',
        reason: 'Strong performance, continue building on this foundation (score: 92%)',
        resources: [
          'Explore advanced patterns',
          'Read case studies from tech companies',
          'Attempt design challenges'
        ],
        priority: 'low'
      }
    ];
  }

  /**
   * Generate questions for assessment with detailed options
   * Supports MCQ, MSQ, and Subjective question types
   */
  async generateQuestionsForAssessment(params: {
    subtopics: Array<{
      topicTitle: string;
      subtopic: string;
      mcqCount: number;
      msqCount: number;
      subjectiveCount: number;
    }>;
    courseContext?: string;
    difficultyDistribution?: {
      easy: number;
      medium: number;
      hard: number;
    };
    quizLevel?: 'UG' | 'PG';
  }): Promise<{
    questions: Array<{
      questionType: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
      questionText: string;
      topicTitle: string;
      subtopic: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      bloom_level: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
      options?: Array<{
        label: string;
        text: string;
        isCorrect: boolean;
      }>;
      explanation?: string;
      points: number;
    }>;
  }> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK question generation');
      return this.getMockAssessmentQuestions(params);
    }

    try {
      const deployment = getDeploymentName();
      
      // Build prompt for each subtopic
      const allQuestions: any[] = [];
      
      for (const subtopic of params.subtopics) {
        const totalQuestionsForSubtopic = subtopic.mcqCount + subtopic.msqCount + subtopic.subjectiveCount;
        
        console.log(`🤖 Generating ${totalQuestionsForSubtopic} questions for: ${subtopic.topicTitle} → ${subtopic.subtopic}`);
        
        const difficultyDist = params.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };
        const quizLevel = params.quizLevel || 'UG';
        
        const levelGuidance = quizLevel === 'UG' 
          ? `ACADEMIC LEVEL: Undergraduate (UG)
- Focus on fundamental concepts, basic understanding, and foundational knowledge
- Questions should test recall, comprehension, and basic application
- Use clear, straightforward language appropriate for undergraduate students
- Emphasize understanding core concepts rather than advanced analysis`
          : `ACADEMIC LEVEL: Postgraduate (PG)
- Focus on advanced concepts, critical thinking, and deep analysis
- Questions should test higher-order thinking: analysis, evaluation, and creation
- Use more sophisticated language and complex scenarios
- Emphasize critical analysis, synthesis, and original problem-solving`;
        
        const prompt = `You are an expert assessment designer. Generate questions for a course assessment with Bloom's Taxonomy levels and difficulty distribution.

${levelGuidance}

Topic: ${subtopic.topicTitle}
Subtopic: ${subtopic.subtopic}
${params.courseContext ? `Course Context: ${params.courseContext.substring(0, 500)}` : ''}

Generate the following questions:
- ${subtopic.mcqCount} Multiple Choice Questions (MCQ) with 4 options each, only ONE correct answer
- ${subtopic.msqCount} Multiple Select Questions (MSQ) with 4-5 options each, MULTIPLE correct answers
- ${subtopic.subjectiveCount} Subjective/Open-ended questions

Difficulty Distribution: ${difficultyDist.easy}% EASY, ${difficultyDist.medium}% MEDIUM, ${difficultyDist.hard}% HARD

Bloom's Taxonomy Levels:
- REMEMBER: Recalling facts, basic concepts (e.g., "What is X?")
- UNDERSTAND: Explaining ideas or concepts (e.g., "Explain how X works")
- APPLY: Using information in new situations (e.g., "Use X to solve Y")
- ANALYZE: Drawing connections among ideas (e.g., "Compare X and Y")
- EVALUATE: Justifying a stand or decision (e.g., "Evaluate which approach is better")
- CREATE: Producing new or original work (e.g., "Design a solution for X")

Return ONLY a valid JSON array with this exact structure:
[
  {
    "questionType": "MCQ",
    "questionText": "What is the primary purpose of CI/CD?",
    "difficulty": "MEDIUM",
    "bloom_level": "REMEMBER",
    "options": [
      {"label": "A", "text": "To automate testing and deployment", "isCorrect": true},
      {"label": "B", "text": "To write better code", "isCorrect": false},
      {"label": "C", "text": "To manage databases", "isCorrect": false},
      {"label": "D", "text": "To design user interfaces", "isCorrect": false}
    ],
    "explanation": "CI/CD automates the software delivery process",
    "points": 1
  },
  {
    "questionType": "MSQ",
    "questionText": "Which are benefits of infrastructure as code? (Select all that apply)",
    "difficulty": "MEDIUM",
    "bloom_level": "ANALYZE",
    "options": [
      {"label": "A", "text": "Version control", "isCorrect": true},
      {"label": "B", "text": "Repeatability", "isCorrect": true},
      {"label": "C", "text": "Faster hardware", "isCorrect": false},
      {"label": "D", "text": "Automation", "isCorrect": true}
    ],
    "explanation": "IaC provides version control, repeatability, and automation",
    "points": 2
  },
  {
    "questionType": "SUBJECTIVE",
    "questionText": "Explain the benefits of using Terraform for infrastructure management.",
    "difficulty": "HARD",
    "bloom_level": "EVALUATE",
    "explanation": "Look for mentions of declarative syntax, state management, provider ecosystem, and automation",
    "points": 5
  }
]

Important rules:
1. For MCQ: Exactly 4 options, ONLY ONE with isCorrect: true
2. For MSQ: 4-5 options, AT LEAST TWO with isCorrect: true
3. For SUBJECTIVE: No options array needed
4. Difficulty: Follow the distribution (${difficultyDist.easy}% EASY, ${difficultyDist.medium}% MEDIUM, ${difficultyDist.hard}% HARD)
5. Bloom Level: Assign appropriate cognitive level to each question (REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, or CREATE)
6. Points: MCQ=1, MSQ=2, SUBJECTIVE=5
7. Return ONLY the JSON array, no markdown, no extra text`;

        const response = await client.getChatCompletions(
          deployment,
          [
            { role: 'system', content: 'You are an expert educational assessment designer. Always return valid JSON arrays.' },
            { role: 'user', content: prompt }
          ],
          {
            maxCompletionTokens: 2000
          } as any
        );

        const content = response.choices[0]?.message?.content || '[]';
        console.log(`✅ Received response from Azure OpenAI`);
        console.log(`📊 Tokens used: ${JSON.stringify(response.usage)}`);
        
        // Extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const parsedQuestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        
        // Add topic and subtopic info to each question
        const questionsWithContext = parsedQuestions.map((q: any) => ({
          ...q,
          bloom_level: q.bloom_level || 'UNDERSTAND', // Default if not provided
          topicTitle: subtopic.topicTitle,
          subtopic: subtopic.subtopic
        }));
        
        allQuestions.push(...questionsWithContext);
        
        console.log(`✅ Generated ${parsedQuestions.length} questions for ${subtopic.subtopic}`);
      }
      
      return { questions: allQuestions };
    } catch (error) {
      console.error('Error generating questions with Azure OpenAI:', error);
      return this.getMockAssessmentQuestions(params);
    }
  }

  /**
   * Generate mock questions for assessment (fallback when Azure is not configured)
   */
  private getMockAssessmentQuestions(params: {
    subtopics: Array<{
      topicTitle: string;
      subtopic: string;
      mcqCount: number;
      msqCount: number;
      subjectiveCount: number;
    }>;
  }): {
    questions: Array<{
      questionType: 'MCQ' | 'MSQ' | 'SUBJECTIVE';
      questionText: string;
      topicTitle: string;
      subtopic: string;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD';
      bloom_level: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
      options?: Array<{
        label: string;
        text: string;
        isCorrect: boolean;
      }>;
      explanation?: string;
      points: number;
    }>;
  } {
    const allQuestions: any[] = [];
    const difficulties: Array<'EASY' | 'MEDIUM' | 'HARD'> = ['EASY', 'MEDIUM', 'HARD'];

    for (const subtopic of params.subtopics) {
      // Generate MCQs
      for (let i = 0; i < subtopic.mcqCount; i++) {
        allQuestions.push({
          questionType: 'MCQ',
          questionText: `[Mock MCQ ${i + 1}] What is a key concept in ${subtopic.subtopic}?`,
          topicTitle: subtopic.topicTitle,
          subtopic: subtopic.subtopic,
          difficulty: difficulties[i % 3],
          bloom_level: ['REMEMBER', 'UNDERSTAND', 'APPLY'][i % 3] as any,
          options: [
            { label: 'A', text: 'Correct answer for this concept', isCorrect: true },
            { label: 'B', text: 'Incorrect option 1', isCorrect: false },
            { label: 'C', text: 'Incorrect option 2', isCorrect: false },
            { label: 'D', text: 'Incorrect option 3', isCorrect: false }
          ],
          explanation: `This tests understanding of ${subtopic.subtopic}`,
          points: 1
        });
      }

      // Generate MSQs
      for (let i = 0; i < subtopic.msqCount; i++) {
        allQuestions.push({
          questionType: 'MSQ',
          questionText: `[Mock MSQ ${i + 1}] Which of the following are true about ${subtopic.subtopic}? (Select all that apply)`,
          topicTitle: subtopic.topicTitle,
          subtopic: subtopic.subtopic,
          difficulty: difficulties[(i + 1) % 3],
          bloom_level: ['ANALYZE', 'EVALUATE', 'APPLY'][(i + 1) % 3] as any,
          options: [
            { label: 'A', text: 'First correct statement', isCorrect: true },
            { label: 'B', text: 'Second correct statement', isCorrect: true },
            { label: 'C', text: 'Incorrect statement', isCorrect: false },
            { label: 'D', text: 'Third correct statement', isCorrect: true },
            { label: 'E', text: 'Another incorrect statement', isCorrect: false }
          ],
          explanation: `Multiple concepts from ${subtopic.subtopic} are tested here`,
          points: 2
        });
      }

      // Generate Subjective questions
      for (let i = 0; i < subtopic.subjectiveCount; i++) {
        allQuestions.push({
          questionType: 'SUBJECTIVE',
          questionText: `[Mock Subjective ${i + 1}] Explain the importance of ${subtopic.subtopic} in modern software development. Provide examples.`,
          topicTitle: subtopic.topicTitle,
          subtopic: subtopic.subtopic,
          difficulty: 'HARD',
          bloom_level: ['EVALUATE', 'CREATE', 'ANALYZE'][i % 3] as any,
          explanation: `Look for clear explanations, practical examples, and understanding of core concepts in ${subtopic.subtopic}`,
          points: 5
        });
      }
    }

    return { questions: allQuestions };
  }

  /**
   * Generate an additional challenge question for correct answers
   */
  async generateChallengeQuestion(params: {
    originalQuestion: string;
    topicTitle: string;
    subtopic: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  }): Promise<{
    questionType: 'MCQ' | 'MSQ';
    questionText: string;
    topicTitle: string;
    subtopic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    options: Array<{
      label: string;
      text: string;
      isCorrect: boolean;
    }>;
    explanation: string;
    points: number;
  }> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK challenge question generation');
      return this.getMockChallengeQuestion(params);
    }

    try {
      const deployment = getDeploymentName();
      
      const prompt = `You are an expert assessment designer. Generate a CHALLENGING follow-up question that tests deeper understanding.

Original Question: ${params.originalQuestion}
Topic: ${params.topicTitle}
Subtopic: ${params.subtopic}

Create a more difficult question that:
- Tests deeper understanding of the same concept
- Requires advanced knowledge or application
- Builds upon the original question's knowledge

Return ONLY a valid JSON object with this exact structure:
{
  "questionType": "MCQ",
  "questionText": "What advanced configuration would be required to implement high availability in the scenario described above?",
  "difficulty": "HARD",
  "options": [
    {"label": "A", "text": "Configure load balancing with health checks", "isCorrect": true},
    {"label": "B", "text": "Increase memory allocation", "isCorrect": false},
    {"label": "C", "text": "Enable caching", "isCorrect": false},
    {"label": "D", "text": "Reduce timeout values", "isCorrect": false}
  ],
  "explanation": "High availability requires load balancing with health checks to distribute traffic and handle failures",
  "points": 2
}

Important rules:
1. Make it MORE DIFFICULT than the original
2. Test deeper understanding or advanced concepts
3. Exactly 4 options, ONLY ONE correct answer
4. Difficulty should be HARD or MEDIUM
5. Points: 2-3 for challenge questions
6. Return ONLY the JSON object, no markdown, no extra text`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert educational assessment designer. Always return valid JSON objects.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 1000
        } as any
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log(`✅ Generated challenge question`);
      
      const parsedQuestion = JSON.parse(content);
      
      return {
        ...parsedQuestion,
        topicTitle: params.topicTitle,
        subtopic: params.subtopic
      };
    } catch (error) {
      console.error('Error generating challenge question with Azure OpenAI:', error);
      return this.getMockChallengeQuestion(params);
    }
  }

  /**
   * Generate a practice question for incorrect answers
   */
  async generatePracticeQuestion(params: {
    originalQuestion: string;
    topicTitle: string;
    subtopic: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  }): Promise<{
    questionType: 'MCQ' | 'MSQ';
    questionText: string;
    topicTitle: string;
    subtopic: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    options: Array<{
      label: string;
      text: string;
      isCorrect: boolean;
    }>;
    explanation: string;
    points: number;
  }> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK practice question generation');
      return this.getMockPracticeQuestion(params);
    }

    try {
      const deployment = getDeploymentName();
      
      const prompt = `You are an expert assessment designer. Generate a PRACTICE question that reinforces learning.

Original Question: ${params.originalQuestion}
Topic: ${params.topicTitle}
Subtopic: ${params.subtopic}

Create a similar but EASIER question that:
- Reinforces the same core concept
- Uses simpler language or scenarios
- Helps build confidence and understanding
- Covers the same fundamental knowledge

Return ONLY a valid JSON object with this exact structure:
{
  "questionType": "MCQ",
  "questionText": "What is the basic purpose of the concept mentioned in the previous question?",
  "difficulty": "EASY",
  "options": [
    {"label": "A", "text": "To provide basic functionality", "isCorrect": true},
    {"label": "B", "text": "To complicate the system", "isCorrect": false},
    {"label": "C", "text": "To increase costs", "isCorrect": false},
    {"label": "D", "text": "To reduce performance", "isCorrect": false}
  ],
  "explanation": "The basic purpose is to provide essential functionality for the system",
  "points": 1
}

Important rules:
1. Make it EASIER than the original
2. Focus on fundamental understanding
3. Exactly 4 options, ONLY ONE correct answer
4. Difficulty should be EASY or MEDIUM
5. Points: 1-2 for practice questions
6. Return ONLY the JSON object, no markdown, no extra text`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert educational assessment designer. Always return valid JSON objects.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 1000
        } as any
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log(`✅ Generated practice question`);
      
      const parsedQuestion = JSON.parse(content);
      
      return {
        ...parsedQuestion,
        topicTitle: params.topicTitle,
        subtopic: params.subtopic
      };
    } catch (error) {
      console.error('Error generating practice question with Azure OpenAI:', error);
      return this.getMockPracticeQuestion(params);
    }
  }

  /**
   * Generate personalized feedback and recommendations
   */
  async generatePersonalizedFeedback(params: {
    questionText: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    topicTitle: string;
    subtopic: string;
  }): Promise<{
    explanation: string;
    subtopicRecommendations: string[];
    studyTips: string[];
  }> {
    const client = getOpenAIClient();

    if (isAzureMockMode() || !client) {
      console.log('📝 Using MOCK personalized feedback generation');
      return this.getMockPersonalizedFeedback(params);
    }

    try {
      const deployment = getDeploymentName();
      
      const prompt = `You are an expert educational tutor. Generate personalized feedback for a student.

Question: ${params.questionText}
Student Answer: ${params.userAnswer}
Correct Answer: ${params.correctAnswer}
Was Correct: ${params.isCorrect}
Topic: ${params.topicTitle}
Subtopic: ${params.subtopic}

Generate personalized feedback that includes:
1. A clear explanation of why the answer is correct/incorrect
2. Specific subtopics to review for improvement
3. Study tips for better understanding

Return ONLY a valid JSON object with this exact structure:
{
  "explanation": "Your answer was incorrect because... Here's the correct approach...",
  "subtopicRecommendations": ["Subtopic 1", "Subtopic 2", "Subtopic 3"],
  "studyTips": ["Study tip 1", "Study tip 2", "Study tip 3"]
}

Important rules:
1. Be encouraging and constructive
2. Provide specific, actionable advice
3. Focus on learning, not just correctness
4. Return ONLY the JSON object, no markdown, no extra text`;

      const response = await client.getChatCompletions(
        deployment,
        [
          { role: 'system', content: 'You are an expert educational tutor. Always return valid JSON objects.' },
          { role: 'user', content: prompt }
        ],
        {
          maxCompletionTokens: 800
        } as any
      );

      const content = response.choices[0]?.message?.content || '{}';
      console.log(`✅ Generated personalized feedback`);
      
      return JSON.parse(content);
    } catch (error) {
      console.error('Error generating personalized feedback with Azure OpenAI:', error);
      return this.getMockPersonalizedFeedback(params);
    }
  }

  // Mock methods for when Azure is not configured
  private getMockChallengeQuestion(params: any) {
    return {
      questionType: 'MCQ' as const,
      questionText: `[Mock Challenge] Advanced application question related to: ${params.subtopic}`,
      topicTitle: params.topicTitle,
      subtopic: params.subtopic,
      difficulty: 'HARD' as const,
      options: [
        { label: 'A', text: 'Advanced option A', isCorrect: true },
        { label: 'B', text: 'Advanced option B', isCorrect: false },
        { label: 'C', text: 'Advanced option C', isCorrect: false },
        { label: 'D', text: 'Advanced option D', isCorrect: false }
      ],
      explanation: 'This challenge question tests deeper understanding of advanced concepts.',
      points: 2
    };
  }

  private getMockPracticeQuestion(params: any) {
    return {
      questionType: 'MCQ' as const,
      questionText: `[Mock Practice] Basic reinforcement question for: ${params.subtopic}`,
      topicTitle: params.topicTitle,
      subtopic: params.subtopic,
      difficulty: 'EASY' as const,
      options: [
        { label: 'A', text: 'Basic option A', isCorrect: false },
        { label: 'B', text: 'Basic option B', isCorrect: true },
        { label: 'C', text: 'Basic option C', isCorrect: false },
        { label: 'D', text: 'Basic option D', isCorrect: false }
      ],
      explanation: 'This practice question helps reinforce basic understanding.',
      points: 1
    };
  }

  private getMockPersonalizedFeedback(params: any) {
    return {
      explanation: `[Mock Feedback] ${params.isCorrect ? 'Great job!' : 'Here\'s what to focus on:'} This question tests understanding of ${params.subtopic}.`,
      subtopicRecommendations: [
        `${params.subtopic} Fundamentals`,
        `${params.topicTitle} Basics`,
        'Related Concepts'
      ],
      studyTips: [
        'Review the course materials',
        'Practice with similar problems',
        'Ask questions if unclear'
      ]
    };
  }

  /**
   * Generate question feedback for assessment analysis
   */
  async generateQuestionFeedback(params: {
    question: string;
    questionType: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }): Promise<{
    explanation: string;
    improvementTips: string[];
    relatedConcepts: string[];
  }> {
    const client = getOpenAIClient();
    const deployment = getDeploymentName();

    if (isAzureMockMode() || !client) {
      console.log('🤖 Using MOCK question feedback generation');
      return this.getMockQuestionFeedback(params);
    }

    try {
      const prompt = `You are an AI tutor analyzing a student's answer to an assessment question. Provide detailed feedback to help the student learn.

Question: "${params.question}"
Question Type: ${params.questionType}
Student's Answer: "${params.studentAnswer}"
Correct Answer: "${params.correctAnswer}"
Was the student's answer correct? ${params.isCorrect ? 'Yes' : 'No'}
Original Explanation: "${params.explanation}"

Please provide feedback in the following JSON format:
{
  "explanation": "A clear explanation of why the answer was correct or incorrect, including the correct reasoning",
  "improvementTips": ["Tip 1 for improvement", "Tip 2 for improvement", "Tip 3 for improvement"],
  "relatedConcepts": ["Related concept 1", "Related concept 2", "Related concept 3"]
}

Guidelines:
- Be encouraging and constructive
- Explain the reasoning clearly
- Provide actionable improvement tips
- Suggest related concepts to review
- Keep explanations concise but thorough
- If incorrect, explain what the student misunderstood

6. Return ONLY the JSON object, no markdown, no extra text`;

      const response = await client.getChatCompletions(
        deployment,
        [
          {
            role: 'system',
            content: 'You are an expert AI tutor providing educational feedback. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          maxCompletionTokens: 1000
        } as any
      );

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Parse the JSON response
      const feedback = JSON.parse(content);
      
      return {
        explanation: feedback.explanation || 'No explanation provided',
        improvementTips: Array.isArray(feedback.improvementTips) ? feedback.improvementTips : [],
        relatedConcepts: Array.isArray(feedback.relatedConcepts) ? feedback.relatedConcepts : []
      };

    } catch (error) {
      console.error('Error generating question feedback:', error);
      return this.getMockQuestionFeedback(params);
    }
  }

  private getMockQuestionFeedback(params: any) {
    return {
      explanation: `[Mock Analysis] Your answer was ${params.isCorrect ? 'correct' : 'incorrect'}. ${params.isCorrect ? 
        'Great job! You demonstrated good understanding of this concept.' : 
        'Let\'s review the key concepts to help you understand this better.'}`,
      improvementTips: [
        'Review the fundamental concepts',
        'Practice similar problems',
        'Focus on understanding the underlying principles'
      ],
      relatedConcepts: [
        'Basic Concepts',
        'Fundamental Principles',
        'Core Knowledge Areas'
      ]
    };
  }
}

export default new AzureOpenAIService();

