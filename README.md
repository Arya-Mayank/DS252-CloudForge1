# DoodleOnMoodle LMS – Production (Azure Cloud)

This branch (`prod`) captures all the work required to run DoodleOnMoodle as a cloud-native system on the Azure stack. The main branch documents the local development setup; this README explains how we hardened the app for production, the Azure services in use, and the deployment flow.

---

## 1. Stabilize the codebase

- Improved instructor UX (unenroll, Quick Actions) and added safe file-name handling for uploads.
- Enabled remote file parsing so Azure Blob–hosted materials can feed syllabus generation.
- Added `backend/.env.example` and updated `.gitignore` so secrets never enter git history.

## 2. Prepare Azure infrastructure

- **Azure Blob Storage** (`ds252` account, `course-files` container) stores course materials. Files get SAS URLs so students and instructors can download from anywhere.
- **Supabase** remains the database. We applied `database/schema.sql` and disabled RLS (or used the service-role key) so the API can insert users.
- **Azure OpenAI** powers syllabus and assessment generation; credentials are injected via App Service settings.
- **Azure Container Registry (ACR)** (`ds252acr`) hosts the backend Docker image.
- Filed quota requests to enable **Linux App Service** (B1) in East US (default quota was 0).

## 3. Containerize & deploy backend

1. Build the backend container:
   ```bash
   cd backend
   docker build -t lms-backend .
   docker tag lms-backend ds252acr.azurecr.io/lms-backend:prod
   docker push ds252acr.azurecr.io/lms-backend:prod
   ```
2. Create the App Service plan and web app:
   ```bash
   az appservice plan create --name ds252-plan --resource-group ds252-prod-rg --sku B1 --is-linux
   az webapp create --name ds252-backend-api --resource-group ds252-prod-rg \
     --plan ds252-plan \
     --deployment-container-image-name ds252acr.azurecr.io/lms-backend:prod
   ```
3. Configure container registry credentials and environment variables:
   ```bash
   az acr credential show --name ds252acr  # copy username/password

   az webapp config container set \
     --name ds252-backend-api \
     --resource-group ds252-prod-rg \
     --docker-custom-image-name ds252acr.azurecr.io/lms-backend:prod \
     --docker-registry-server-url https://ds252acr.azurecr.io \
     --docker-registry-server-user <acr-user> \
     --docker-registry-server-password <acr-pass>

   az webapp config appsettings set \
     --name ds252-backend-api \
     --resource-group ds252-prod-rg \
     --settings \
       "SUPABASE_URL=https://aqbupmzmwtdqpxwcmfcn.supabase.co" \
       "SUPABASE_KEY=<supabase-service-role-key>" \
       "JWT_SECRET=<prod-secret>" \
       "FRONTEND_URL=https://polite-coast-0fbcbef1e.3.azurestaticapps.net" \
       "AZURE_OPENAI_ENDPOINT=https://ds252-project-resource.cognitiveservices.azure.com/" \
       "AZURE_OPENAI_KEY=<openai-key>" \
       "AZURE_OPENAI_DEPLOYMENT=gpt-5-mini" \
       "AZURE_OPENAI_API_VERSION=2024-12-01-preview" \
       "AZURE_STORAGE_CONNECTION_STRING=<connection-string>" \
       "AZURE_STORAGE_CONTAINER=course-files" \
       "AZURE_SEARCH_ENDPOINT=" \
       "AZURE_SEARCH_KEY=" \
       "AZURE_SEARCH_INDEX=course-embeddings"
   ```

4. Enable log streaming for troubleshooting:
   ```bash
   az webapp log config --name ds252-backend-api --resource-group ds252-prod-rg \
     --application-logging filesystem --level Information
   az webapp log tail --name ds252-backend-api --resource-group ds252-prod-rg
   ```

## 4. Deploy frontend

1. Set the production API URL (`frontend/.env.production`):
   ```
   VITE_API_URL=https://ds252-backend-api.azurewebsites.net/api
   ```
2. Build and deploy to Azure Static Web Apps:
   ```bash
   cd frontend
   npm install
   npm run build
   swa login
   swa deploy ./dist --app-name ds252-frontend --env production
   ```
3. Update the backend `FRONTEND_URL` setting whenever the static app domain changes to keep CORS aligned.

## 5. End-to-end verification

- Hit `https://ds252-backend-api.azurewebsites.net/health` to confirm API health.
- Log into the static site `https://polite-coast-0fbcbef1e.3.azurestaticapps.net`, upload materials, generate syllabi, and verify Azure Blob downloads via SAS links.
- Confirm Supabase functions (login, OTP) and AI workflows operate against the production resources.

---

## Azure services in play

- **Azure Blob Storage** – durable storage for course materials; SAS URLs allow secure downloads.
- **Azure Container Registry** – stores backend Docker images for App Service.
- **Azure App Service (Linux)** – runs the Node/Express API with auto-scaling and built-in monitoring.
- **Azure Static Web Apps** – globally caches the React frontend with HTTPS and CDN delivery.
- **Azure OpenAI** – generates syllabi and assessments via the GPT-5-mini deployment.
- **Azure CLI & Static Web Apps CLI** – used for scripting, deployment, and secret management.

## Key challenges & solutions

- **Supabase schema/RLS** – ran `database/schema.sql`, disabled RLS (or used service-role key) so the backend can insert records.
- **Secrets in git** – removed `.env` files from the repo and added `.env.example` for safe sharing.
- **Blob downloads** – added HTTP fetching + SAS generation so PDF parsing works in Azure rather than relying on local `uploads/`.
- **CORS** – update `FRONTEND_URL` each time the frontend domain changes to prevent blocked requests.
- **Quota limits** – requested Basic Linux vCPUs to create the App Service plan (default quota was 0).

---

## Live endpoints

- **Backend API:** `https://ds252-backend-api.azurewebsites.net`
- **Frontend:** `https://polite-coast-0fbcbef1e.3.azurestaticapps.net`
- **Storage & AI:** Azure Blob Storage (`ds252` account) + Azure OpenAI (ds252-project-resource)
- **Database:** Supabase (`aqbupmzmwtdqpxwcmfcn` project)

---

## Deployment commands reference

```bash
# Backend container
docker build -t lms-backend .
docker tag lms-backend ds252acr.azurecr.io/lms-backend:prod
docker push ds252acr.azurecr.io/lms-backend:prod

# Configure Web App container
az webapp config container set \
  --name ds252-backend-api \
  --resource-group ds252-prod-rg \
  --docker-custom-image-name ds252acr.azurecr.io/lms-backend:prod \
  --docker-registry-server-url https://ds252acr.azurecr.io \
  --docker-registry-server-user <acr-user> \
  --docker-registry-server-password <acr-pass>

# Deploy frontend
cd frontend
npm run build
swa deploy ./dist --app-name ds252-frontend --env production
```

---

The `prod` branch demonstrates the journey from a local prototype to a production-grade, cloud-native LMS with containerization, secure secret handling, blob-backed file storage, Azure OpenAI integration, and cross-origin security hardening. Use this as the reference for maintaining or replicating the live deployment. 
