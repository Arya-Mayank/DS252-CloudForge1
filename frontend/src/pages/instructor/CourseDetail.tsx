import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { coursesAPI, CourseFileSummary } from '../../api/courses';
import { aiAPI } from '../../api/ai';
import { Course, SyllabusItem } from '../../types';

export const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [files, setFiles] = useState<CourseFileSummary[]>([]);

  const loadCourse = useCallback(async () => {
    if (!id) return;
    try {
      const data = await coursesAPI.getById(id);
      setCourse(data);
      try {
        const courseFiles = await coursesAPI.getFiles(id);
        setFiles(courseFiles);
      } catch (error) {
        console.error('Failed to load course files:', error);
      }
    } catch (error) {
      console.error('Failed to load course:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id) return;
    
    setUploading(true);
    try {
      const file = e.target.files[0];
      const { course: updatedCourse, files: updatedFiles } = await coursesAPI.uploadMaterial(id, file);
      setCourse(updatedCourse);
      setFiles(updatedFiles);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSyllabus = async () => {
    if (!id || files.length === 0) {
      alert('Please upload a course document first');
      return;
    }

    setGenerating(true);
    try {
      // For demo: Generate syllabus with placeholder text
      // In production, you'd extract text from the uploaded file
      const courseTitle = course?.title || 'your course';
      const courseDescription = course?.description || '';
      const documentText = `This is a sample course about ${courseTitle}. ${courseDescription}`;
      const syllabus = await aiAPI.generateSyllabus(id, documentText);
      
      await coursesAPI.update(id, { syllabus });
      loadCourse();
      alert('Syllabus generated successfully!');
    } catch (error) {
      console.error('Failed to generate syllabus:', error);
      alert('Failed to generate syllabus');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAssessment = async () => {
    if (!id || !course?.syllabus) {
      alert('Please generate a syllabus first');
      return;
    }

    const topics = course.syllabus.map((item: SyllabusItem) => item.topic);
    
    try {
      await aiAPI.generateAssessment(id, topics, 10, `${course.title} Assessment`);
      alert('Assessment generated successfully!');
    } catch (error) {
      console.error('Failed to generate assessment:', error);
      alert('Failed to generate assessment');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this course?')) return;

    try {
      await coursesAPI.delete(id);
      navigate('/instructor');
    } catch (error) {
      console.error('Failed to delete course:', error);
      alert('Failed to delete course');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading...</div>
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
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-600 mt-2">{course.description}</p>
          </div>
          <button
            onClick={handleDelete}
            className="px-4 py-2 text-red-600 hover:text-red-700"
          >
            Delete Course
          </button>
        </div>

        {/* Upload Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Course Materials</h2>
          <div className="space-y-4">
            <label className="btn-primary cursor-pointer inline-block">
              {uploading ? 'Uploading...' : 'Upload Course Document (PDF/DOCX)'}
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>

            {files.length > 0 ? (
              <div className="border border-gray-200 rounded-lg divide-y">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{file.name}</p>
                      {file.uploadedAt && (
                        <p className="text-sm text-gray-500">
                          Uploaded {new Date(file.uploadedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {file.url && (
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No materials uploaded yet.</p>
            )}
          </div>
        </div>

        {/* AI Features */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">AI-Powered Features</h2>
          <div className="space-y-3">
            <button
              onClick={handleGenerateSyllabus}
              disabled={files.length === 0 || generating}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? 'Generating...' : '🤖 Generate Syllabus from Document'}
            </button>
            <button
              onClick={handleGenerateAssessment}
              disabled={!course.syllabus}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🤖 Generate Assessment Questions
            </button>
          </div>
        </div>

        {/* Syllabus Display */}
        {course.syllabus && (
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Generated Syllabus</h2>
            <div className="space-y-4">
              {Array.isArray(course.syllabus) && course.syllabus.map((item: SyllabusItem, index: number) => (
                <div key={index} className="border-l-4 border-primary-500 pl-4">
                  <h3 className="font-semibold text-lg">{item.topic}</h3>
                  <p className="text-sm text-gray-600">Estimated: {item.estimatedHours} hours</p>
                  <ul className="list-disc list-inside text-gray-700 mt-2">
                    {item.subtopics.map((subtopic, subIndex) => {
                      const subtopicText = typeof subtopic === 'string' ? subtopic : subtopic.subtopic;
                      return (
                        <li key={subIndex}>{subtopicText}</li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

