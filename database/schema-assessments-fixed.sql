-- Assessment and Questions Schema - FIXED VERSION
-- Run this in your Supabase SQL editor

-- ============================================
-- DROP OLD TABLES (if they exist)
-- ============================================
-- This ensures we start fresh without conflicts

DROP TABLE IF EXISTS student_answers CASCADE;
DROP TABLE IF EXISTS student_attempts CASCADE;
DROP TABLE IF EXISTS assessment_topics CASCADE;
DROP TABLE IF EXISTS question_options CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;

-- ============================================
-- ASSESSMENTS TABLE
-- ============================================

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER DEFAULT 0,
    mcq_count INTEGER DEFAULT 0,
    msq_count INTEGER DEFAULT 0,
    subjective_count INTEGER DEFAULT 0,
    time_limit_minutes INTEGER,
    passing_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MCQ', 'MSQ', 'SUBJECTIVE')),
    question_text TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    points DECIMAL(5,2) DEFAULT 1.0,
    explanation TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, question_number)
);

-- ============================================
-- QUESTION OPTIONS TABLE (for MCQ/MSQ)
-- ============================================

CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_label VARCHAR(10) NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, option_label)
);

-- ============================================
-- ASSESSMENT TOPICS JUNCTION TABLE
-- ============================================

CREATE TABLE assessment_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, topic_id)
);

-- ============================================
-- STUDENT ATTEMPTS TABLE
-- ============================================

CREATE TABLE student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at TIMESTAMP WITH TIME ZONE,
    score DECIMAL(5,2),
    total_points DECIMAL(5,2),
    percentage DECIMAL(5,2),
    time_taken_minutes INTEGER,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- STUDENT ANSWERS TABLE
-- ============================================

CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES student_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_option_ids UUID[],
    text_answer TEXT,
    is_correct BOOLEAN,
    points_earned DECIMAL(5,2) DEFAULT 0,
    feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(attempt_id, question_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_assessments_course ON assessments(course_id);
CREATE INDEX idx_assessments_instructor ON assessments(instructor_id);
CREATE INDEX idx_assessments_published ON assessments(is_published);

CREATE INDEX idx_questions_assessment ON questions(assessment_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_subtopic ON questions(subtopic_id);
CREATE INDEX idx_questions_type ON questions(question_type);

CREATE INDEX idx_question_options_question ON question_options(question_id);
CREATE INDEX idx_question_options_correct ON question_options(is_correct);

CREATE INDEX idx_assessment_topics_assessment ON assessment_topics(assessment_id);
CREATE INDEX idx_assessment_topics_topic ON assessment_topics(topic_id);

CREATE INDEX idx_attempts_assessment ON student_attempts(assessment_id);
CREATE INDEX idx_attempts_student ON student_attempts(student_id);
CREATE INDEX idx_attempts_enrollment ON student_attempts(enrollment_id);
CREATE INDEX idx_attempts_completed ON student_attempts(is_completed);

CREATE INDEX idx_answers_attempt ON student_answers(attempt_id);
CREATE INDEX idx_answers_question ON student_answers(question_id);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE assessments IS 'Stores assessment/quiz metadata';
COMMENT ON TABLE questions IS 'Stores individual questions for assessments';
COMMENT ON TABLE question_options IS 'Stores MCQ/MSQ answer options';
COMMENT ON TABLE assessment_topics IS 'Junction table linking assessments to topics';
COMMENT ON TABLE student_attempts IS 'Tracks student assessment attempts';
COMMENT ON TABLE student_answers IS 'Stores student answers for each question';

COMMENT ON COLUMN assessments.is_published IS 'Whether assessment is visible to students';
COMMENT ON COLUMN questions.question_type IS 'MCQ (single choice), MSQ (multiple choice), or SUBJECTIVE (open-ended)';
COMMENT ON COLUMN questions.question_number IS 'Order/sequence of question in assessment';
COMMENT ON COLUMN question_options.is_correct IS 'Whether this option is a correct answer';
COMMENT ON COLUMN student_answers.selected_option_ids IS 'Array of selected option UUIDs for MCQ/MSQ';
COMMENT ON COLUMN student_answers.is_correct IS 'Auto-graded for MCQ/MSQ, manually graded for subjective';

-- ============================================
-- ANALYTICS VIEW
-- ============================================

CREATE OR REPLACE VIEW assessment_analytics AS
SELECT 
    a.id AS assessment_id,
    a.course_id,
    a.title,
    a.total_questions,
    COUNT(DISTINCT sa.student_id) AS total_attempts,
    COUNT(DISTINCT CASE WHEN sa.is_completed THEN sa.student_id END) AS completed_attempts,
    AVG(CASE WHEN sa.is_completed THEN sa.percentage END) AS avg_score,
    MAX(sa.percentage) AS highest_score,
    MIN(sa.percentage) AS lowest_score,
    AVG(CASE WHEN sa.is_completed THEN sa.time_taken_minutes END) AS avg_time_minutes
FROM assessments a
LEFT JOIN student_attempts sa ON a.id = sa.assessment_id
GROUP BY a.id, a.course_id, a.title, a.total_questions;

COMMENT ON VIEW assessment_analytics IS 'Provides aggregate statistics for each assessment';

-- ============================================
-- TRIGGER: Update assessment question counts
-- ============================================

CREATE OR REPLACE FUNCTION update_assessment_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE assessments
    SET 
        total_questions = (
            SELECT COUNT(*) FROM questions WHERE assessment_id = NEW.assessment_id
        ),
        mcq_count = (
            SELECT COUNT(*) FROM questions 
            WHERE assessment_id = NEW.assessment_id AND question_type = 'MCQ'
        ),
        msq_count = (
            SELECT COUNT(*) FROM questions 
            WHERE assessment_id = NEW.assessment_id AND question_type = 'MSQ'
        ),
        subjective_count = (
            SELECT COUNT(*) FROM questions 
            WHERE assessment_id = NEW.assessment_id AND question_type = 'SUBJECTIVE'
        ),
        updated_at = NOW()
    WHERE id = NEW.assessment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_assessment_counts
AFTER INSERT OR UPDATE ON questions
FOR EACH ROW
EXECUTE FUNCTION update_assessment_counts();

COMMENT ON FUNCTION update_assessment_counts IS 'Auto-updates assessment question counts when questions are added/modified';

-- ============================================
-- TRIGGER: Update updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_attempts_updated_at BEFORE UPDATE ON student_attempts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_answers_updated_at BEFORE UPDATE ON student_answers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPLETE!
-- ============================================

-- Verify tables were created
SELECT 
    table_name, 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('assessments', 'questions', 'question_options', 'assessment_topics', 'student_attempts', 'student_answers')
ORDER BY table_name;

