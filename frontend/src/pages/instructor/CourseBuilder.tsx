import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { coursesAPI } from '../../api/courses';
import { aiAPI } from '../../api/ai';
import { assessmentsAPI, Assessment } from '../../api/assessments';
import { Course } from '../../types';
import { CreateAssessmentModal } from '../../components/CreateAssessmentModal';
import { QuestionViewerModal } from '../../components/QuestionViewerModal';

type TabType = 'upload' | 'syllabus' | 'assessments' | 'analytics' | 'settings';

export const CourseBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [loading, setLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [publishing, setPublishing] = useState(false);
  const [editingSyllabus, setEditingSyllabus] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [savingSyllabus, setSavingSyllabus] = useState(false);
  const [isCreateAssessmentModalOpen, setIsCreateAssessmentModalOpen] = useState(false);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [generatedAssessments, setGeneratedAssessments] = useState<Assessment[]>([]);
  const [assessmentProgress, setAssessmentProgress] = useState<string>('');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [isQuestionViewerOpen, setIsQuestionViewerOpen] = useState(false);
  const [publishingAssessment, setPublishingAssessment] = useState<string | null>(null);
  const [hasNewMaterial, setHasNewMaterial] = useState(false); // Track if new material uploaded after syllabus

  // AI Analysis Progress
  const [analysisProgress, setAnalysisProgress] = useState({
    contentAnalysis: false,
    topicExtraction: false,
    syllabusGeneration: false,
  });

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    if (!id) return;
    try {
      const data = await coursesAPI.getById(id);
      setCourse(data);
      if (data.file_name) {
        setUploadedFiles([{ name: data.file_name, url: data.file_url }]);
      }
      // Reset new material flag when course is loaded
      setHasNewMaterial(false);
      
      // Load assessments for this course
      try {
        const assessments = await assessmentsAPI.getByCourseId(id);
        setGeneratedAssessments(assessments);
        console.log(`📊 Loaded ${assessments.length} assessments`);
      } catch (error) {
        console.error('Failed to load assessments:', error);
      }
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!id || !course) return;
    
    setUploading(true);
    try {
      const updatedCourse = await coursesAPI.uploadMaterial(id, file);
      setCourse(updatedCourse);
      setUploadedFiles([...uploadedFiles, { name: file.name, url: updatedCourse.file_url }]);
      
      // If course is published and has syllabus, mark that new material was added
      if (course.is_published && course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0) {
        setHasNewMaterial(true);
      }
      
      // Simulate content analysis
      setTimeout(() => setAnalysisProgress(prev => ({ ...prev, contentAnalysis: true })), 1000);
      setTimeout(() => setAnalysisProgress(prev => ({ ...prev, topicExtraction: true })), 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!id) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`);
    if (!confirmed) return;

    setDeletingFile(fileName);
    try {
      await coursesAPI.deleteFile(id, fileName);
      setUploadedFiles(prev => prev.filter(f => f.name !== fileName));
      await loadCourse();
      
      // Reset analysis progress since material was removed
      setAnalysisProgress({
        contentAnalysis: false,
        topicExtraction: false,
        syllabusGeneration: false,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleGenerateSyllabus = async (updateExisting: boolean = false) => {
    if (!id || !course?.file_name) return;

    setGenerating(true);
    setGenerationStatus(updateExisting 
      ? '📄 Extracting text from new material...'
      : '📄 Extracting text from uploaded file...');
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setGenerationStatus(updateExisting
      ? '🤖 Merging new content with existing syllabus...'
      : '🤖 Analyzing content with Azure AI...');
    setAnalysisProgress(prev => ({ ...prev, syllabusGeneration: true }));

    try {
      // Don't send documentText - let backend extract from uploaded PDF
      setGenerationStatus(updateExisting
        ? '🧠 Updating syllabus with new content...'
        : '🧠 GPT-5-nano is creating your syllabus...');
      await aiAPI.generateSyllabus(id, '', updateExisting);
      
      setGenerationStatus(updateExisting 
        ? '✅ Syllabus updated successfully!'
        : '✅ Syllabus generated successfully!');
      
      // Reset the new material flag
      setHasNewMaterial(false);
      
      await loadCourse();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setActiveTab('syllabus');
      setGenerationStatus('');
    } catch (error) {
      console.error('Syllabus generation failed:', error);
      setGenerationStatus('❌ Failed to generate syllabus');
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert(`Failed to ${updateExisting ? 'update' : 'generate'} syllabus. Please try again.`);
      setGenerationStatus('');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!id || !course) return;

    const action = course.is_published ? 'unpublish' : 'publish';
    const confirmed = window.confirm(
      course.is_published
        ? 'Are you sure you want to unpublish this syllabus? Students will no longer be able to view it.'
        : 'Are you sure you want to publish this syllabus? It will become visible to all enrolled students.'
    );

    if (!confirmed) return;

    setPublishing(true);
    try {
      if (course.is_published) {
        await coursesAPI.unpublish(id);
        alert('Syllabus unpublished successfully!');
      } else {
        await coursesAPI.publish(id);
        alert('Syllabus published successfully! Students can now view it.');
      }
      await loadCourse(); // Reload to get updated status
    } catch (error: any) {
      console.error(`Failed to ${action}:`, error);
      alert(error.response?.data?.error || `Failed to ${action} syllabus`);
    } finally {
      setPublishing(false);
    }
  };

  const handleEditSyllabus = () => {
    if (course?.syllabus) {
      setEditingSyllabus(JSON.parse(JSON.stringify(course.syllabus))); // Deep clone
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditingSyllabus([]);
  };

  const handleSaveSyllabus = async () => {
    if (!id) return;

    setSavingSyllabus(true);
    try {
      await coursesAPI.update(id, { syllabus: editingSyllabus });
      await loadCourse();
      setIsEditMode(false);
      alert('Syllabus updated successfully!');
    } catch (error) {
      console.error('Failed to save syllabus:', error);
      alert('Failed to save syllabus');
    } finally {
      setSavingSyllabus(false);
    }
  };

  const handleTopicChange = (index: number, newTopic: string) => {
    const updated = [...editingSyllabus];
    updated[index].topic = newTopic;
    setEditingSyllabus(updated);
  };

  const handleTopicBloomLevelChange = (index: number, bloomLevel: string) => {
    const updated = [...editingSyllabus];
    updated[index].bloom_level = bloomLevel || undefined;
    setEditingSyllabus(updated);
  };

  const handleSubtopicChange = (topicIndex: number, subtopicIndex: number, newSubtopic: string) => {
    const updated = [...editingSyllabus];
    const currentSubtopic = updated[topicIndex].subtopics[subtopicIndex];
    // Preserve bloom_level if it exists
    if (typeof currentSubtopic === 'object' && currentSubtopic.bloom_level) {
      updated[topicIndex].subtopics[subtopicIndex] = {
        subtopic: newSubtopic,
        bloom_level: currentSubtopic.bloom_level
      };
    } else {
      updated[topicIndex].subtopics[subtopicIndex] = newSubtopic;
    }
    setEditingSyllabus(updated);
  };

  const handleSubtopicBloomLevelChange = (topicIndex: number, subtopicIndex: number, bloomLevel: string) => {
    const updated = [...editingSyllabus];
    const currentSubtopic = updated[topicIndex].subtopics[subtopicIndex];
    const subtopicText = typeof currentSubtopic === 'string' ? currentSubtopic : currentSubtopic.subtopic;
    
    updated[topicIndex].subtopics[subtopicIndex] = bloomLevel 
      ? { subtopic: subtopicText, bloom_level: bloomLevel }
      : subtopicText;
    
    setEditingSyllabus(updated);
  };

  const handleAddSubtopic = (topicIndex: number) => {
    const updated = [...editingSyllabus];
    updated[topicIndex].subtopics.push('New Subtopic');
    setEditingSyllabus(updated);
  };

  const handleRemoveSubtopic = (topicIndex: number, subtopicIndex: number) => {
    const updated = [...editingSyllabus];
    updated[topicIndex].subtopics.splice(subtopicIndex, 1);
    setEditingSyllabus(updated);
  };

  const handleAddTopic = () => {
    setEditingSyllabus([...editingSyllabus, { topic: 'New Topic', subtopics: ['Subtopic 1'] }]);
  };

  const handleRemoveTopic = (index: number) => {
    const updated = [...editingSyllabus];
    updated.splice(index, 1);
    setEditingSyllabus(updated);
  };

  const getBloomLevelColor = (level?: string) => {
    switch (level) {
      case 'REMEMBER': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'UNDERSTAND': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'APPLY': return 'bg-green-100 text-green-700 border-green-300';
      case 'ANALYZE': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'EVALUATE': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'CREATE': return 'bg-purple-100 text-purple-700 border-purple-300';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getBloomLevelLabel = (level?: string) => {
    if (!level) return null;
    const labels: Record<string, string> = {
      'REMEMBER': 'Remember',
      'UNDERSTAND': 'Understand',
      'APPLY': 'Apply',
      'ANALYZE': 'Analyze',
      'EVALUATE': 'Evaluate',
      'CREATE': 'Create',
    };
    return labels[level] || level;
  };

  const bloomLevels: Array<{ value: string; label: string }> = [
    { value: '', label: 'None' },
    { value: 'REMEMBER', label: 'Remember' },
    { value: 'UNDERSTAND', label: 'Understand' },
    { value: 'APPLY', label: 'Apply' },
    { value: 'ANALYZE', label: 'Analyze' },
    { value: 'EVALUATE', label: 'Evaluate' },
    { value: 'CREATE', label: 'Create' },
  ];

  const handleCreateAssessment = async (data: {
    title: string;
    subtopics: Array<{
      topicTitle: string;
      subtopic: string;
      mcqCount: number;
      msqCount: number;
      subjectiveCount: number;
    }>;
    difficultyDistribution?: { easy: number; medium: number; hard: number };
    quizLevel?: 'UG' | 'PG';
  }) => {
    if (!id) return;

    setGeneratingAssessment(true);
    setAssessmentProgress('Creating assessment...');
    
    try {
      console.log('🤖 Creating assessment with AI-generated questions:', data);
      
      // Calculate totals for display
      const totalMcq = data.subtopics.reduce((sum, s) => sum + s.mcqCount, 0);
      const totalMsq = data.subtopics.reduce((sum, s) => sum + s.msqCount, 0);
      const totalSubjective = data.subtopics.reduce((sum, s) => sum + s.subjectiveCount, 0);
      const totalQuestions = totalMcq + totalMsq + totalSubjective;
      
      // Get unique topics
      const uniqueTopics = [...new Set(data.subtopics.map(s => s.topicTitle))];
      
      setAssessmentProgress(`Generating ${totalQuestions} questions with AI for ${data.subtopics.length} subtopic(s)...`);
      
      // Call backend API to create assessment and generate questions
      const result = await assessmentsAPI.create({
        courseId: id,
        title: data.title,
        subtopics: data.subtopics,
        difficultyDistribution: data.difficultyDistribution,
        quizLevel: data.quizLevel || 'UG'
      });
      
      console.log(`✅ Assessment created: ${result.assessment.id}`);
      console.log(`✅ Questions generated: ${result.questionsGenerated}`);
      
      setAssessmentProgress('Finalizing assessment...');
      
      // Show success message
      alert(`Assessment "${data.title}" created successfully!\n\n✅ ${result.questionsGenerated} questions generated\n📝 ${result.assessment.mcq_count} MCQ, ${result.assessment.msq_count} MSQ, ${result.assessment.subjective_count} Subjective\n📚 Covering ${uniqueTopics.length} topic(s)`);
      
      setIsCreateAssessmentModalOpen(false);
      setAssessmentProgress('');
      
      // Reload course and assessments
      await loadCourse();
    } catch (error) {
      console.error('Failed to create assessment:', error);
      setAssessmentProgress('');
      alert(`Failed to create assessment. Please try again.\n\nError: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGeneratingAssessment(false);
      setAssessmentProgress('');
    }
  };

  const handleViewQuestions = (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    setIsQuestionViewerOpen(true);
  };

  const handlePublishAssessment = async (assessment: Assessment) => {
    setPublishingAssessment(assessment.id);
    try {
      if (assessment.is_published) {
        await assessmentsAPI.unpublish(assessment.id);
        alert(`Assessment "${assessment.title}" has been unpublished and is no longer visible to students.`);
      } else {
        await assessmentsAPI.publish(assessment.id);
        alert(`Assessment "${assessment.title}" has been published and is now visible to students!`);
      }
      await loadCourse(); // Reload to update the UI
    } catch (error) {
      console.error('Failed to publish/unpublish assessment:', error);
      alert(`Failed to ${assessment.is_published ? 'unpublish' : 'publish'} assessment. Please try again.`);
    } finally {
      setPublishingAssessment(null);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-xl text-gray-600">Loading course...</div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-12">Course not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-[calc(100vh-120px)] -mx-8 -mb-8">
        {/* Left Sidebar - Navigation */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Course Management
            </h2>
          </div>
          
          <nav className="flex-1 p-4 space-y-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'upload'
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload Materials</span>
            </button>

            <button
              onClick={() => setActiveTab('syllabus')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'syllabus'
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Syllabus Generation</span>
            </button>

            <button
              onClick={() => setActiveTab('assessments')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'assessments'
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span>Assignments</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-8">
            {/* Course Header - Only show on Syllabus tab */}
            {activeTab === 'syllabus' && course?.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0 && (
              <div className="mb-6 flex items-start justify-between bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-gray-900">Review & Publish Syllabus</h1>
                    {course?.is_published && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Published
                      </span>
                    )}
                    {!course?.is_published && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Draft
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-gray-600">
                    {course?.is_published 
                      ? `Published on ${new Date(course.published_at || '').toLocaleDateString()}. Students can view this syllabus.`
                      : 'Review the AI-generated topics and subtopics. You can edit them before publishing to students.'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-3 ml-6">
                  {hasNewMaterial && course?.is_published && course?.file_name && (
                    <button
                      onClick={() => handleGenerateSyllabus(true)}
                      disabled={generating || isEditMode}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Update with New Material</span>
                        </>
                      )}
                    </button>
                  )}
                  {!isEditMode && !course?.is_published && (
                    <button
                      onClick={handleEditSyllabus}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={handlePublishToggle}
                    disabled={publishing || isEditMode}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      course.is_published
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {publishing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                        <span>Processing...</span>
                      </>
                    ) : course.is_published ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        <span>Unpublish</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Publish Syllabus</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Upload Materials Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Upload Course Materials</h1>
                  <p className="mt-1 text-gray-600">
                    {course?.is_published ? (
                      <>
                        You can continue to upload additional materials even after publishing. 
                        Update your syllabus to include new content and keep students informed.
                      </>
                    ) : (
                      <>
                        Upload your course content such as textbooks, lecture notes, or reference materials.
                        Our AI will analyze the content to create a comprehensive course structure.
                      </>
                    )}
                  </p>
                </div>

                {/* New Material Alert for Published Courses */}
                {hasNewMaterial && course?.is_published && course?.syllabus && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-amber-800">
                          New Material Added
                        </h3>
                        <div className="mt-2 text-sm text-amber-700">
                          <p>
                            You've added new material to a published course. Update your syllabus to include this new content 
                            so students can see the latest course structure.
                          </p>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={() => handleGenerateSyllabus(true)}
                            disabled={generating}
                            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {generating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Updating...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Update Syllabus with New Material</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Drag and Drop Area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    dragActive
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drag and drop your files here
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        or click to browse and select files
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <label className="btn-primary cursor-pointer px-6 py-2">
                      Browse Files
                    </label>
                    <p className="text-xs text-gray-400">
                      Supported formats: PDF, DOC, DOCX, TXT (Max 50MB per file)
                    </p>
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-xl">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Uploading...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Uploaded Files List */}
                {uploadedFiles.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Uploaded Files</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <span className="text-sm text-green-600 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Processed
                                  </span>
                                  {file.url && (
                                    <a 
                                      href={file.url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                                    >
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                      View
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleDeleteFile(file.name)}
                              disabled={deletingFile === file.name}
                              className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                              title="Delete file"
                            >
                              {deletingFile === file.name ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generate/Update Syllabus CTA */}
                {uploadedFiles.length > 0 && !hasNewMaterial && (
                  <div className={`rounded-xl p-6 text-white ${
                    course?.is_published && course?.syllabus 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                      : 'bg-gradient-to-r from-primary-500 to-primary-600'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">
                          {course?.is_published && course?.syllabus 
                            ? 'Update Your Syllabus' 
                            : 'Ready to generate your syllabus?'}
                        </h3>
                        <p className="text-blue-100 mt-1">
                          {course?.is_published && course?.syllabus
                            ? 'Generate a new syllabus from the latest materials, or update the existing one to merge new content.'
                            : 'Our AI will analyze your uploaded materials and create a comprehensive course structure'}
                        </p>
                        {generationStatus && (
                          <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium">
                            {generationStatus}
                          </div>
                        )}
                      </div>
                      <div className="ml-6 flex flex-col space-y-2 flex-shrink-0">
                        {course?.is_published && course?.syllabus ? (
                          <>
                            <button
                              onClick={() => handleGenerateSyllabus(true)}
                              disabled={generating}
                              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              {generating ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                  <span>Updating...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>Update Syllabus</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleGenerateSyllabus(false)}
                              disabled={generating}
                              className="bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              {generating ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  <span>Generating...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                  </svg>
                                  <span>Generate New</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleGenerateSyllabus(false)}
                            disabled={generating}
                            className="bg-white text-primary-600 px-6 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            {generating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Generate Syllabus</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Syllabus Tab */}
            {activeTab === 'syllabus' && (
              <div className="space-y-6">
                {course.syllabus ? (
                  <>
                    {/* Bloom's Taxonomy Legend */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Bloom's Taxonomy Levels
                          </h3>
                          <p className="text-xs text-gray-600 mb-3">
                            These badges indicate the cognitive skill level expected for each topic. They help students understand what they need to achieve.
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('REMEMBER')}`}>
                                Remember
                              </span>
                              <span className="text-xs text-gray-600">Recall facts</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('UNDERSTAND')}`}>
                                Understand
                              </span>
                              <span className="text-xs text-gray-600">Explain ideas</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('APPLY')}`}>
                                Apply
                              </span>
                              <span className="text-xs text-gray-600">Use in practice</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('ANALYZE')}`}>
                                Analyze
                              </span>
                              <span className="text-xs text-gray-600">Break down</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('EVALUATE')}`}>
                                Evaluate
                              </span>
                              <span className="text-xs text-gray-600">Make judgments</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getBloomLevelColor('CREATE')}`}>
                                Create
                              </span>
                              <span className="text-xs text-gray-600">Build new</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Edit Mode Actions */}
                    {isEditMode && (
                      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-900">Editing Mode</p>
                            <p className="text-sm text-gray-600">Make changes to topics and subtopics. Click Save when done.</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={handleCancelEdit}
                            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveSyllabus}
                            disabled={savingSyllabus}
                            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                          >
                            {savingSyllabus ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Syllabus Content */}
                    <div className="space-y-4">
                      {(isEditMode ? editingSyllabus : course.syllabus).map((item: any, index: number) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          {/* Topic Header */}
                          <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 flex items-center space-x-3 flex-wrap">
                                {isEditMode ? (
                                  <>
                                    <input
                                      type="text"
                                      value={item.topic}
                                      onChange={(e) => handleTopicChange(index, e.target.value)}
                                      className="flex-1 min-w-[200px] text-lg font-semibold text-gray-900 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                      placeholder="Topic name"
                                    />
                                    <select
                                      value={item.bloom_level || ''}
                                      onChange={(e) => handleTopicBloomLevelChange(index, e.target.value)}
                                      className={`px-3 py-2 rounded-lg text-sm font-medium border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${getBloomLevelColor(item.bloom_level)}`}
                                    >
                                      {bloomLevels.map((level) => (
                                        <option key={level.value} value={level.value}>
                                          {level.label}
                                        </option>
                                      ))}
                                    </select>
                                  </>
                                ) : (
                                  <>
                                    <h3 className="text-lg font-semibold text-gray-900">{item.topic}</h3>
                                    <select
                                      value={item.bloom_level || ''}
                                      onChange={(e) => {
                                        // Initialize editingSyllabus if not already in edit mode
                                        if (!isEditMode && course.syllabus) {
                                          setEditingSyllabus(JSON.parse(JSON.stringify(course.syllabus)));
                                        }
                                        const updated = isEditMode ? [...editingSyllabus] : JSON.parse(JSON.stringify(course.syllabus || []));
                                        updated[index].bloom_level = e.target.value || undefined;
                                        setEditingSyllabus(updated);
                                        setIsEditMode(true);
                                      }}
                                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getBloomLevelColor(item.bloom_level)}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {bloomLevels.map((level) => (
                                        <option key={level.value} value={level.value}>
                                          {level.label}
                                        </option>
                                      ))}
                                    </select>
                                  </>
                                )}
                              </div>
                              {isEditMode && (
                                <button
                                  onClick={() => handleRemoveTopic(index)}
                                  className="ml-3 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove topic"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Subtopics */}
                          <div className="px-6 py-4">
                            <ul className="space-y-2">
                              {item.subtopics.map((subtopic: string | { subtopic: string; bloom_level?: string }, subIndex: number) => {
                                const subtopicText = typeof subtopic === 'string' ? subtopic : subtopic.subtopic;
                                const subtopicBloomLevel = typeof subtopic === 'object' ? subtopic.bloom_level : undefined;
                                
                                return (
                                  <li key={subIndex} className="flex items-start space-x-3">
                                    {!isEditMode && (
                                      <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                    {isEditMode ? (
                                      <div className="flex-1 flex items-center space-x-2 flex-wrap gap-2">
                                        <input
                                          type="text"
                                          value={subtopicText}
                                          onChange={(e) => handleSubtopicChange(index, subIndex, e.target.value)}
                                          className="flex-1 min-w-[200px] text-gray-700 bg-white border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                          placeholder="Subtopic name"
                                        />
                                        <select
                                          value={subtopicBloomLevel || ''}
                                          onChange={(e) => handleSubtopicBloomLevelChange(index, subIndex, e.target.value)}
                                          className={`px-3 py-2 rounded-lg text-xs font-medium border focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${getBloomLevelColor(subtopicBloomLevel)}`}
                                        >
                                          {bloomLevels.map((level) => (
                                            <option key={level.value} value={level.value}>
                                              {level.label}
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          onClick={() => handleRemoveSubtopic(index, subIndex)}
                                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                          title="Remove subtopic"
                                        >
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex-1 flex items-center space-x-2 flex-wrap gap-2">
                                        <span className="text-gray-700">{subtopicText}</span>
                                        <select
                                          value={subtopicBloomLevel || ''}
                                          onChange={(e) => {
                                            // Initialize editingSyllabus if not already in edit mode
                                            if (!isEditMode && course.syllabus) {
                                              setEditingSyllabus(JSON.parse(JSON.stringify(course.syllabus)));
                                            }
                                            handleSubtopicBloomLevelChange(index, subIndex, e.target.value);
                                            setIsEditMode(true);
                                          }}
                                          className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer hover:opacity-80 transition-opacity ${getBloomLevelColor(subtopicBloomLevel)}`}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {bloomLevels.map((level) => (
                                            <option key={level.value} value={level.value}>
                                              {level.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>

                            {/* Add Subtopic Button */}
                            {isEditMode && (
                              <button
                                onClick={() => handleAddSubtopic(index)}
                                className="mt-3 flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span>Add Subtopic</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Topic Button */}
                    {isEditMode && (
                      <button
                        onClick={handleAddTopic}
                        className="w-full bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors group"
                      >
                        <div className="flex items-center justify-center space-x-2 text-gray-600 group-hover:text-primary-600">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="font-medium">Add New Topic</span>
                        </div>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No syllabus generated yet</h3>
                    <p className="mt-2 text-gray-500">Upload course materials and generate a syllabus to get started</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Go to Upload Materials
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Assessments Tab */}
            {activeTab === 'assessments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Assessments & Quizzes</h2>
                    <p className="mt-1 text-gray-600">Create AI-powered assessments based on course topics</p>
                  </div>
                  {course.syllabus && Array.isArray(course.syllabus) && course.syllabus.length > 0 && (
                    <button
                      onClick={() => setIsCreateAssessmentModalOpen(true)}
                      disabled={generatingAssessment}
                      className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                        generatingAssessment
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-primary-600 hover:bg-primary-700'
                      } text-white`}
                    >
                      {generatingAssessment ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Create Assessment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {!course.syllabus || !Array.isArray(course.syllabus) || course.syllabus.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Syllabus Available</h3>
                    <p className="mt-2 text-gray-500">
                      You need to generate a syllabus before creating assessments.
                    </p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Go to Upload Materials
                    </button>
                  </div>
                ) : generatedAssessments.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                    <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Assessments Yet</h3>
                    <p className="mt-2 text-gray-500">
                      Click the "Create Assessment" button above to generate AI-powered quizzes based on your course topics.
                    </p>
                    <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-600">
                      <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                      <span>Look for the button in the top right corner</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {generatedAssessments.map((assessment) => (
                        <div
                          key={assessment.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
                        >
                          {/* Card Header */}
                          <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {assessment.title}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {assessment.is_published ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      Published
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Draft
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button className="text-gray-400 hover:text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Card Content */}
                          <div className="px-6 py-4 space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-blue-50 rounded-lg">
                                <div className="text-2xl font-bold text-blue-600">{assessment.mcq_count}</div>
                                <div className="text-xs text-gray-600 mt-1">MCQ</div>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">{assessment.msq_count}</div>
                                <div className="text-xs text-gray-600 mt-1">MSQ</div>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">{assessment.subjective_count}</div>
                                <div className="text-xs text-gray-600 mt-1">Subjective</div>
                              </div>
                            </div>

                            {/* Total Questions */}
                            <div className="flex items-center justify-between py-2 border-t border-gray-200">
                              <span className="text-sm font-medium text-gray-700">Total Questions</span>
                              <span className="text-lg font-bold text-gray-900">{assessment.total_questions}</span>
                            </div>

                            {/* Topics */}
                            {assessment.topicIds && assessment.topicIds.length > 0 && (
                              <div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                  Topics Covered
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                    {assessment.topicIds.length} topic(s)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Created Date */}
                            <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                              Created {new Date(assessment.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <button 
                                onClick={() => handleViewQuestions(assessment)}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                View Questions
                              </button>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => alert('Edit assessment feature coming in Phase 2!')}
                                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                  title="Edit assessment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (window.confirm(`Are you sure you want to delete "${assessment.title}"?\n\nThis will delete all ${assessment.total_questions} questions permanently.`)) {
                                      try {
                                        await assessmentsAPI.delete(assessment.id);
                                        alert('Assessment deleted successfully!');
                                        await loadCourse();
                                      } catch (error) {
                                        alert('Failed to delete assessment. Please try again.');
                                      }
                                    }
                                  }}
                                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                  title="Delete assessment"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            
                            {/* Publish/Unpublish Button */}
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => handlePublishAssessment(assessment)}
                                disabled={publishingAssessment === assessment.id}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  publishingAssessment === assessment.id
                                    ? 'bg-gray-400 cursor-not-allowed text-white'
                                    : assessment.is_published
                                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                              >
                                {publishingAssessment === assessment.id ? (
                                  <>
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing...</span>
                                  </>
                                ) : assessment.is_published ? (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464m1.414 1.414L12 12m-3.536-3.536L8.464 8.464m0 0L7.05 7.05m1.414 1.414L7.05 7.05" />
                                    </svg>
                                    <span>Unpublish</span>
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span>Publish</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
                <p className="mt-2 text-gray-600">Student performance by topic</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-900">Course Settings</h2>
                <p className="mt-2 text-gray-600">Manage course details</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Course Info & Progress */}
        <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-6 overflow-y-auto">
          {/* Course Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Course Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500">Course Title</label>
                <p className="mt-1 text-sm font-medium text-gray-900">{course.title}</p>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Course Code</label>
                <input
                  type="text"
                  defaultValue="CS 401"
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Semester</label>
                <select className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option>Spring 2025</option>
                  <option>Fall 2024</option>
                  <option>Summer 2024</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500">Duration (weeks)</label>
                <input
                  type="number"
                  defaultValue={16}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* AI Analysis Status */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              AI Analysis Status
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Content Analysis</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  analysisProgress.contentAnalysis
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {analysisProgress.contentAnalysis ? 'Complete' : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Topic Extraction</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  analysisProgress.topicExtraction
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {analysisProgress.topicExtraction ? 'In Progress' : 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Syllabus Generation</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  analysisProgress.syllabusGeneration
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {analysisProgress.syllabusGeneration ? 'Pending' : 'Pending'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">Overall Progress</span>
                <span className="text-xs font-medium text-primary-600">
                  {Math.round((Object.values(analysisProgress).filter(Boolean).length / 3) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(Object.values(analysisProgress).filter(Boolean).length / 3) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Quick Actions
            </h3>
            
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                📊 View Analytics
              </button>
              <button className="w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                📝 Create Assignment
              </button>
              <button className="w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                👥 Manage Students
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Assessment Modal */}
      <CreateAssessmentModal
        course={course}
        isOpen={isCreateAssessmentModalOpen}
        onClose={() => setIsCreateAssessmentModalOpen(false)}
        onSubmit={handleCreateAssessment}
      />

      {/* Progress Overlay */}
      {generatingAssessment && assessmentProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center space-y-4">
              <svg className="animate-spin h-16 w-16 text-primary-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Generating Assessment
                </h3>
                <p className="text-gray-600">
                  {assessmentProgress}
                </p>
                <p className="text-sm text-gray-500 mt-4">
                  This may take 30-60 seconds depending on the number of questions...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Viewer Modal */}
      {selectedAssessment && (
        <QuestionViewerModal
          assessment={selectedAssessment}
          isOpen={isQuestionViewerOpen}
          onClose={() => {
            setIsQuestionViewerOpen(false);
            setSelectedAssessment(null);
          }}
        />
      )}
    </Layout>
  );
};

