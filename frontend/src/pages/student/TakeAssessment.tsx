import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { assessmentsAPI, Assessment, Question } from '../../api/assessments';
import { studentAssessmentsAPI } from '../../api/student-assessments';

export const TakeAssessment = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: string]: any }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  useEffect(() => {
    if (assessment?.time_limit_minutes && startTime) {
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime.getTime();
        const remaining = assessment.time_limit_minutes * 60 * 1000 - elapsed;
        if (remaining <= 0) {
          setTimeRemaining(0);
          handleSubmitAssessment();
        } else {
          setTimeRemaining(Math.floor(remaining / 1000));
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [assessment?.time_limit_minutes, startTime]);

  const loadAssessment = async () => {
    if (!assessmentId) return;
    setLoading(true);
    try {
      // Start the assessment attempt
      const startData = await studentAssessmentsAPI.startAssessment(assessmentId);
      setAttemptId(startData.attemptId);
      setStartTime(new Date());

      // Load assessment details
      const data = await assessmentsAPI.getById(assessmentId);
      setAssessment(data.assessment);
      setQuestions(data.questions);

      console.log(`✅ Assessment started with attempt ID: ${startData.attemptId}`);
    } catch (error) {
      console.error('Failed to load assessment:', error);
      alert('Failed to load assessment');
      navigate('/student/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!attemptId) {
      alert('Assessment attempt not found. Please refresh and try again.');
      return;
    }

    setSubmitting(true);
    try {
      console.log('Submitting assessment:', { assessmentId, attemptId, answers });
      
      // Prepare answers for submission
      const submissionAnswers = questions.map(question => {
        const userAnswer = answers[question.id];
        
        if (question.question_type === 'SUBJECTIVE') {
          return {
            questionId: question.id,
            answerText: userAnswer || '',
            timeTakenSeconds: 30 // TODO: Track actual time per question
          };
        } else {
          return {
            questionId: question.id,
            selectedOptionIds: Array.isArray(userAnswer) ? userAnswer : (userAnswer ? [userAnswer] : []),
            timeTakenSeconds: 30 // TODO: Track actual time per question
          };
        }
      });

      // Submit to backend
      console.log('🔄 Submitting assessment to backend...');
      const results = await studentAssessmentsAPI.submitAssessment(assessmentId, {
        attemptId,
        answers: submissionAnswers
      });

      console.log('✅ Assessment submitted successfully:', results);
      
      // Navigate back to course view - results will be shown there
      navigate(`/student/course/${assessment?.course_id}?assessmentCompleted=${assessmentId}`);
    } catch (error: any) {
      console.error('Failed to submit assessment:', error);
      
      if (error.response?.status === 401) {
        alert('Your session has expired. Please log in again and retry the assessment.');
        navigate('/login');
      } else if (error.response?.status === 403) {
        alert('Access denied. You may not have permission to submit this assessment.');
      } else {
        alert(`Failed to submit assessment: ${error.response?.data?.error || error.message || 'Unknown error'}. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).length;
  };

  const isQuestionAnswered = (questionId: string) => {
    return answers[questionId] !== undefined;
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

  if (!assessment || !questions.length) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">Assessment not found</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn-primary">
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
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
                  {getAnsweredCount()}/{questions.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Questions</h3>
              <div className="grid grid-cols-5 lg:grid-cols-1 gap-2">
                {questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      index === currentQuestionIndex
                        ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                        : isQuestionAnswered(question.id)
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSubmitAssessment}
                  disabled={submitting}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-primary-600 hover:bg-primary-700 text-white'
                  }`}
                >
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              </div>
            </div>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Question Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                    Q{currentQuestion.question_number}
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
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter your answer here..."
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={6}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {currentQuestion.options?.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                          answers[currentQuestion.id] === option.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type={currentQuestion.question_type === 'MSQ' ? 'checkbox' : 'radio'}
                          name={`question_${currentQuestion.id}`}
                          value={option.id}
                          checked={currentQuestion.question_type === 'MSQ' 
                            ? (answers[currentQuestion.id] || []).includes(option.id)
                            : answers[currentQuestion.id] === option.id
                          }
                          onChange={(e) => {
                            if (currentQuestion.question_type === 'MSQ') {
                              const currentAnswers = answers[currentQuestion.id] || [];
                              const newAnswers = e.target.checked
                                ? [...currentAnswers, option.id]
                                : currentAnswers.filter((id: string) => id !== option.id);
                              handleAnswerChange(currentQuestion.id, newAnswers);
                            } else {
                              handleAnswerChange(currentQuestion.id, option.id);
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            answers[currentQuestion.id] === option.id || 
                            (currentQuestion.question_type === 'MSQ' && (answers[currentQuestion.id] || []).includes(option.id))
                              ? 'border-primary-500 bg-primary-500'
                              : 'border-gray-300'
                          }`}>
                            {(answers[currentQuestion.id] === option.id || 
                              (currentQuestion.question_type === 'MSQ' && (answers[currentQuestion.id] || []).includes(option.id))) && (
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

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    currentQuestionIndex === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </button>

                <div className="text-sm text-gray-600">
                  {isQuestionAnswered(currentQuestion.id) ? '✓ Answered' : 'Not answered'}
                </div>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmitAssessment}
                    disabled={submitting}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                      submitting
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }`}
                  >
                    <span>{submitting ? 'Submitting...' : 'Submit'}</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                  >
                    <span>Next</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
