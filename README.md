# DoodleOnMoodle LMS

AI-assisted learning management system for instructors and students. Professors can upload material, generate and update a Bloom’s taxonomy–aligned syllabus, create adaptive assessments, and review student performance. Students receive adaptive question delivery and rapid feedback with subjective answers evaluated asynchronously.

## Feature Highlights

- Instructor and student portals with JWT-based authentication.
- Intelligent syllabus generation and updates that respect instructor-selected Bloom’s taxonomy levels.
- AI-authored MCQ, MSQ, and subjective questions with UG/PG difficulty choices.
- Adaptive assessment engine that adjusts question difficulty/topic based on student performance.
- Background evaluation for subjective answers and quick grading of objective questions.
- Supabase-backed persistence with optional Azure integrations for AI, blob storage, and search (mock fallbacks available).

## Tech Stack

| Layer      | Technologies |
|------------|--------------|
| Frontend   | React 18, TypeScript, Vite, TailwindCSS, React Router, React Query |
| Backend    | Node.js, Express, TypeScript, Supabase (PostgreSQL), express-validator, multer |
| AI         | Azure OpenAI (mock mode supported), optional Azure Cognitive Search |
| Storage    | Azure Blob Storage (optional, mock mode supported) |

## Requirements

- Node.js 18+
- npm 9+
- Supabase project (or compatible PostgreSQL instance)
- Azure credentials (optional — mocked when missing)

## Quick Start

```bash
git clone https://github.com/Arya-Mayank/DS252-CloudForge1.git
cd DS252-CloudForge1

# Install dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Configure Environment Variables

Copy the provided examples and fill in values:

| File | Purpose |
|------|---------|
| `backend/.env.example` → `backend/.env` | Supabase, JWT, optional Azure services, server config |
| `frontend/.env.example` → `frontend/.env` | API base URL for the React app |

Backend variables include:

- `SUPABASE_URL`, `SUPABASE_KEY`
- `JWT_SECRET`, `JWT_EXPIRY`
- Optional Azure keys (`AZURE_OPENAI_*`, `AZURE_STORAGE_*`, `AZURE_SEARCH_*`)
- `FRONTEND_URL`, `PORT`

Frontend variables:

- `VITE_API_URL` (defaults to `http://localhost:5000/api` if omitted)

### Database Setup

1. Follow `database/README.md` for Supabase provisioning and run the SQL scripts in the `database/` folder (at minimum `schema.sql` plus Bloom/assessment migrations).
2. Ensure storage buckets are created if using Azure Blob Storage; otherwise the backend uses local `backend/uploads/` (ignored by git).

### Run the App

```bash
# In one terminal (backend)
cd backend
npm run dev

# In another terminal (frontend)
cd frontend
npm run dev
```

Access the UI at `http://localhost:5173`. The backend listens on `http://localhost:5000` by default and proxies API requests from Vite.

### Quality Checks

```bash
# Backend
cd backend
npm run lint
npm run build

# Frontend
cd frontend
npm run lint
npm run build
```

All linting and TypeScript builds run clean with the current configuration.

## Deployment Notes

- **Backend**: Build with `npm run build` and deploy the generated `dist/` (e.g., Azure App Service). Provide `.env` values via your host’s secret manager.
- **Frontend**: Run `npm run build` and deploy the `dist/` folder to Vercel, Netlify, or any static host. Set `VITE_API_URL` to the deployed API endpoint.
- **Supabase**: Load schema migrations and configure RLS policies suitable for production. The included schema enables RLS; adjust policies as needed.
- **Azure Services (optional)**: Provide credentials to activate real AI, blob storage, and search. Without them the system logs warnings and falls back to mock implementations so developers can experiment locally.

## Repository Structure

```
DS252-CloudForge1/
├── backend/
│   ├── src/
│   │   ├── config/          # Azure, JWT, Supabase configuration helpers
│   │   ├── controllers/     # Express route handlers
│   │   ├── middleware/      # Auth middleware and validators
│   │   ├── models/          # Supabase data access logic
│   │   ├── routes/          # API route definitions
│   │   └── services/        # Azure OpenAI/Search/Blob service wrappers
│   └── uploads/             # Local storage bucket (git keeps folder only)
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios clients for backend endpoints
│   │   ├── components/      # Shared UI building blocks
│   │   ├── pages/           # Instructor & student route entries
│   │   ├── hooks/           # Auth/context hooks
│   │   ├── styles/          # Tailwind entrypoints
│   │   └── types/           # Shared TypeScript interfaces
├── database/                # SQL schema and migration scripts
└── docs/                    # Supplemental product documentation
```

## Troubleshooting

- **Azure credentials missing**: backend runs in mock mode. Add keys to enable real AI generation.
- **Supabase connection failures**: verify `SUPABASE_URL` and `SUPABASE_KEY`, and ensure the schema from `database/` has been applied.
- **Uploads directory missing**: the repository ships with `backend/uploads/.gitkeep`; ensure your deployment target preserves the folder or configure Azure Blob Storage.
- **Frontend cannot reach API**: confirm `VITE_API_URL` points to the backend (Vite dev server proxies `/api` to `http://localhost:5000`).

---

Maintained for DS252 adaptive learning research. Contributions and issue reports are welcome.
