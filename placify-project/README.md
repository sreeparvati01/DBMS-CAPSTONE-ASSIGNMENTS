########DEPLOYED LINK OF PLACIFY - https://placify-rxji.onrender.com
# PLACIFY — College Placement Management & Recruitment System

### Connecting Talent. Shaping Futures.

PLACIFY is a full-stack College Placement Management and Recruitment System designed to simplify and streamline the campus recruitment process. It provides a centralized platform where students can manage their placement profiles, explore job opportunities, apply for placement drives, and track their recruitment journey.

The system also enables placement administrators to manage companies, students, job openings, applications, interviews, and placement records through a dedicated dashboard.

---

## Overview

PLACIFY aims to digitize the traditional college placement process by bringing students, companies, and placement administrators together on a single platform.

It offers structured placement management, centralized data handling, role-based access, and recruitment tracking to make campus placements more organized and efficient.

## Key Features

### Student Portal
- Secure student login and authentication.
- Student profile management.
- Browse available companies and job openings.
- View placement drives and eligibility details.
- Apply for suitable job opportunities.
- Track application status.
- View interview schedules and placement updates.

### Administrator Dashboard
- Centralized placement management.
- Manage student records and academic departments.
- Add and manage recruiting companies.
- Create and manage placement drives.
- Publish and manage job openings.
- Monitor student applications.
- Schedule and track interviews.
- Maintain placement and selection records.
- Import institutional data using CSV files.

### Database Management
- Structured relational database design.
- Normalized database schema.
- Primary key and foreign key constraints.
- Relationship management between students, companies, drives, and applications.
- SQLite database integration.
- Complete MySQL 8.0+ schema for database implementation and analysis.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React.js, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | SQLite |
| Relational Database Schema | MySQL 8.0 |
| Database Tool | MySQL Workbench |
| Development Environment | Visual Studio Code |
| Version Control | Git & GitHub |

---

## Project Architecture

```text
PLACIFY
│
├── Frontend
│   ├── React.js
│   ├── Vite
│   └── Tailwind CSS
│
├── Backend
│   ├── Node.js
│   └── Express.js
│
├── Database
│   ├── SQLite
│   └── MySQL Schema
│
└── Datasets
    ├── Companies
    ├── Students
    ├── Placement Drives
    ├── Job Openings
    ├── Applications
    ├── Interviews
    └── Placements
```

---

## Database Design

PLACIFY includes a complete relational database schema containing **9 normalized tables**.

| Table | Description |
|---|---|
| departments | Academic department details |
| users | Login credentials and user roles |
| students | Student academic and profile information |
| companies | Recruiting company information |
| placement_drives | Placement drive details |
| job_openings | Available job opportunities |
| applications | Student job applications |
| interviews | Interview schedules and details |
| placements | Final placement and selection records |

**MySQL Schema Location:**

`database/mysql_schema.sql`

The SQL script is compatible with MySQL 8.0+ and can be executed using MySQL Workbench.

---

## Installation & Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Visual Studio Code
- MySQL Workbench (optional, for MySQL schema execution)

### Step 1: Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### Step 2: Open the Project

```bash
cd PLACIFY
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start the Development Server

```bash
npm run dev
```

### Step 5: Open in Browser

```text
http://localhost:3000
```

The frontend and backend development environment will start together.

---

## Login Credentials

The application initializes an administrator account and imports the institutional CSV datasets during its first startup.

### Administrator / Placement Officer

| Field | Credentials |
|---|---|
| Email | admin@placify.edu |
| Password | Admin@123 |

### Student Portal

Example student account:

| Field | Credentials |
|---|---|
| Email | aarav.sharma@placify.edu |
| Password | Student@123 |

Additional CSV records can be imported through the Administrator Dashboard.

---

## Institutional Datasets

The project includes sample institutional datasets for:

- Companies
- Students
- Placement Drives
- Job Openings
- Applications
- Interviews
- Placements

These datasets help initialize and demonstrate the placement management workflow.

---

## Project Objectives

1. Digitize and simplify the college placement process.
2. Provide a centralized platform for students and placement administrators.
3. Maintain structured records of companies and recruitment activities.
4. Improve transparency in application and interview tracking.
5. Implement relational database concepts through a practical full-stack application.
6. Demonstrate the integration of frontend, backend, and database technologies.

---

## Future Enhancements

- AI-based job and student matching.
- Automated email and notification services.
- Advanced placement analytics and reports.
- Resume analysis and skill-based recommendations.
- Improved recruitment insights for placement administrators.

---

## Conclusion

PLACIFY demonstrates how modern web technologies and relational database management concepts can be combined to build a practical college placement management solution.

By connecting students, recruiters, and placement administrators through a centralized system, PLACIFY aims to make campus recruitment more structured, accessible, and efficient.

---

**Project Name:** PLACIFY

**Project Type:** Full-Stack Web Application

**Domain:** College Placement Management & Recruitment

**Tagline:** Connecting Talent. Shaping Futures.

