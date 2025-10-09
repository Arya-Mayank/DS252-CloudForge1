import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { assessmentsAPI, Assessment, Question } from '../../api/assessments';
import { studentAssessmentsAPI, StudentAnswer } from '../../api/student-assessments';
import { aiFeedbackAPI } from '../../api/ai-feedback';

interface AnalysisResult {
  question: Question;
  studentAnswer: StudentAnswer;
  aiFeedback?: {
    explanation: string;
    improvementTips: string[];
    relatedConcepts: string[];
  };
  loading?: boolean;
}

export const AssessmentAnalysis = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (assessmentId) {
      loadAssessmentData();
    }
  }, [assessmentId]);

  const loadAssessmentData = async () => {
    try {
      // Get assessment details
      const assessmentData = await assessmentsAPI.getById(assessmentId!);
      setAssessment(assessmentData.assessment);
      setQuestions(assessmentData.questions);

      // Get student's latest completed attempt
      const attemptsData = await studentAssessmentsAPI.getStudentAttempts(assessmentId!);
      const completedAttempts = attemptsData.attempts.filter(attempt => attempt.is_completed);
      
      if (completedAttempts.length === 0) {
        alert('No completed attempts found for this assessment');
        navigate('/student/dashboard');
        return;
      }

      const latestAttempt = completedAttempts[0]; // Most recent attempt
      setAttempt(latestAttempt);

      // Get detailed results for this attempt
      const results = await studentAssessmentsAPI.getAssessmentResults(assessmentId!, latestAttempt.id);
      setAnswers(results.answers);

      // Use questions from the results (which includes options) instead of from assessmentData
      const questionsWithOptions = results.questions || assessmentData.questions;
      setQuestions(questionsWithOptions);

      // Initialize analysis results using the questions from the results
      const initialAnalysis: AnalysisResult[] = questionsWithOptions.map(question => {
        const studentAnswer = results.answers.find(a => a.question_id === question.id);
        return {
          question,
          studentAnswer: studentAnswer || {} as StudentAnswer,
          loading: false
        };
      });
      setAnalysisResults(initialAnalysis);

      console.log('📊 Assessment Analysis Data Loaded:', {
        assessment: assessmentData.assessment,
        questionsFromResults: results.questions?.length || 0,
        questionsFromAssessment: assessmentData.questions.length,
        answers: results.answers.length,
        analysisResults: initialAnalysis.length,
        questionsWithOptions: questionsWithOptions.length
      });

      // Debug: Log sample question and answer data
      if (questionsWithOptions.length > 0 && results.answers.length > 0) {
        const sampleQuestion = questionsWithOptions[0];
        const sampleAnswer = results.answers.find(a => a.question_id === sampleQuestion.id);
        console.log('🔍 Sample Question Data:', {
          question: sampleQuestion,
          answer: sampleAnswer,
          options: sampleQuestion.options
        });
      }

    } catch (error) {
      console.error('Failed to load assessment data:', error);
      alert('Failed to load assessment data');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateQuestionAnalysis = async (questionIndex: number) => {
    const analysisResult = analysisResults[questionIndex];
    if (!analysisResult || analysisResult.aiFeedback) return;

    // Update loading state
    setAnalysisResults(prev => prev.map((result, index) => 
      index === questionIndex ? { ...result, loading: true } : result
    ));

    try {
      // Get the correct answer for this question
      const correctAnswer = getCorrectAnswer(analysisResult.question);
      const studentAnswerText = getStudentAnswerText(analysisResult.studentAnswer, analysisResult.question);

      const feedback = await aiFeedbackAPI.generateQuestionFeedback({
        question: analysisResult.question.question_text,
        questionType: analysisResult.question.question_type,
        studentAnswer: studentAnswerText,
        correctAnswer: correctAnswer,
        isCorrect: analysisResult.studentAnswer.is_correct || false,
        explanation: analysisResult.question.explanation || ''
      });

      // Update with AI feedback
      setAnalysisResults(prev => prev.map((result, index) => 
        index === questionIndex ? { 
          ...result, 
          aiFeedback: feedback, 
          loading: false 
        } : result
      ));

    } catch (error) {
      console.error('Failed to generate question analysis:', error);
      setAnalysisResults(prev => prev.map((result, index) => 
        index === questionIndex ? { ...result, loading: false } : result
      ));
    }
  };

  // Helper function to get correct answer text
  const getCorrectAnswer = (question: Question): string => {
    if (question.question_type === 'SUBJECTIVE') {
      return question.explanation || 'No explanation provided';
    } else {
      // For MCQ/MSQ, get the correct option(s)
      const correctOptions = question.options?.filter(opt => opt.is_correct) || [];
      if (correctOptions.length === 0) {
        console.warn('No correct options found for question:', question.id);
        return 'No correct answer available';
      }
      
      // For single correct answer (MCQ), show option label and text
      if (correctOptions.length === 1) {
        return `${correctOptions[0].option_label}: ${correctOptions[0].option_text}`;
      }
      
      // For multiple correct answers (MSQ), show all options with labels
      return correctOptions.map(opt => `${opt.option_label}: ${opt.option_text}`).join(', ');
    }
  };

  // Helper function to format student answer text
  const getStudentAnswerText = (studentAnswer: StudentAnswer, question: Question): string => {
    if (question.question_type === 'SUBJECTIVE') {
      return studentAnswer.text_answer || 'No answer provided';
    } else {
      // For MCQ/MSQ, show selected options
      if (studentAnswer.selected_option_ids && studentAnswer.selected_option_ids.length > 0) {
        const selectedOptions = question.options?.filter(opt => 
          studentAnswer.selected_option_ids?.includes(opt.id)
        ) || [];
        
        if (selectedOptions.length === 0) {
          console.warn('No selected options found for student answer:', studentAnswer);
          return 'Selected options not found';
        }
        
        // For single selection (MCQ), show option label and text
        if (selectedOptions.length === 1) {
          return `${selectedOptions[0].option_label}: ${selectedOptions[0].option_text}`;
        }
        
        // For multiple selections (MSQ), show all selected options with labels
        return selectedOptions.map(opt => `${opt.option_label}: ${opt.option_text}`).join(', ');
      }
      return 'No answer selected';
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Assessment Analysis</h2>
            <p className="text-gray-600">Preparing your detailed performance analysis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const correctCount = answers.filter(a => a.is_correct).length;
  const totalCount = answers.length;
  const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
  const totalPoints = answers.reduce((sum, a) => sum + (a.points_earned || 0), 0);
  const maxPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Course</span>
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Assessment Analysis: {assessment?.title}
          </h1>
          <p className="text-gray-600">
            AI-powered insights into your performance and learning recommendations
          </p>
        </div>

        {/* Performance Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8 border border-blue-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{correctCount}/{totalCount}</div>
              <div className="text-sm text-gray-600">Questions Correct</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{percentage}%</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalPoints}/{maxPoints}</div>
              <div className="text-sm text-gray-600">Points Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{attempt?.time_taken_minutes || 0}m</div>
              <div className="text-sm text-gray-600">Time Taken</div>
            </div>
          </div>
        </div>

        {/* Analysis Overview */}
        <div className="bg-white rounded-xl p-6 mb-8 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Question Analysis</h2>
              <p className="text-gray-600">
                Click "Analyze" next to any question for AI-powered feedback and learning recommendations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{totalCount - correctCount}</div>
                <div className="text-sm text-gray-600">Incorrect</div>
              </div>
            </div>
          </div>
        </div>

        {/* Question Analysis */}
        <div className="space-y-6">
          {analysisResults.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Questions...</h3>
                <p className="text-gray-600">Please wait while we load your assessment data.</p>
              </div>
            </div>
          ) : (
            analysisResults.map((result, index) => (
            <div key={result.question.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Question Header */}
              <div className={`px-6 py-4 border-b ${result.studentAnswer.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                      result.studentAnswer.is_correct ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Question {index + 1}
                      </h3>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          result.studentAnswer.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {result.studentAnswer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {result.question.points} points • {result.studentAnswer.points_earned || 0} earned
                        </span>
                      </div>
                    </div>
                  </div>
                  {!result.aiFeedback ? (
                    <button
                      onClick={() => generateQuestionAnalysis(index)}
                      disabled={result.loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {result.loading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Get AI Analysis</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">Analysis Complete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Question Content */}
              <div className="px-6 py-4 space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Question:</h4>
                  <p className="text-gray-700">{result.question.question_text}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Your Answer:</h4>
                    <div className={`rounded-lg p-3 border-2 ${
                      result.studentAnswer.is_correct 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <p className={`font-medium ${
                        result.studentAnswer.is_correct ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {getStudentAnswerText(result.studentAnswer, result.question)}
                      </p>
                      <p className={`text-sm mt-1 ${
                        result.studentAnswer.is_correct ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.studentAnswer.is_correct ? '✓ Correct' : '✗ Incorrect'}
                      </p>
                      {/* Debug: Show selected option IDs */}
                      {result.studentAnswer.selected_option_ids && result.studentAnswer.selected_option_ids.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          <strong>Selected IDs:</strong> {result.studentAnswer.selected_option_ids.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Correct Answer:</h4>
                    <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                      <p className="text-blue-800 font-medium">
                        {getCorrectAnswer(result.question)}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        {result.question.question_type === 'SUBJECTIVE' ? 'Expected Response' : 'Correct Choice'}
                      </p>
                      {/* Debug: Show all options for this question */}
                      {result.question.options && result.question.options.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          <strong>All options:</strong> {result.question.options.map(opt => 
                            `${opt.option_label}: ${opt.option_text}${opt.is_correct ? ' ✓' : ''}`
                          ).join(' | ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Analysis */}
                {result.aiFeedback && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>AI Analysis</span>
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <h5 className="font-medium text-blue-800 mb-2">Explanation:</h5>
                        <p className="text-blue-700">{result.aiFeedback.explanation}</p>
                      </div>
                      
                      {result.aiFeedback.improvementTips && result.aiFeedback.improvementTips.length > 0 && (
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Improvement Tips:</h5>
                          <ul className="list-disc list-inside space-y-1">
                            {result.aiFeedback.improvementTips.map((tip, tipIndex) => (
                              <li key={tipIndex} className="text-blue-700">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {result.aiFeedback.relatedConcepts && result.aiFeedback.relatedConcepts.length > 0 && (
                        <div>
                          <h5 className="font-medium text-blue-800 mb-2">Related Concepts to Review:</h5>
                          <div className="flex flex-wrap gap-2">
                            {result.aiFeedback.relatedConcepts.map((concept, conceptIndex) => (
                              <span key={conceptIndex} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {concept}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
          )}
        </div>
      </div>
    </Layout>
  );
};
