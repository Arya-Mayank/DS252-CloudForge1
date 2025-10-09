# DoodleOnMoodle - AI-Powered Learning Management System

A modern, full-stack Learning Management System (LMS) with AI-powered features for automated syllabus generation, assessment creation, and personalized learning feedback.

## 🚀 Features

### Core Functionality
- **User Authentication**: JWT-based authentication with Instructor and Student roles
- **Course Management**: Create, manage, and publish courses with rich content
- **File Upload**: Support for PDF, DOCX, and text file uploads
- **Syllabus Generation**: AI-powered automated syllabus creation from uploaded materials
- **Assessment System**: Create and manage quizzes with multiple question types

### AI-Powered Features
- **Automated Syllabus Creation**: Generate structured syllabi with topics and subtopics from uploaded documents
- **Assessment Generation**: AI-powered creation of Multiple Choice, Multiple Select, and Subjective questions
- **Personalized Feedback**: AI-driven analysis of student performance with improvement recommendations
- **Challenge Questions**: Generate additional practice questions based on student performance

### Question Types
- **Multiple Choice Questions (MCQ)**: Single correct answer selection
- **Multiple Select Questions (MSQ)**: Multiple correct answers selection
- **Subjective Questions**: Open-ended text responses with AI evaluation

## 🛠️ Tech Stack

### Frontend
- **React.js** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** + **shadcn/ui** for styling
- **React Query** for state management
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **JWT** authentication with Passport.js
- **PostgreSQL** (Supabase) for database
- **Azure OpenAI** for AI features

### AI Integration
- **Azure OpenAI Service** (GPT-4o-mini)
- **REST API** integration for AI features
- **Mock mode** for development without Azure credentials

### Database
- **PostgreSQL** hosted on Supabase
- **Row Level Security (RLS)** for data protection
- **Materialized Views** for optimized analytics

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database (Supabase recommended)
- Azure OpenAI API key (optional for development)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/Arya-Mayank/DS252-CloudForge1.git
cd DS252-CloudForge1
```

### 2. Environment Setup

#### Backend Environment Variables
Create a `.env` file in the `backend/` directory:
```env
# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# JWT
JWT_SECRET=your_jwt_secret_key

# Azure OpenAI (Optional - uses mock mode if not provided)
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# Server
PORT=5000
NODE_ENV=development
```

#### Frontend Environment Variables
Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Database Setup

#### Option 1: Using Supabase (Recommended)
1. Create a new project on [Supabase](https://supabase.com)
2. Run the SQL scripts in the `database/` folder in this order:
   - `schema.sql` - Core database schema
   - `schema-topics.sql` - Topics and subtopics tables
   - `schema-assessments-fixed.sql` - Assessment system tables
   - `schema-publish.sql` - Publishing features

#### Option 2: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database named `doodleonmoodle`
3. Run the SQL scripts as mentioned above

### 4. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 5. Start Development Servers

#### Backend Server
```bash
cd backend
npm run dev
```
The backend will start on `http://localhost:5000`

#### Frontend Development Server
```bash
cd frontend
npm run dev
```
The frontend will start on `http://localhost:5173`

## 📚 Usage Guide

### For Instructors

#### 1. Course Creation
- Create a new course with title and description
- Upload course materials (PDF, DOCX, or text files)
- Generate AI-powered syllabus from uploaded content

#### 2. Syllabus Management
- Review and edit AI-generated syllabi
- Add, modify, or remove topics and subtopics
- Publish syllabus to make it visible to students

#### 3. Assessment Creation
- Create assessments from course syllabus
- Select topics and subtopics for questions
- Configure question types (MCQ, MSQ, Subjective)
- Generate AI-powered questions
- Review, edit, and publish assessments

#### 4. Student Management
- View enrolled students
- Monitor student progress and performance
- Access detailed analytics and insights

### For Students

#### 1. Course Access
- Browse available courses
- Enroll in courses
- View published syllabi and course materials

#### 2. Taking Assessments
- Start published assessments
- Answer multiple choice, multiple select, and subjective questions
- Submit answers and receive immediate feedback

#### 3. Performance Analysis
- View detailed performance breakdown
- Access AI-powered feedback and recommendations
- Get personalized learning suggestions
- Generate additional practice questions

## 🔧 Development

### Project Structure
```
DS252-CloudForge1/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # API route handlers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Authentication & validation
│   │   └── config/          # Configuration files
│   └── database/            # Database schemas and migrations
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── api/             # API client functions
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
├── database/                # Database schemas
└── docs/                    # Documentation
```

### Available Scripts

#### Backend Scripts
```bash
npm run dev          # Start development server with auto-reload
npm run build        # Build for production
npm run start        # Start production server
npm run dev:clean    # Clean start (kills existing processes)
```

#### Frontend Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Courses
- `GET /api/courses` - Get user's courses
- `POST /api/courses` - Create new course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

#### Assessments
- `GET /api/assessments/:id` - Get assessment with questions
- `POST /api/assessments` - Create new assessment
- `PUT /api/assessments/:id` - Update assessment
- `POST /api/assessments/:id/publish` - Publish assessment

#### Student Actions
- `POST /api/student/assessments/:id/start` - Start assessment
- `POST /api/student/assessments/:id/submit` - Submit assessment
- `GET /api/student/assessments/:id/results/:attemptId` - Get results

#### AI Features
- `POST /api/ai/syllabus/generate` - Generate syllabus
- `POST /api/ai/assessments/generate` - Generate questions
- `POST /api/ai/feedback/question` - Get AI feedback

## 🚀 Deployment

### Backend Deployment (Azure App Service)
1. Build the backend: `npm run build`
2. Deploy to Azure App Service
3. Set environment variables in Azure portal
4. Configure database connection

### Frontend Deployment (Vercel/Netlify)
1. Build the frontend: `npm run build`
2. Deploy to Vercel or Netlify
3. Set environment variables for API URL

### Database (Supabase)
- Use Supabase for production database
- Configure RLS policies for security
- Set up proper indexes for performance

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Instructor and Student role separation
- **Row Level Security**: Database-level access control
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Proper cross-origin resource sharing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the API documentation

## 🎯 Roadmap

### Phase 2 Features (Planned)
- Advanced analytics and reporting
- Real-time collaboration features
- Mobile application
- Advanced AI features (adaptive learning paths)
- Integration with external LMS systems

---

**Built with ❤️ by the DoodleOnMoodle Team**