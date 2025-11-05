-- Additional schema for Topics and Subtopics
-- Run this AFTER the main schema.sql

-- Topics table (main syllabus topics)
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subtopics table (detailed breakdown of each topic)
CREATE TABLE IF NOT EXISTS subtopics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    learning_objectives TEXT[],
    bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link questions to specific topics/subtopics for analytics
CREATE TABLE IF NOT EXISTS question_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_id, topic_id, subtopic_id)
);

-- Track student performance by topic
CREATE TABLE IF NOT EXISTS student_topic_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE CASCADE,
    attempts INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, topic_id, subtopic_id)
);

-- Indexes for performance
CREATE INDEX idx_topics_course ON topics(course_id);
CREATE INDEX idx_topics_order ON topics(course_id, order_index);
CREATE INDEX idx_topics_bloom ON topics(bloom_level);
CREATE INDEX idx_subtopics_topic ON subtopics(topic_id);
CREATE INDEX idx_subtopics_bloom ON subtopics(bloom_level);
CREATE INDEX idx_question_topics_question ON question_topics(question_id);
CREATE INDEX idx_question_topics_topic ON question_topics(topic_id);
CREATE INDEX idx_student_topic_perf_student ON student_topic_performance(student_id);
CREATE INDEX idx_student_topic_perf_topic ON student_topic_performance(topic_id);

-- Materialized view for quick topic analytics
CREATE MATERIALIZED VIEW topic_analytics AS
SELECT 
    t.id as topic_id,
    t.course_id,
    t.title as topic_title,
    COUNT(DISTINCT st.id) as subtopic_count,
    COUNT(DISTINCT qt.question_id) as question_count,
    AVG(stp.correct_answers::float / NULLIF(stp.attempts, 0)) as average_accuracy,
    COUNT(DISTINCT stp.student_id) as students_attempted
FROM topics t
LEFT JOIN subtopics st ON st.topic_id = t.id
LEFT JOIN question_topics qt ON qt.topic_id = t.id
LEFT JOIN student_topic_performance stp ON stp.topic_id = t.id
GROUP BY t.id, t.course_id, t.title;

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_topic_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW topic_analytics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE topics IS 'Main course topics from AI-generated syllabus';
COMMENT ON TABLE subtopics IS 'Detailed breakdown of each topic';
COMMENT ON TABLE question_topics IS 'Links questions to topics for analytics';
COMMENT ON TABLE student_topic_performance IS 'Tracks student performance per topic';

