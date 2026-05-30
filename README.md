# SmartHire

## About Project
SmartHire is a simple, modern, and professional Resume Screening & Candidate Ranking web application. It allows recruiters to upload candidate resumes, input job descriptions, automatically extract key profiles, calculate matching scores based on skills, experience, and education, and rank candidates from best to worst on an interactive results dashboard.

---

## Features
*   **Resume Upload**: Upload single or multiple candidate resumes in PDF, DOC, or DOCX formats.
*   **Job Description Input**: Define job profiles manually with target skills, minimum experience, and required education.
*   **Resume Screening**: Automatically parse uploaded resumes to extract skills, contact details, education history, and work experience.
*   **Candidate Ranking**: Standardize candidates using a deterministic scoring engine that ranks profiles from best to worst.
*   **Results Dashboard**: Review candidates on an interactive leaderboard with detailed scores, profile strengths, and missing skills.
*   **CSV Export**: Download the candidate ranking leaderboard as a spreadsheet with one click.
*   **Authentication**: Secure recruiter authentication portal (registration, login, logout, and full account deletion).

---

## Technologies Used

### Frontend
*   **Next.js** (App Router)
*   **React**
*   **Tailwind CSS** (for styling)

### Backend
*   **Node.js**
*   **Express**

### Database
*   **MySQL** (Relational Database)

### ORM
*   **Prisma**

---

## Environment Variables

Create a `.env` file in the **`backend`** directory:
```env
PORT=5088
DATABASE_URL="mysql://username:password@localhost:3306/resume_screening_db"
JWT_SECRET="your-jwt-signing-secret"
```

Create a `.env` file in the **`frontend`** directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:5088/api"
```

---

## Installation

Follow these simple steps to run the project locally:

### 1. Pre-requisites
Ensure you have **Node.js** (v18+) and **MySQL Server** installed and running on your system.

### 2. Database Setup
Log into your MySQL terminal and create a new database:
```sql
CREATE DATABASE resume_screening_db;
```

### 3. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Prisma migrations to set up the database tables:
   ```bash
   npx prisma db push
   ```
4. Run the seed script to create a default admin recruiter account:
   ```bash
   npm run prisma:seed
   ```
5. Start the backend developer server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend developer server:
   ```bash
   npm run dev
   ```

Open **`http://localhost:3088`** in your browser. You can log in using the seed recruiter credentials:
*   **Email**: `admin@ats.com`
*   **Password**: `admin123`

---

## Project Structure

A simplified view of the folders in this repository:
```text
├── backend/
│   ├── prisma/             # Schema definitions and database seeds
│   └── src/
│       ├── controllers/    # API request handlers (auth, resumes, jobs, analysis)
│       ├── routes/         # Express endpoint definitions
│       ├── services/       # Resume parser and scoring algorithms
│       └── server.ts       # Application entry point
├── frontend/
│   └── src/
│       ├── app/            # Next.js pages, layouts, and styles
│       ├── components/     # Reusable components (e.g. Logo)
│       └── utils/          # API communication client
└── README.md               # Project documentation
```

---

## Future Improvements
*   **AI Parsing Engine**: Integrate Large Language Models (LLMs) for semantic and contextual candidate evaluation.
*   **File Previewer**: Render interactive resume PDF pages directly in the dashboard side-drawer.
*   **Multi-User Workspaces**: Support shared team pipelines and collaborative evaluation systems.
*   **Email Notifications**: Send automatic screening updates to hiring managers or candidates.
