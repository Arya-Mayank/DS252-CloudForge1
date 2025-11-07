import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { assessmentsAPI, Assessment, Question as QuestionType } from '../../api/assessments';
import { studentAssessmentsAPI } from '../../api/student-assessments';

export const TakeAssessment = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionType | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      // Start the assessment attempt
      const startData = await studentAssessmentsAPI.startAssessment(assessmentId);
      setAttemptId(startData.attemptId);
      setStartTime(new Date());
      setTotalQuestions(startData.assessment.totalQuestions);

      // Load assessment details
      const data = await assessmentsAPI.getById(assessmentId);
      setAssessment(data.assessment);

      // Get first question adaptively
      const firstQuestionData = await studentAssessmentsAPI.getNextQuestion(assessmentId, startData.attemptId);
      if (firstQuestionData.question) {
        setCurrentQuestion(firstQuestionData.question);
        setQuestionNumber(1);
      } else {
        alert('No questions available for this assessment');
        navigate('/student/dashboard');
      }

      console.log(`✅ Assessment started with attempt ID: ${startData.attemptId}`);
    } catch (error) {
      console.error('Failed to load assessment:', error);
      alert('Failed to load assessment');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, navigate]);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId, loadAssessment]);

  const handleCompleteAssessment = useCallback(async () => {
    if (!attemptId || !assessmentId) {
      return;
    }

    navigate(`/student/course/${assessment?.course_id}?assessmentCompleted=${assessmentId}`);
  }, [assessment?.course_id, assessmentId, attemptId, navigate]);

  useEffect(() => {
    const timeLimit = assessment?.time_limit_minutes;
    if (timeLimit && startTime) {
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime.getTime();
        const remaining = timeLimit * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          setTimeRemaining(0);
          handleCompleteAssessment();
        } else {
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [assessment?.time_limit_minutes, startTime, handleCompleteAssessment]);

  const handleAnswerChange = (answer: any) => {
    setCurrentAnswer(answer);
  };

  const handleNextQuestion = async () => {
    if (!attemptId || !assessmentId || !currentQuestion) {
      return;
    }

    if (!currentAnswer) {
      alert('Please select an answer before proceeding');
      return;
    }

    setSubmitting(true);
    setShowFeedback(false);

    try {
      // Prepare answer data
      const answerData: {
        questionId: string;
        answerText?: string;
        selectedOptionIds?: string[];
        timeTakenSeconds?: number;
      } = {
        questionId: currentQuestion.id,
        timeTakenSeconds: 30 // TODO: Track actual time per question
      };

      if (currentQuestion.question_type === 'SUBJECTIVE') {
        answerData.answerText = typeof currentAnswer === 'string' ? currentAnswer : '';
      } else {
        answerData.selectedOptionIds = Array.isArray(currentAnswer) 
          ? currentAnswer 
          : (currentAnswer ? [currentAnswer] : []);
      }

      // Submit answer and get next question
      const result = await studentAssessmentsAPI.submitAnswerAndGetNext(
        assessmentId,
        attemptId,
        answerData
      );

      // Show feedback briefly (skip for subjective questions being evaluated in background)
      if (!result.isPendingEvaluation) {
        setLastAnswerCorrect(result.isCorrect);
        setShowFeedback(true);
      } else {
        // For subjective questions, show a different message
        setLastAnswerCorrect(null);
        setShowFeedback(true);
      }
      setAnsweredCount(prev => prev + 1);

      // Wait a moment to show feedback, then proceed
      setTimeout(() => {
        setShowFeedback(false);
        setLastAnswerCorrect(null);

        if (result.isComplete || !result.nextQuestion) {
          // Assessment complete
          setIsComplete(true);
          handleCompleteAssessment();
        } else {
          // Load next question
          setCurrentQuestion(result.nextQuestion);
          setQuestionNumber(prev => prev + 1);
          setCurrentAnswer(null);
        }
      }, 1500);

    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      alert(`Failed to submit answer: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <p className="text-xl text-gray-600">Loading assessment...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isComplete || !assessment || !currentQuestion) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-4">
              <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xl text-gray-600 mb-4">Assessment Complete!</p>
            <p className="text-gray-500 mb-6">Redirecting to results...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600 mt-1">
                Question {questionNumber} of {totalQuestions}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {timeRemaining !== null && (
                <div className={`px-4 py-2 rounded-lg text-lg font-bold ${
                  timeRemaining < 300 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  ⏱️ {formatTime(timeRemaining)}
                </div>
              )}
              <div className="text-right">
                <div className="text-sm text-gray-600">Answered</div>
                <div className="text-lg font-semibold text-gray-900">
                  {answeredCount}/{totalQuestions}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {showFeedback && (
          <div className={`mb-6 p-4 rounded-lg ${
            lastAnswerCorrect === true 
              ? 'bg-green-100 border border-green-300' 
              : lastAnswerCorrect === false
              ? 'bg-red-100 border border-red-300'
              : 'bg-blue-100 border border-blue-300'
          }`}>
            <div className="flex items-center space-x-2">
              {lastAnswerCorrect === true ? (
                <>
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-800 font-semibold">Correct! Well done!</span>
                </>
              ) : lastAnswerCorrect === false ? (
                <>
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-800 font-semibold">Incorrect. Keep trying!</span>
                </>
              ) : (
                <>
                  <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-blue-800 font-semibold">Answer submitted! Evaluation in progress...</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Question Area */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                Q{questionNumber}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                currentQuestion.question_type === 'MCQ' ? 'bg-blue-100 text-blue-800' :
                currentQuestion.question_type === 'MSQ' ? 'bg-purple-100 text-purple-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {currentQuestion.question_type}
              </span>
              {currentQuestion.difficulty && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  currentQuestion.difficulty === 'EASY' ? 'bg-green-100 text-green-800' :
                  currentQuestion.difficulty === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {currentQuestion.difficulty}
                </span>
              )}
              <span className="text-sm text-gray-600">
                {currentQuestion.points} point{currentQuestion.points !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {currentQuestion.question_text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {currentQuestion.question_type === 'SUBJECTIVE' ? (
              <div>
                <textarea
                  value={currentAnswer || ''}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  placeholder="Enter your answer here..."
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={6}
                  disabled={submitting || showFeedback}
                />
              </div>
            ) : (
              <div className="space-y-3">
                {(currentQuestion.options || []).map((option) => (
                  <label
                    key={option.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      (currentQuestion.question_type === 'MSQ' 
                        ? (currentAnswer || []).includes(option.id)
                        : currentAnswer === option.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${(submitting || showFeedback) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type={currentQuestion.question_type === 'MSQ' ? 'checkbox' : 'radio'}
                      name={`question_${currentQuestion.id}`}
                      value={option.id}
                      checked={currentQuestion.question_type === 'MSQ' 
                        ? (currentAnswer || []).includes(option.id)
                        : currentAnswer === option.id
                      }
                      onChange={(e) => {
                        if (currentQuestion.question_type === 'MSQ') {
                          const currentAnswers = currentAnswer || [];
                          const newAnswers = e.target.checked
                            ? [...currentAnswers, option.id]
                            : currentAnswers.filter((id: string) => id !== option.id);
                          handleAnswerChange(newAnswers);
                        } else {
                          handleAnswerChange(option.id);
                        }
                      }}
                      disabled={submitting || showFeedback}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        (currentQuestion.question_type === 'MSQ' 
                          ? (currentAnswer || []).includes(option.id)
                          : currentAnswer === option.id)
                          ? 'border-primary-500 bg-primary-500'
                          : 'border-gray-300'
                      }`}>
                        {(currentQuestion.question_type === 'MSQ' 
                          ? (currentAnswer || []).includes(option.id)
                          : currentAnswer === option.id) && (
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-gray-900 font-medium">{option.option_label}.</span>
                      <span className="text-gray-700">{option.option_text}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Button */}
          <div className="flex items-center justify-end mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleNextQuestion}
              disabled={submitting || showFeedback || !currentAnswer}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                submitting || showFeedback || !currentAnswer
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : questionNumber === totalQuestions ? (
                <>
                  <span>Submit Assessment</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </>
              ) : (
                <>
                  <span>Next Question</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};
