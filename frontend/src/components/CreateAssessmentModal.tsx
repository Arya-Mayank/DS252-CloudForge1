import { useState } from 'react';
import { Course } from '../types';

interface SubtopicSelection {
  topicTitle: string;
  subtopic: string;
  mcqCount: number;
  msqCount: number;
  subjectiveCount: number;
}

interface CreateAssessmentModalProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    subtopics: SubtopicSelection[];
  }) => void;
}

export const CreateAssessmentModal = ({ course, isOpen, onClose, onSubmit }: CreateAssessmentModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [selectedSubtopics, setSelectedSubtopics] = useState<Map<string, boolean>>(new Map());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [questionCounts, setQuestionCounts] = useState<Map<string, SubtopicSelection>>(new Map());

  if (!isOpen) return null;

  const syllabus = course.syllabus || [];

  const handleTopicToggle = (topicTitle: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicTitle)) {
      newExpanded.delete(topicTitle);
    } else {
      newExpanded.add(topicTitle);
    }
    setExpandedTopics(newExpanded);
  };

  const handleSubtopicToggle = (topicTitle: string, subtopic: string) => {
    const key = `${topicTitle}|||${subtopic}`;
    const newSelected = new Map(selectedSubtopics);
    newSelected.set(key, !selectedSubtopics.get(key));
    setSelectedSubtopics(newSelected);
  };

  const handleNextStep = () => {
    if (!assessmentTitle.trim()) {
      alert('Please enter an assessment title');
      return;
    }

    const selected = Array.from(selectedSubtopics.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => {
        const [topicTitle, subtopic] = key.split('|||');
        return { topicTitle, subtopic };
      });

    if (selected.length === 0) {
      alert('Please select at least one subtopic');
      return;
    }

    // Initialize question counts for each selected subtopic
    const initialCounts = new Map<string, SubtopicSelection>();
    selected.forEach(({ topicTitle, subtopic }) => {
      const key = `${topicTitle}|||${subtopic}`;
      initialCounts.set(key, {
        topicTitle,
        subtopic,
        mcqCount: 5,
        msqCount: 0,
        subjectiveCount: 0,
      });
    });
    setQuestionCounts(initialCounts);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleQuestionCountChange = (key: string, field: 'mcqCount' | 'msqCount' | 'subjectiveCount', value: number) => {
    const newCounts = new Map(questionCounts);
    const current = newCounts.get(key);
    if (current) {
      newCounts.set(key, { ...current, [field]: Math.max(0, value) });
    }
    setQuestionCounts(newCounts);
  };

  const handleSubmit = () => {
    const subtopicsData = Array.from(questionCounts.values());
    const hasQuestions = subtopicsData.some(
      s => s.mcqCount > 0 || s.msqCount > 0 || s.subjectiveCount > 0
    );

    if (!hasQuestions) {
      alert('Please specify at least one question for at least one subtopic');
      return;
    }

    onSubmit({
      title: assessmentTitle,
      subtopics: subtopicsData,
    });

    // Reset
    setStep(1);
    setAssessmentTitle('');
    setSelectedSubtopics(new Map());
    setQuestionCounts(new Map());
    setExpandedTopics(new Set());
  };

  const selectedCount = Array.from(selectedSubtopics.values()).filter(v => v).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {step === 1 ? 'Create Assessment - Select Topics' : 'Create Assessment - Configure Questions'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 1 
                  ? 'Choose topics and subtopics for your assessment'
                  : 'Specify question types and counts for each subtopic'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  1
                </div>
                <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
                }`}>
                  2
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600">
                <span>Select Topics</span>
                <span>Configure Questions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Assessment Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={assessmentTitle}
                  onChange={(e) => setAssessmentTitle(e.target.value)}
                  placeholder="e.g., Week 6 Quiz, Midterm Exam, Final Assessment"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Topic Selection */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Topics & Subtopics <span className="text-red-500">*</span>
                  </label>
                  <span className="text-sm text-gray-600">
                    {selectedCount} subtopic{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                </div>

                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {syllabus.map((topic: any, topicIndex: number) => {
                    const isExpanded = expandedTopics.has(topic.topic);
                    const subtopicKeys = topic.subtopics.map((st: string) => `${topic.topic}|||${st}`);
                    const selectedInTopic = subtopicKeys.filter((key: string) => selectedSubtopics.get(key)).length;

                    return (
                      <div key={topicIndex} className="bg-white">
                        {/* Topic Header */}
                        <div
                          className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleTopicToggle(topic.topic)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <svg
                              className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-90' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{topic.topic}</h3>
                              {selectedInTopic > 0 && (
                                <p className="text-sm text-primary-600 mt-1">
                                  {selectedInTopic} of {topic.subtopics.length} subtopics selected
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {topic.subtopics.length} subtopic{topic.subtopics.length !== 1 ? 's' : ''}
                          </div>
                        </div>

                        {/* Subtopics */}
                        {isExpanded && (
                          <div className="px-4 pb-4 bg-gray-50">
                            <div className="space-y-2 ml-8">
                              {topic.subtopics.map((subtopic: string, subIndex: number) => {
                                const key = `${topic.topic}|||${subtopic}`;
                                const isSelected = selectedSubtopics.get(key) || false;

                                return (
                                  <label
                                    key={subIndex}
                                    className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleSubtopicToggle(topic.topic, subtopic)}
                                      className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                    />
                                    <span className="flex-1 text-gray-700">{subtopic}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {syllabus.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No topics available. Please generate a syllabus first.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Configure Questions</h3>
                <p className="text-sm text-blue-700">
                  For each selected subtopic, specify how many questions of each type you want to generate.
                  Leave at 0 to skip that question type.
                </p>
              </div>

              {Array.from(questionCounts.entries()).map(([key, data]) => (
                <div key={key} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900">{data.topicTitle}</h3>
                    <p className="text-sm text-gray-600 mt-1">{data.subtopic}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    {/* MCQ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MCQ (Single Answer)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={data.mcqCount}
                        onChange={(e) => handleQuestionCountChange(key, 'mcqCount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* MSQ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MSQ (Multiple Answers)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={data.msqCount}
                        onChange={(e) => handleQuestionCountChange(key, 'msqCount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    {/* Subjective */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subjective Questions
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={data.subjectiveCount}
                        onChange={(e) => handleQuestionCountChange(key, 'subjectiveCount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-gray-600">
                    Total: {data.mcqCount + data.msqCount + data.subjectiveCount} questions
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <div className="flex space-x-3">
            {step === 2 && (
              <button
                onClick={handleBack}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={handleNextStep}
                disabled={selectedCount === 0 || !assessmentTitle.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Configure Questions →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Generate Assessment
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


