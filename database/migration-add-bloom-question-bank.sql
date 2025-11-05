-- Migration: Add Bloom Taxonomy and Question Bank Support
-- Run this in Supabase SQL Editor AFTER the main schema files

-- ============================================
-- 1. ADD BLOOM_LEVEL COLUMNS
-- ============================================

-- Add bloom_level to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'));

-- Add bloom_level to topics table
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'));

-- Add bloom_level to subtopics table
ALTER TABLE subtopics 
ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'));

-- ============================================
-- 2. CREATE QUESTION BANK TABLES
-- ============================================

-- Create question_bank table
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    subtopic_id UUID REFERENCES subtopics(id) ON DELETE SET NULL,
    question_type VARCHAR(20) NOT NULL CHECK (question_type IN ('MCQ', 'MSQ', 'SUBJECTIVE')),
    question_text TEXT NOT NULL,
    points DECIMAL(5,2) DEFAULT 1.0,
    explanation TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    bloom_level VARCHAR(20) CHECK (bloom_level IN ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create question_bank_options table
CREATE TABLE IF NOT EXISTS question_bank_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_bank_id UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    option_label VARCHAR(10) NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(question_bank_id, option_label)
);

-- ============================================
-- 3. CREATE INDEXES
-- ============================================

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_bloom ON questions(bloom_level);

-- Indexes for topics
CREATE INDEX IF NOT EXISTS idx_topics_bloom ON topics(bloom_level);

-- Indexes for subtopics
CREATE INDEX IF NOT EXISTS idx_subtopics_bloom ON subtopics(bloom_level);

-- Indexes for question_bank
CREATE INDEX IF NOT EXISTS idx_question_bank_course ON question_bank(course_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_subtopic ON question_bank(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_type ON question_bank(question_type);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_bloom ON question_bank(bloom_level);
CREATE INDEX IF NOT EXISTS idx_question_bank_filters ON question_bank(course_id, difficulty, bloom_level, question_type);

-- Indexes for question_bank_options
CREATE INDEX IF NOT EXISTS idx_question_bank_options_question ON question_bank_options(question_bank_id);

-- ============================================
-- 4. CREATE TRIGGERS
-- ============================================

-- Trigger to update question_bank updated_at
-- Note: The function might already exist from other migrations, so we use CREATE OR REPLACE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_question_bank_updated_at ON question_bank;

CREATE TRIGGER update_question_bank_updated_at 
BEFORE UPDATE ON question_bank
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. ADD COMMENTS
-- ============================================

COMMENT ON COLUMN questions.bloom_level IS 'Bloom taxonomy cognitive level: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE';
COMMENT ON COLUMN topics.bloom_level IS 'Bloom taxonomy cognitive level for this topic';
COMMENT ON COLUMN subtopics.bloom_level IS 'Bloom taxonomy cognitive level for this subtopic';
COMMENT ON TABLE question_bank IS 'Stores questions in a reusable bank for adaptive assessments';
COMMENT ON TABLE question_bank_options IS 'Stores MCQ/MSQ answer options for questions in the bank';
COMMENT ON COLUMN question_bank.bloom_level IS 'Bloom taxonomy cognitive level: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE';
COMMENT ON COLUMN question_bank.difficulty IS 'Question difficulty level for adaptive selection';

-- ============================================
-- COMPLETE!
-- ============================================

SELECT 'Migration completed successfully!' as status;

