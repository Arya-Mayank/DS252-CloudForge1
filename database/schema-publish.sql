-- Add publish status for courses and syllabus
-- Run this to enable publish/draft functionality

-- Add is_published column to courses
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Add published_at timestamp
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Add index for querying published courses
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);

-- Update existing courses to be unpublished by default
UPDATE courses SET is_published = false WHERE is_published IS NULL;

COMMENT ON COLUMN courses.is_published IS 'Whether the syllabus is published and visible to students';
COMMENT ON COLUMN courses.published_at IS 'When the syllabus was published';

