# PLACIFY — College Placement Management & Recruitment System

**Tagline:** Connecting Talent. Shaping Futures.

PLACIFY is a full-stack College Placement Management and Recruitment System built with React, Vite, Tailwind CSS, Express.js, and SQLite (with a full MySQL 8 / MySQL Workbench schema included in `database/mysql_schema.sql`).

## Quick Start in VS Code

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the development server (Backend API + Frontend):**
   ```bash
   npm run dev
   ```
3. **Open in browser:**
   Visit `http://localhost:3000`

## Administrator Login & CSV Dataset Loading

On first startup, PLACIFY initializes the 6 academic departments, the Administrator account, and automatically imports the institutional CSV files from `datasets/` (`companies.csv`, `students.csv`, `drives.csv`, `jobs.csv`, `applications.csv`, `interviews.csv`, `placements.csv`) into SQLite (`placify.db`).

- **Administrator / Placement Officer Login:**
  - Email: `admin@placify.edu`
  - Password: `Admin@123`
- **Student Portal Login:**
  - Any student from `datasets/students.csv` (e.g. `aarav.sharma@placify.edu`)
  - Default password: `Student@123`
- **Uploading Additional CSV Data:**
  Sign in to the Admin Dashboard and click **Import CSV** in **Companies**, **Students**, **Job Openings**, **Applications**, or **Placements** to upload additional `.csv` files anytime.

## MySQL Workbench Setup (Optional)

A complete relational DDL script for MySQL 8.0+ is provided at `database/mysql_schema.sql`. You can open and execute it directly in MySQL Workbench to inspect all 9 normalized tables (`departments`, `users`, `students`, `companies`, `placement_drives`, `job_openings`, `applications`, `interviews`, `placements`) and foreign key constraints.

