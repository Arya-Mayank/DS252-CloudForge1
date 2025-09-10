```
# **Project Requirements Document (PRD)**

## **AI-Powered LMS Module**

| **Field** | **Details** |
| --- | --- |
| **Project Title** | AI-Powered Learning Management System (LMS) Module |
| --- | --- |
| **Team** | Mayank Arya, Sakshi Chhabra, Ghanshyam Dhamat, Sandeep Kumar |
| --- | --- |
| **Document Version** | 1.0 |
| --- | --- |
| **Date** | September 8, 2025 |
| --- | --- |

### **1\. Problem Statement**

Educators and students using traditional Learning Management Systems face significant challenges. Professors often spend significant time on administrative tasks such as creating varied assessments, yet lack data-driven insights into classroom-wide weaknesses. This administrative burden limits their ability to focus on high-impact teaching activities.

For students, the learning experience is often generic and one-size-fits-all. They lack personalized feedback, struggle to identify their specific knowledge gaps, and receive study materials that are not tailored to their unique learning needs. This results in inefficient studying and disengagement. Our project aims to solve these problems by introducing an intelligent layer on top of existing LMS platforms (like Moodle) that automates content structuring, generates personalized assessments, and provides adaptive learning paths.

### **2\. Objectives & Goals**

The primary objective is to develop a Moodle plugin which leverages AI to streamline teaching and learning by automating exam evaluation, generating personalized feedback, and assisting educators in creating question banks aligned with the course curriculum. The system adapts to each student’s level of understanding, highlights mistakes, and provides corrective guidance, while also reducing instructor workload through intelligent question bank generation.

**Goals:**

- **For Professors:** Reduce the time and effort required to create course assessments. Provide insights into class-wide and individual student weaknesses.
- **For Students:** Deliver a personalized learning journey and targeted study recommendations, using feedback from assessment quizzes to improve learning outcomes.
- **For the System:** Create a scalable, secure, and integrable module that can eventually be plugged into mainstream LMS platforms like Moodle.

### **3\. User Personas**

- **Dr. Anya Sharma (The Professor):**
- **Bio:** A university professor with 15 years of experience. She is passionate about her subject but often overwhelmed by the administrative workload for her class of 100+ students.
- **Goals:** Wants to create an engaging course, easily assess student understanding, and provide timely, constructive feedback without spending weekends creating quizzes and evaluating them.
- **Frustrations:** Designing a diverse set of exam questions that covers the entire syllabus is time-consuming and challenging.
- **Rohan Verma (The Student):**
- **Bio:** A university student who is diligent but struggles with certain abstract concepts in his courses.
- **Goals:** Wants to understand his weak points and find the right resources to improve. Wants to deepen his understanding of the course topics.
- **Frustrations:** Feels lost when study material is generic. Doesn't know what he doesn't know.

### **4\. User Pain Points**

| **Persona** | **Pain Point** |
| --- | --- |
| **Professor** | **Difficult Assessment Creation:** Generating high-quality, varied quizzes and exams that effectively test understanding is challenging and time-intensive. |
| --- | --- |
|     | **Lack of Insight:** Getting a clear, data-driven overview of what the whole class is struggling with is challenging. |
| --- | --- |
| **Student** | **Impersonal Feedback:** Receives generic grades with little to no guidance on _why_ an answer was wrong or how to improve. |
| --- | --- |
|     | **Inefficient Studying:** Wastes time re-reading entire chapters instead of focusing on specific areas of weakness. |
| --- | --- |
|     | **No Progress Visibility:** Lacks a clear, historical view of their learning journey, including past mistakes and improvements. |
| --- | --- |

### **5\. Core Features**

**FC-01: AI-Powered Course Assessment Generation**

- Professors can upload course materials (PDF, DOCX, TXT, or raw text).
- The LLM analyzes the content and generates a draft syllabus structured by topics and subtopics.
- Professors can review, edit (add, remove, rephrase), and finalize the syllabus in an intuitive UI.
- The final syllabus is stored in a structured format (JSON) in the database.

**FC-02: Automated Assessment Generation \[ALGORITHM?\]**

- Based on the finalized syllabus, the LLM generates multiple-choice quizzes and short-answer conceptual questions for any topic or subtopic.
- Professors can request a specific number of questions of a certain type for a given topic.

**FC-03: Adaptive Student Learning Review Module**

- Based on performance, the system immediately identifies areas of weakness.

**FC-04: Personalized Study Recommendations (RAG)**

- Upon identifying a weakness, the system uses Retrieval-Augmented Generation (RAG) to scan the uploaded course materials and recommend specific sections, paragraphs, or concepts for the student to review.
- Maintains a conversation history (in case of short-answer questions) for each student, allowing for context-aware follow-up questions and progress tracking.

**FC-05: Professor Analytics & Custom Exam Creation**

- A dashboard for professors to view class-wide performance analytics, highlighting commonly misunderstood topics.
- Professors can request the system to generate a custom exam for a specific set of topics.
- The LLM analyzes interaction data across all students to design a balanced exam—combining quizzes and short-answer questions—that not only addresses common areas of weakness but also ensures coverage of the curriculum.

### **6\. Assumptions & Non-Goals (Extended Features)**

**Assumptions:**

- Professors will provide reasonably well-structured and relevant course content.
- The chosen LLM is capable of understanding academic content and generating relevant questions.

**Non-Goals (Out of Scope for this Project):**

- User management and authentication (we will assume a pre-authenticated state for users). \[Handled by Moodle\]
- Support for videos to generate an assessment/ course outline.
- The scope of this project is not focused on training or fine-tuning LLMs.

### **7\. Functional Requirements**

| **ID** | **User Story** |
| --- | --- |
| **FR-01** | As a Professor, I want to upload a document so that the system can auto-generate a syllabus. |
| --- | --- |
| **FR-02** | As a Professor, I want to edit and save the generated syllabus. |
| --- | --- |
| **FR-03** | As a Professor, I want to request 10 MCQs for "Topic 3.1", so I can create an evaluation quiz. |
| --- | --- |
| **FR-04** | As a Student, after answering a question incorrectly in the submitted assessment quiz, I want the system to show me the correct answer and suggest relevant study material. |
| --- | --- |
| **FR-05** | As a student, I want to review the weak areas identified in my submitted assessments so that I can focus on improving them. |
| --- | --- |
| **FR-06** | As a Professor, I want to view a dashboard showing the top 5 most difficult topics for my class. |
| --- | --- |
| **FR-07** | As a professor, I want to generate a final exam for Topics 1–5 so that the system can create a balanced mix of questions that reflects student performance while ensuring full coverage of the specified topics. |
| --- | --- |

###

### **8\. Non-Functional Requirements**

| **ID** | **Requirement** | **Metric/Description** |
| --- | --- | --- |
| **NFR-01** | **Performance** | The system should generate a 100-page syllabus in about 10 minutes, depending on the content volume, while quizzes must be created within 5 minutes. Additionally, page load times should remain under 2 seconds. |
| --- | --- | --- |
| **NFR-02** | **Scalability** | The system should support 100 concurrent users (1 professor, 99 students) without performance degradation. |
| --- | --- | --- |
| **NFR-03** | **Availability** | The system must have 95% uptime. |
| --- | --- | --- |
| **NFR-04** | **Usability** | The user interface should be intuitive and require minimal training for both professors and students. |
| --- | --- | --- |
| **NFR-05** | **Security** | All user data must be encrypted at rest and in transit. Implement safeguards against prompt injection and unauthorized access. |
| --- | --- | --- |
| **NFR-06** | **Extensibility** | The architecture should be modular to allow for future integration with other LMS platforms. |
| --- | --- | --- |

### **9\. Proposed Architecture & Technology Stack**

### **System Architecture & Technology Stack**

The system will be designed as a Moodle plugin that communicates with a separate, containerized backend microservice responsible for all AI processing. This decouples the AI logic from the Moodle monolith, allowing for independent scaling, updating, and maintenance.

#### **1.1. Architectural Diagram**

**Flow Description:**

1. **Professor/Student Interaction:** The user interacts with the plugin's UI within the Moodle environment (built with Moodle's PHP framework and a modern JavaScript library for dynamic components).
2. **API Gateway:** All requests from the Moodle plugin are routed through an API Gateway to the AI Backend Service. This gateway handles request authentication (via API keys/JWTs), rate limiting, and routing.
3. **AI Backend Service (Python/FastAPI):** This is the core of the application. It exposes RESTful API endpoints for specific tasks (e.g., /generate-syllabus, /get-quiz, /rag-recommendation).
4. **Content Parsing & Chunking:** When a professor uploads a document, the backend uses the unstructured.io library (as seen in the reference repository) to parse the content. The text is then split into smaller, semantically relevant chunks.
5. **Embedding & Vector Storage:** These chunks are converted into vector embeddings using a sentence-transformer model. The embeddings and their corresponding text are stored in a **Milvus** vector database.
6. **LLM Interaction:** For tasks like syllabus generation, question creation, or RAG-based recommendations, the backend service formats a prompt and sends it to a powerful LLM (e.g., OpenAI's GPT-4 or Anthropic's Claude 3) via its API.
7. **Data Storage:** Structured data (syllabus, question banks, and user performance) is stored in a PostgreSQL database. Raw uploaded documents are stored in an S3-compatible object store.

| **Component** | **Category** | **Technology Choice** | **Purpose & Justification** |
| --- | --- | --- | --- |
| **Moodle Plugin** | **Core Language** | **PHP 8.x** | Required by the Moodle platform. We will use Moodle Core APIs for file handling, DB abstraction (DBAL), authentication, and capabilities. |
| --- | --- | --- | --- |
|     | **Frontend UI** | **React.js** + **Moodle Renderer API** | Mounts a modern React app within Moodle's PHP templates to provide the fast, intuitive UI (NFR-04) needed for the syllabus editor and analytics dashboard. |
| --- | --- | --- | --- |
| **AI Microservice** | **Language & Framework** | **Python 3.11+** with **FastAPI** | High-performance, asynchronous framework ideal for AI workloads. Aligns with modern Python-based AI frameworks. |
| --- | --- | --- | --- |
|     | **Async Task Queue** | **Celery** with **Redis Broker** | Handles long-running processes, such as document ingestion and exam generation, asynchronously, ensuring the user interface remains responsive. |
| --- | --- | --- | --- |
|     | **LLM API** | **OpenAI API (GPT-4o)** | Chosen for its superior reasoning and generation capabilities. The RAG architecture is flexible and can accommodate other models if needed. |
| --- | --- | --- | --- |
|     | **Embedding Model** | **BAAI General Embedding (bge-large-en-v1.5)** | A powerful, high-performance embedding model from the RAG-Anything framework, offering superior semantic understanding of academic texts. |
| --- | --- | --- | --- |
|     | **AI Orchestration** | **"RAG-Anything" Framework** | Adopting this framework's core pipeline provides a pre-built, optimized system for document parsing, chunking, embedding, and retrieval. |
| --- | --- | --- | --- |
| **Databases & Storage** | **Primary Database** | **PostgreSQL 15+** | The main Moodle database. Our plugin will create its own custom tables within this DB, inheriting Moodle's schema rules. |
| --- | --- | --- | --- |
|     | **Vector Database** | **Milvus** | Adopted from the RAG-Anything stack, Milvus is a highly scalable, production-grade vector database designed for massive-scale similarity search. |
| --- | --- | --- | --- |
|     | **Cache & Broker** | **Redis** | Serves as a caching layer for expensive queries (like analytics) and as the message broker for the Celery task queue. |
| --- | --- | --- | --- |
|     | **File Storage** | **Moodle “Moodledata” Directory** | Utilizes the Moodle File API to store all uploaded professor documents securely within Moodle’s native file system. |
| --- | --- | --- | --- |

### **10\. Data Management & Storage**

- **PostgreSQL Schema:**
  - Courses: Stores information about each course, linking to Moodle's course ID.
  - Syllabus: Stores the structured syllabus as a JSONB object for each course.
  - Question Bank: Stores generated questions (MCQs, short answers), linked to syllabus topics, with metadata (type, difficulty).
  - StudentAttempts: Logs student answers, scores, and timestamps for each question.
  - AnalyticsCache: Stores pre-aggregated analytics data for the professor's dashboard to ensure fast load times.
- **Milvus Collections:**
  - A separate collection will be created for each course (e.g., collection_name="course_123"). This isolates the RAG context and ensures that recommendations for one course do not pull from another's materials.
- **AWS S3:**
  - A bucket will be used to store all uploaded raw documents. The file path will be referenced in the Courses table. This prevents bloating the primary database.

### **11\. Security & Privacy**

- **Authentication:** Handled entirely by Moodle. The plugin will leverage Moodle's existing session management. Communication between the plugin and the backend service will be secured using short-lived JWTs or a static API key stored securely in Moodle's configuration.
- **Authorization:** The backend service will enforce role-based access control (RBAC). API endpoints will be protected to ensure students cannot access professor-only data (like class-wide analytics) and can only view their own performance data.
- **Data Encryption:** All data will be encrypted in transit using TLS 1.3. Data at rest will be encrypted using native database encryption (e.g., AWS KMS for PostgreSQL and S3).
- **Prompt Injection:** All user-facing inputs that are passed to the LLM will be sanitized. System prompts will be carefully engineered to constrain the LLM's scope and prevent malicious or unintended behavior.
- **API Key Management:** The API key for the LLM provider will be stored in a secure secrets manager (e.g., AWS Secrets Manager) and will never be hardcoded in the application.
- **Privacy:** Student performance data will be anonymized when aggregated for class-wide analytics to protect individual student privacy.

### **12\. Cloud Deployment & Operations**

- **Source Control:** Git, hosted on GitHub.
- **CI/CD Pipeline:** GitHub Actions.
    1. **On Push/PR to main branch:**
    2. **Lint & Test:** Run linters (ruff, black) and unit tests (pytest).
    3. **Build Docker Image:** Build the FastAPI backend into a Docker image.
    4. **Push to Registry:** Push the image to a container registry (e.g., Amazon ECR).
    5. **Deploy:** Automatically trigger a deployment of the new image to the AWS Fargate service.
- **Infrastructure as Code (IaC):** AWS CDK or Terraform will be used to define and manage all cloud resources (Fargate, RDS, S3), ensuring reproducibility and easy setup.
- **Monitoring & Logging:**
  - **AWS CloudWatch:** For collecting logs from the FastAPI application and monitoring resource utilization (CPU, Memory).
  - **Health Checks:** A health endpoint on the FastAPI service will be used by Fargate to monitor application health and automatically restart unhealthy containers.
  - **Alarms:** CloudWatch Alarms will be set to notify the team of high error rates or if the service becomes unavailable, ensuring the 95% uptime requirement (NFR-03).

### **13\. Acceptance Criteria**

The project will be considered complete when all core features (FC-01 to FC-05) are implemented, tested, and meet the defined functional and non-functional requirements. A final presentation must demonstrate the end-to-end workflow for both the professor and student personas successfully.

| **ID** | **User Story** | **Acceptance Criteria (Gherkin Format)** |
| --- | --- | --- |
| **FR-01** | As a Professor, I want to upload a document so that the system can auto-generate a syllabus. | **Given** that I am a Professor, I am logged into my course page. **When** I navigate to the "AI Module" activity and upload a 50-page PDF document. **And** I click "Generate Syllabus". **Then** the system should display a loading indicator. **And** within ~10 minutes (NFR-01), I should see a draft syllabus based on the document's content. |
| --- | --- | --- |
| **FR-02** | As a Professor, I want to edit and save the generated syllabus. | **Given** that I have a generated draft syllabus (from FR-01). **When** I click the "Edit" button. **And** I changed the title of "Topic 1.1" and deleted "Topic 2.3". **And** I click "Save Syllabus". **Then** the system should confirm the save. **And** the changes must be persisted in the database. |
| --- | --- | --- |
| **FR-03** | As a Professor, I want to request 10 MCQs for "Topic 3.1". | **Given** that I have a finalized syllabus for my course. **When** I navigate to the "Assessment Generator". **And** I select "Topic 3.1", type "Multiple Choice", and quantity "10".**And** I click "Generate". **Then,** within an average of ~5 minutes (NFR-01), the UI should display the requested number of MCQs, each with 4 options and the correct answer indicated. |
| --- | --- | --- |
| **FR-04** | As a Student, after answering incorrectly, I want suggested study material. | **Given** that I am a Student reviewing my submitted assessment quiz. **And** I answered a question incorrectly. **Then** the system must show me the correct answer and flag the topic as one of my weak areas. **And** display a "Study Recommendation" section with a 1-2 paragraph explanation referencing the course materials (RAG). |
| --- | --- | --- |
| **FR-05** | As a student, I want to deepen my understanding | **Given** that I am a Student who has answered some questions correctly. **When** I navigate to my "AI Module" dashboard. **Then** I should see questions of higher difficulty (topic-wise) |
| --- | --- | --- |
| **FR-06** | As a Professor, I want to view a dashboard showing the top 5 most difficult topics. | **Given** that at least 20 students have taken the assessment quiz. **When** I open the "Analytics Dashboard". **Then** I must see a chart or list displaying the "Top 5 Misunderstood Topics" for the entire class. |
| --- | --- | --- |
| **FR-07** | As a professor, I want to generate a final exam for Topics 1–5. | **Given** that I am on the "Assessment Generator" page. **When** I select "Topics 1-5" and request a "Final Exam (50 questions)". **Then** the system should generate a balanced exam that includes questions specifically targeting the class-wide weaknesses identified in the analytics dashboard, as well as complete course syllabus coverage. |
| --- | --- | --- |

### **14\. Testing Plan**

- **Unit Testing:** pytest will be used to test individual functions in the Python backend (e.g., text chunking logic, database interactions, API endpoint logic). Target code coverage: >80%.
- **Integration Testing:** Tests will verify the interactions between the backend service, PostgreSQL, and Milvus. For example, testing if uploading a document correctly results in embeddings being stored.
- **Performance Testing:** locust.io will be used to simulate 100 concurrent users interacting with the system to ensure response times and resource usage remain within acceptable limits (NFR-01, NFR-02).

### **15\. Workflow**

**Professor Workflow:**

1. **Login** -> **Dashboard**
2. **Upload Content:** Uploads the course PDF.
3. **Generate Syllabus:** Clicks "Generate" and waits for the AI.
4. **Review & Edit:** Modifies the draft syllabus in the UI.
5. **Finalize:** Saves the final syllabus.
6. **Create Exam:** Selects topics and requests a final exam.
7. **Monitor Progress:** Views the analytics dashboard to see student performance.

**Student Workflow:**

1. **Login** -> **Dashboard**
2. **Attempt Quiz:** Submit the attempted assessment quiz posted by the Professor.
3. **Get Feedback:** If a student's answer is incorrect, the system provides the correct solution, a detailed explanation, and a relevant link or snippet from the study material. Conversely, if the answer is correct, the system challenges them with a more difficult question on the same topic.

### **16\. Success Metrics**

| **Goal Category** | **Metric** | **Target** |
| --- | --- | --- |
| **Professor Efficiency** | **Time to Create Quiz:** Average time taken from topic selection to a finalized quiz. | < 5 minutes. |
| --- | --- | --- |
|     | **Adoption Rate:** % of professors using the feature to generate exams. | \> 40% of active professors on the platform. |
| --- | --- | --- |
| **Student Outcome** | **Performance Improvement:** Average student score improvement on topics after using RAG recommendations. | \> 10% score increase on re-attempts. |
| --- | --- | --- |
|     | **Engagement:** Click-through rate on personalized study recommendations. | \> 60% |
| --- | --- | --- |
| **System Performance** | **API Latency:** P95 response time for core API endpoints. | < 2s for non-generative, < 30s for generative tasks. |
| --- | --- | --- |
|     | **Uptime:** System availability. | ~95% |
| --- | --- | --- |

### **17\. Weekly Milestones & Team Responsibilities**

- **Team Members:**  
    A: Ghanshyam  
    B: Sandeep  
    C: Mayank  
    D: Sakshi

| **Week** | **Dates** | **Milestone & Goal** | **Key Tasks** | **Responsibilities** |
| --- | --- | --- | --- | --- |
| **1** | Sep 12 - Sep 19 | **Project Kickoff & Foundation** (10%) | \- Finalize tech stack & architecture.<br><br>\- Set up GitHub repo, deploy boilerplate FastAPI service.<br><br>\- Create basic Moodle plugin shell. | **A, B:** Backend: Github Repo, FAST API setup<br><br>**C, D:** Moodle plugin shell. |
| --- | --- | --- | --- | --- |
| **2** | Sep 20 - Sep 26 | **Core Parsing & Embedding** (25%) | \- Implement document upload endpoint (FC-01).<br><br>\- Integrate unstructured.io for parsing.<br><br>\- Set up basic RAG pipeline.<br><br>\- Implement embedding and storage logic. | **A, B:** Backend Parsing/Embedding. **C, D:** UI for document upload |
| --- | --- | --- | --- | --- |
| **3** | Sep 27 - Oct 3 | **Syllabus Generation & UI** (45%) | \- Implement syllabus generation logic via LLM (FC-01).<br><br>\- Design and build the interactive syllabus editor UI in React/Vue.<br><br>\- Connect UI to backend API.<br><br>(FC-02).<br><br>\- Build professor UI to request questions. | **A.B :** LLM Integration,<br><br>Syllabus API.<br><br>**C, D:** Syllabus Editor UI |
| --- | --- | --- | --- | --- |
| **4** | Oct 4 - Oct 10 | **Midterm Review Prep** (67%) | \- Complete RAG pipeline for study recommendations (FC-04).<br><br>\- Develop student-facing quiz UI. - Integrate and test the full syllabus-to-RAG flow. | **A, B:** RAG Backend. **C, D:** Student Quiz UI. **All:** Integration & Testing |
| --- | --- | --- | --- | --- |
| **5** | Oct 11 - Oct 17 | **Assessment Generation** (75%) | \- Implement automated assessment generation (MCQs & short-answer) for any syllabus topic | **A:** LLM Question Gen.<br><br>**B:** Question Bank DB/API.<br><br>**C, D:** Professor UI |
| --- | --- | --- | --- | --- |
| **6** | Oct 18 - Oct 24 | **Professor Analytics** (85%) | \- Implement data logging for student attempts.<br><br>\- Develop backend logic to aggregate analytics.<br><br>\- Build the professor analytics dashboard UI (FC-05). | **A, B:** Analytics Backend.<br><br>**C, D:** Dashboard UI |
| --- | --- | --- | --- | --- |
| **7** | Oct 25 - Oct 31 | **Custom Exam & Integration** (95%) | \- Implement custom exam generation logic (FC-05).<br><br>\- Full-system integration testing.<br><br>\- Begin performance and security testing. | **A:** Custom Exam, Logic.  <br>**B:** API Integration.<br><br>**C, D:** E2E Testing |
| --- | --- | --- | --- | --- |
| **8** | Nov 1 - Nov 7 | **Final Submission & Polish** (100%) | \- Finalize all features, fix all P0/P1 bugs.<br><br>\- Conduct thorough E2E, performance, and usability testing.<br><br>\- Prepare documentation and final presentation. | **All:** Testing, Bug Fixing, Documentation |
| --- | --- | --- | --- | --- |
```
