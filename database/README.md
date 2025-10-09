# Database Setup Guide

## Supabase Setup

1. **Create a Supabase Project**
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up/login and click "New Project"
   - Choose your organization
   - Enter project name: `doodleonmoodle`
   - Set a strong database password
   - Choose a region close to you
   - Click "Create new project" and wait for provisioning (~2 minutes)

2. **Get Your Credentials**
   - Go to Settings > API
   - Copy the **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - Copy the **anon/public key** (under "Project API keys")
   - Add these to your backend `.env` file:
     ```
     SUPABASE_URL=your_project_url
     SUPABASE_KEY=your_anon_key
     ```

3. **Run the Schema**
   - Go to SQL Editor in Supabase dashboard
   - Click "New Query"
   - Copy the contents of `schema.sql` and paste it
   - Click "Run" to execute
   - You should see "Success. No rows returned"

4. **Verify Tables**
   - Go to Table Editor
   - You should see: users, courses, enrollments, assessments, questions, results, embeddings
   - All tables should have the proper columns and relationships

## Row Level Security (RLS)

The schema enables RLS by default for security. For development with JWT tokens:

Option 1: Use service_role key (not recommended for production)
Option 2: Configure RLS policies for your auth strategy
Option 3: Temporarily disable RLS for development:

```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE results DISABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings DISABLE ROW LEVEL SECURITY;
```

## Schema Overview

### Tables

- **users**: Stores user accounts (instructors and students)
- **courses**: Course information with instructor ownership
- **enrollments**: Many-to-many relationship between students and courses
- **assessments**: Quizzes/exams belonging to courses
- **questions**: Individual questions for each assessment
- **results**: Student attempts and scores for assessments
- **embeddings**: Document chunks for RAG (Phase 2)

### Key Relationships

```
users (instructor) -> courses (one-to-many)
users (student) -> enrollments -> courses (many-to-many)
courses -> assessments (one-to-many)
assessments -> questions (one-to-many)
users (student) + assessments -> results (one-to-many)
courses -> embeddings (one-to-many)
```

## Sample Data (Optional)

To test the application, you can insert sample data:

```sql
-- Insert a test instructor
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES ('instructor@test.com', '$2a$10$example', 'instructor', 'John', 'Doe');

-- Insert a test student
INSERT INTO users (email, password_hash, role, first_name, last_name)
VALUES ('student@test.com', '$2a$10$example', 'student', 'Jane', 'Smith');
```

Note: Use the actual bcrypt hash from your auth system for real passwords.

## Phase 2: Enable Vector Embeddings (Optional)

If you want to use semantic search with embeddings in Phase 2:

1. **Enable pgvector extension** in Supabase SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. **Upgrade the embeddings table**:
```sql
-- Add vector column
ALTER TABLE embeddings ADD COLUMN embedding VECTOR(1536);

-- Optionally remove the TEXT column
ALTER TABLE embeddings DROP COLUMN embedding_data;

-- Add index for fast similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

3. Update backend code to use proper vector operations

