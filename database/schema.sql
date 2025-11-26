-- DoodleOnMoodle Database Schema
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('instructor', 'student')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    syllabus JSONB, -- Stores generated syllabus structure
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course material files (allows multiple uploads per course)
CREATE TABLE IF NOT EXISTS course_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    blob_name VARCHAR(255) NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Course enrollments (many-to-many relationship)
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Assessments table
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'quiz', -- quiz, exam, assignment
    duration_minutes INTEGER,
    passing_score DECIMAL(5,2) DEFAULT 60.00,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('mcq', 'short-answer', 'true-false')),
    options JSONB, -- Array of options for MCQ
    correct_answer TEXT NOT NULL,
    difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic VARCHAR(255),
    points DECIMAL(5,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student assessment attempts and results
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    answers JSONB, -- Stores student's answers
    score DECIMAL(5,2),
    total_points DECIMAL(5,2),
    percentage DECIMAL(5,2),
    time_taken_minutes INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback JSONB -- Stores per-question feedback
);

-- Embeddings table for RAG (Phase 2 enhancement)
-- Note: For Phase 2, enable pgvector extension and change embedding_data to VECTOR(1536)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER,
    metadata JSONB, -- topic, page, section, etc.
    embedding_data TEXT, -- Stores serialized embeddings (upgrade to VECTOR type in Phase 2)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance analytics view
CREATE OR REPLACE VIEW student_performance AS
SELECT 
    r.student_id,
    u.email,
    u.first_name,
    u.last_name,
    c.id as course_id,
    c.title as course_title,
    a.id as assessment_id,
    a.title as assessment_title,
    r.score,
    r.percentage,
    r.completed_at
FROM results r
JOIN users u ON r.student_id = u.id
JOIN assessments a ON r.assessment_id = a.id
JOIN courses c ON a.course_id = c.id;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_files_course ON course_files(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_assessments_course ON assessments(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_assessment ON questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_assessment ON results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_course ON embeddings(course_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be configured based on your authentication strategy
-- For JWT-based auth with service role, you may want to disable RLS or use service_role key
-- For development, you can disable RLS temporarily:
-- ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;

COMMENT ON TABLE users IS 'Application users with role-based access';
COMMENT ON TABLE courses IS 'Courses created by instructors';
COMMENT ON TABLE enrollments IS 'Student course enrollments';
COMMENT ON TABLE assessments IS 'Quizzes and exams for courses';
COMMENT ON TABLE questions IS 'Assessment questions with various types';
COMMENT ON TABLE results IS 'Student assessment attempts and scores';
COMMENT ON TABLE embeddings IS 'Document embeddings for RAG (Phase 2)';

