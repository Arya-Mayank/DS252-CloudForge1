import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { assessmentsAPI, Assessment, Question } from '../../api/assessments';
import { studentAssessmentsAPI } from '../../api/student-assessments';
import { aiFeedbackAPI } from '../../api/ai-feedback';

interface AssessmentResult {
  question: Question;
  isCorrect: boolean;
  userAnswer: any;
  correctAnswer?: any;
  explanation?: string;
  subtopicRecommendations?: string[];
  additionalQuestion?: {
    questionText: string;
    options?: Array<{ label: string; text: string; isCorrect: boolean }>;
    explanation?: string;
  };
}

export const AssessmentResults = () => {
  const { assessmentId, attemptId } = useParams<{ assessmentId: string; attemptId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('AssessmentResults component loaded with:', { assessmentId, attemptId, location: location.pathname });
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState<{ [questionId: string]: boolean }>({});
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [backendResults, setBackendResults] = useState<any>(null);

  useEffect(() => {
    console.log('AssessmentResults useEffect triggered:', {
      hasLocationState: !!location.state,
      hasLocationStateResults: !!(location.state && location.state.results),
      assessmentId,
      attemptId,
      locationState: location.state
    });

    if (location.state && location.state.results) {
      // New backend results
      console.log('Loading from location.state.results');
      const { results: backendData } = location.state;
      setBackendResults(backendData);
      setAssessment(backendData.assessment);
      setQuestions(backendData.questions);
      setStartTime(new Date(backendData.attempt.started_at));
      calculateResultsFromBackend(backendData);
    } else if (location.state) {
      // Legacy frontend-only results
      console.log('Loading from legacy location.state');
      const { answers: stateAnswers, questions: stateQuestions, assessment: stateAssessment, startTime: stateStartTime } = location.state;
      setAnswers(stateAnswers);
      setQuestions(stateQuestions);
      setAssessment(stateAssessment);
      setStartTime(stateStartTime);
      calculateResults();
    } else if (assessmentId && attemptId) {
      // Load from backend using attempt ID
      console.log('Loading from backend using attempt ID');
      loadResultsFromBackend();
    } else {
      // If no state and no attempt ID, redirect back to assessment
      console.log('No data available, redirecting to assessment');
      navigate(`/student/assessment/${assessmentId}`);
    }
  }, [location.state, assessmentId, attemptId, navigate]);

  const calculateResults = async () => {
    setLoading(true);
    try {
      const calculatedResults: AssessmentResult[] = [];
      
      for (const question of questions) {
        const userAnswer = answers[question.id];
        let isCorrect = false;
        let correctAnswer = null;

        if (question.question_type === 'SUBJECTIVE') {
          // For subjective questions, we'll mark as correct for now
          // In a real system, this would require manual grading or AI evaluation
          isCorrect = userAnswer && userAnswer.trim().length > 0;
        } else {
          // For MCQ/MSQ, check against correct options
          const correctOptions = question.options?.filter(opt => opt.is_correct).map(opt => opt.id) || [];
          
          if (question.question_type === 'MCQ') {
            isCorrect = correctOptions.includes(userAnswer);
            correctAnswer = correctOptions[0];
          } else if (question.question_type === 'MSQ') {
            const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
            isCorrect = userAnswers.length === correctOptions.length && 
                       userAnswers.every(ans => correctOptions.includes(ans));
            correctAnswer = correctOptions;
          }
        }

        calculatedResults.push({
          question,
          isCorrect,
          userAnswer,
          correctAnswer,
          explanation: question.explanation || undefined
        });
      }

      setResults(calculatedResults);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating results:', error);
      setLoading(false);
    }
  };

  const loadResultsFromBackend = async () => {
    if (!assessmentId || !attemptId) {
      console.error('Missing assessmentId or attemptId:', { assessmentId, attemptId });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Loading results from backend for:', { assessmentId, attemptId });
      const results = await studentAssessmentsAPI.getAssessmentResults(assessmentId, attemptId);
      console.log('Backend results loaded:', results);
      
      setBackendResults(results);
      setAssessment(results.assessment);
      setQuestions(results.questions);
      setStartTime(new Date(results.attempt.started_at));
      calculateResultsFromBackend(results);
    } catch (error) {
      console.error('Failed to load results from backend:', error);
      alert(`Failed to load assessment results: ${error instanceof Error ? error.message : 'Unknown error'}`);
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const calculateResultsFromBackend = (backendData: any) => {
    try {
      console.log('Calculating results from backend data:', backendData);
      const calculatedResults: AssessmentResult[] = [];
      
      for (const question of backendData.questions) {
        const studentAnswer = backendData.answers.find((a: any) => a.question_id === question.id);
        
        calculatedResults.push({
          question,
          isCorrect: studentAnswer?.is_correct || false,
          userAnswer: studentAnswer?.text_answer || studentAnswer?.selected_option_ids || null,
          correctAnswer: null, // Will be calculated from question options
          explanation: question.explanation || undefined
        });
      }

      console.log('Calculated results:', calculatedResults);
      setResults(calculatedResults);
      setLoading(false);
    } catch (error) {
      console.error('Error calculating results from backend:', error);
      setLoading(false);
    }
  };

  const generateAdditionalQuestion = async (questionId: string, isCorrect: boolean) => {
    setGeneratingQuestions(prev => ({ ...prev, [questionId]: true }));
    
    try {
      const result = results.find(r => r.question.id === questionId);
      if (!result) return;

      // Extract topic and subtopic from question (this would ideally come from the database)
      const topicTitle = 'Infrastructure as Code'; // TODO: Get from question data
      const subtopic = result.question.question_text.includes('Terraform') ? 'Terraform Configuration' : 'General Concepts';

      let additionalQuestion;
      
      if (isCorrect) {
        // Generate challenge question
        const challengeQuestion = await aiFeedbackAPI.generateChallengeQuestion({
          originalQuestion: result.question.question_text,
          topicTitle,
          subtopic,
          difficulty: result.question.difficulty
        });
        
        additionalQuestion = {
          questionText: challengeQuestion.questionText,
          options: challengeQuestion.options,
          explanation: challengeQuestion.explanation
        };
      } else {
        // Generate practice question
        const practiceQuestion = await aiFeedbackAPI.generatePracticeQuestion({
          originalQuestion: result.question.question_text,
          topicTitle,
          subtopic,
          difficulty: result.question.difficulty
        });
        
        additionalQuestion = {
          questionText: practiceQuestion.questionText,
          options: practiceQuestion.options,
          explanation: practiceQuestion.explanation
        };
      }

      // Update the result with the additional question
      setResults(prev => prev.map(r => 
        r.question.id === questionId 
          ? { ...r, additionalQuestion }
          : r
      ));
    } catch (error) {
      console.error('Error generating additional question:', error);
      alert('Failed to generate additional question. Please try again.');
    } finally {
      setGeneratingQuestions(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const getScore = () => {
    // Use backend results if available, otherwise calculate from frontend
    if (backendResults) {
      return {
        correctCount: backendResults.results.correctCount,
        totalCount: backendResults.results.totalCount,
        percentage: backendResults.results.percentage,
        totalPoints: backendResults.results.totalPoints,
        maxPoints: backendResults.results.maxPoints
      };
    }
    
    const correctCount = results.filter(r => r.isCorrect).length;
    const totalCount = results.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const totalPoints = results.reduce((sum, r) => sum + (r.isCorrect ? r.question.points : 0), 0);
    const maxPoints = results.reduce((sum, r) => sum + r.question.points, 0);
    
    return { correctCount, totalCount, percentage, totalPoints, maxPoints };
  };

  const getSubtopicRecommendations = () => {
    const incorrectQuestions = results.filter(r => !r.isCorrect);
    const subtopics = new Set<string>();
    
    incorrectQuestions.forEach(result => {
      // TODO: Get actual subtopic from question data
      if (result.question.question_text.includes('Terraform')) {
        subtopics.add('Terraform Configuration');
      }
      if (result.question.question_text.includes('backend')) {
        subtopics.add('Terraform Backends');
      }
      if (result.question.question_text.includes('state')) {
        subtopics.add('State Management');
      }
    });
    
    return Array.from(subtopics);
  };

  const formatDuration = (startTime: Date, endTime?: Date) => {
    if (backendResults && backendResults.results.timeTakenMinutes) {
      const minutes = backendResults.results.timeTakenMinutes;
      const seconds = 0; // Backend only stores minutes
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    const duration = (endTime || new Date()).getTime() - startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
            <p className="text-xl text-gray-600">Calculating your results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!assessment || !results.length) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">No results available</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const score = getScore();
  const subtopicRecommendations = getSubtopicRecommendations();
  const endTime = new Date();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Assessment Results</h1>
              <p className="text-gray-600 mt-1">{assessment.title}</p>
            </div>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Score</p>
                <p className="text-3xl font-bold">{score.percentage}%</p>
              </div>
              <svg className="w-8 h-8 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Correct</p>
                <p className="text-3xl font-bold">{score.correctCount}/{score.totalCount}</p>
              </div>
              <svg className="w-8 h-8 text-green-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Points</p>
                <p className="text-3xl font-bold">{score.totalPoints}/{score.maxPoints}</p>
              </div>
              <svg className="w-8 h-8 text-purple-200" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Time</p>
                <p className="text-3xl font-bold">
                  {startTime ? formatDuration(startTime) : '--:--'}
                </p>
              </div>
              <svg className="w-8 h-8 text-orange-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Subtopic Recommendations */}
        {subtopicRecommendations.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Recommended Topics for Review</h3>
                <p className="text-yellow-700 mb-3">
                  Based on your performance, we recommend reviewing these topics:
                </p>
                <div className="flex flex-wrap gap-2">
                  {subtopicRecommendations.map((subtopic, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      {subtopic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question-by-Question Results */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Question Review</h2>
          
          {results.map((result, index) => (
            <div key={result.question.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Question Header */}
              <div className={`px-6 py-4 border-b ${
                result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      Q{result.question.question_number}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      result.question.question_type === 'MCQ' ? 'bg-blue-100 text-blue-800' :
                      result.question.question_type === 'MSQ' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {result.question.question_type}
                    </span>
                    <span className="text-sm text-gray-600">
                      {result.question.points} point{result.question.points !== 1 ? 's' : ''}
                    </span>
                    {result.isCorrect ? (
                      <span className="text-green-600 font-medium">✓ Correct</span>
                    ) : (
                      <span className="text-red-600 font-medium">✗ Incorrect</span>
                    )}
                  </div>
                  <button
                    onClick={() => generateAdditionalQuestion(result.question.id, result.isCorrect)}
                    disabled={generatingQuestions[result.question.id]}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      generatingQuestions[result.question.id]
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : result.isCorrect
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {generatingQuestions[result.question.id] ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : result.isCorrect ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Challenge Me</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Practice More</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Question Content */}
              <div className="px-6 py-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {result.question.question_text}
                </h3>

                {/* User's Answer */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Your Answer:</h4>
                  <div className={`p-3 rounded-lg ${
                    result.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    {result.question.question_type === 'SUBJECTIVE' ? (
                      <p className="text-gray-900">{result.userAnswer || 'No answer provided'}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {result.question.options?.map((option) => {
                          const isSelected = result.question.question_type === 'MSQ' 
                            ? (result.userAnswer || []).includes(option.id)
                            : result.userAnswer === option.id;
                          
                          if (!isSelected) return null;
                          
                          return (
                            <span key={option.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                              {option.option_label}. {option.option_text}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Correct Answer (if incorrect) */}
                {!result.isCorrect && result.question.question_type !== 'SUBJECTIVE' && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</h4>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <div className="flex flex-wrap gap-2">
                        {result.question.options?.filter(opt => opt.is_correct).map((option) => (
                          <span key={option.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            {option.option_label}. {option.option_text}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                {result.explanation && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Explanation:</h4>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">{result.explanation}</p>
                    </div>
                  </div>
                )}

                {/* Additional Generated Question */}
                {result.additionalQuestion && (
                  <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-800 mb-3">
                      {result.isCorrect ? 'Challenge Question:' : 'Practice Question:'}
                    </h4>
                    <p className="text-purple-900 mb-3">{result.additionalQuestion.questionText}</p>
                    
                    {result.additionalQuestion.options && (
                      <div className="space-y-2">
                        {result.additionalQuestion.options.map((option) => (
                          <div key={option.label} className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              option.isCorrect ? 'border-green-500 bg-green-500' : 'border-gray-300'
                            }`}>
                              {option.isCorrect && (
                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="text-purple-900">
                              {option.label}. {option.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {result.additionalQuestion.explanation && (
                      <div className="mt-3 p-3 bg-white rounded-lg">
                        <p className="text-sm text-purple-800">{result.additionalQuestion.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};
