import React, { useState, useEffect } from 'react';
import { assessmentsAPI, Assessment, Question } from '../api/assessments';

interface QuestionViewerModalProps {
  assessment: Assessment;
  isOpen: boolean;
  onClose: () => void;
}

export const QuestionViewerModal: React.FC<QuestionViewerModalProps> = ({
  assessment,
  isOpen,
  onClose
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [savingToBank, setSavingToBank] = useState(false);

  useEffect(() => {
    if (isOpen && assessment.id) {
      loadQuestions();
    }
  }, [isOpen, assessment.id]);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await assessmentsAPI.getById(assessment.id);
      setQuestions(data.questions);
    } catch (err) {
      setError('Failed to load questions');
      console.error('Error loading questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HARD': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'MCQ': return 'bg-blue-100 text-blue-800';
      case 'MSQ': return 'bg-purple-100 text-purple-800';
      case 'SUBJECTIVE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBloomLevelColor = (level?: string) => {
    switch (level) {
      case 'REMEMBER': return 'bg-gray-100 text-gray-700';
      case 'UNDERSTAND': return 'bg-blue-100 text-blue-700';
      case 'APPLY': return 'bg-green-100 text-green-700';
      case 'ANALYZE': return 'bg-yellow-100 text-yellow-700';
      case 'EVALUATE': return 'bg-orange-100 text-orange-700';
      case 'CREATE': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleQuestionSelect = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSaveToBank = async () => {
    if (selectedQuestions.size === 0) return;

    setSavingToBank(true);
    try {
      const questionIds = Array.from(selectedQuestions);
      await assessmentsAPI.saveToQuestionBank(assessment.id, questionIds);
      
      alert(`Successfully saved ${questionIds.length} question(s) to question bank!`);
      setSelectedQuestions(new Set());
    } catch (error: any) {
      console.error('Error saving questions to bank:', error);
      alert(error.response?.data?.error || 'Failed to save questions to bank');
    } finally {
      setSavingToBank(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{assessment.title}</h2>
              <p className="text-primary-100 mt-1">
                {assessment.total_questions} questions • {assessment.mcq_count} MCQ • {assessment.msq_count} MSQ • {assessment.subjective_count} Subjective
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {selectedQuestions.size > 0 && (
                <span className="text-sm text-primary-100">
                  {selectedQuestions.size} selected
                </span>
              )}
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showAnswers
                    ? 'bg-white text-primary-600 hover:bg-primary-50'
                    : 'bg-primary-500 text-white hover:bg-primary-400'
                }`}
              >
                {showAnswers ? 'Hide Answers' : 'Show Answers'}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-primary-500 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading questions...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadQuestions}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : questions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No questions found for this assessment.</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className={`bg-white border rounded-lg p-6 shadow-sm ${
                  selectedQuestions.has(question.id) ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
                }`}>
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.has(question.id)}
                        onChange={() => handleQuestionSelect(question.id)}
                        className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                      />
                      <div className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
                        Q{question.question_number}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQuestionTypeColor(question.question_type)}`}>
                        {question.question_type}
                      </span>
                      {question.difficulty && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      )}
                      {question.bloom_level && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBloomLevelColor(question.bloom_level)}`}>
                          {question.bloom_level}
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {question.points} point{question.points !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="mb-4">
                    <p className="text-gray-900 text-lg leading-relaxed">
                      {question.question_text}
                    </p>
                  </div>

                  {/* Options (for MCQ/MSQ) */}
                  {question.options && question.options.length > 0 && (
                    <div className="mb-4">
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <div
                            key={option.id}
                            className={`flex items-center p-3 rounded-lg border transition-colors ${
                              showAnswers && option.is_correct
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3 ${
                              showAnswers && option.is_correct
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {option.option_label}
                            </div>
                            <span className={`flex-1 ${
                              showAnswers && option.is_correct
                                ? 'text-green-800 font-medium'
                                : 'text-gray-700'
                            }`}>
                              {option.option_text}
                            </span>
                            {showAnswers && option.is_correct && (
                              <svg className="w-5 h-5 text-green-500 ml-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Explanation */}
                  {showAnswers && question.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 mb-1">Explanation</h4>
                          <p className="text-blue-700 text-sm">{question.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subjective Question Note */}
                  {question.question_type === 'SUBJECTIVE' && (
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-orange-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-orange-700 text-sm font-medium">
                          Subjective question - requires written response
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {questions.length > 0 && (
                <>
                  Showing {questions.length} question{questions.length !== 1 ? 's' : ''} • 
                  Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}
                </>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {selectedQuestions.size > 0 && (
                <button
                  onClick={handleSaveToBank}
                  disabled={savingToBank}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingToBank ? 'Saving...' : `Save ${selectedQuestions.size} to Bank`}
                </button>
              )}
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {showAnswers ? 'Hide Answers' : 'Show Answers'}
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
