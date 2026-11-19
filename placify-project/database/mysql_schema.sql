-- ============================================================
-- PLACIFY: College Placement Management & Recruitment System
-- MySQL 8.0 / MySQL Workbench Relational Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS placify_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE placify_db;

-- 1. Departments
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL UNIQUE,
  hod_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users (Authentication & Role-Based Access Control)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  full_name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_role (role)
);

-- 3. Students
CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  roll_number VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  phone VARCHAR(30) NOT NULL,
  department_id INT NOT NULL,
  course VARCHAR(100) NOT NULL DEFAULT 'B.Tech',
  graduation_year INT NOT NULL,
  cgpa DECIMAL(4,2) NOT NULL CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
  skills TEXT NOT NULL,
  resume_url VARCHAR(500) DEFAULT '',
  resume_summary TEXT DEFAULT '',
  placement_status ENUM('Unplaced', 'In Process', 'Placed') NOT NULL DEFAULT 'Unplaced',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_student_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
  INDEX idx_students_dept_year (department_id, graduation_year),
  INDEX idx_students_cgpa (cgpa),
  INDEX idx_students_status (placement_status)
);

-- 4. Companies
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  industry VARCHAR(120) NOT NULL,
  location VARCHAR(150) NOT NULL,
  website VARCHAR(255) DEFAULT '',
  hr_contact VARCHAR(150) NOT NULL,
  contact_email VARCHAR(190) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_companies_industry (industry)
);

-- 5. Placement Drives
CREATE TABLE IF NOT EXISTS placement_drives (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company_id INT NOT NULL,
  job_role VARCHAR(160) NOT NULL,
  drive_date DATE NOT NULL,
  registration_deadline DATE NOT NULL,
  venue VARCHAR(200) NOT NULL,
  description TEXT,
  min_cgpa DECIMAL(4,2) NOT NULL DEFAULT 6.00,
  eligible_departments VARCHAR(255) NOT NULL DEFAULT 'ALL',
  eligible_year INT NOT NULL DEFAULT 2026,
  status ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Upcoming',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_drive_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_drives_date_status (drive_date, status)
);

-- 6. Job Openings
CREATE TABLE IF NOT EXISTS job_openings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  drive_id INT NULL,
  title VARCHAR(180) NOT NULL,
  job_type ENUM('Full-Time', 'Internship + PPO', 'Internship') NOT NULL DEFAULT 'Full-Time',
  package_lpa DECIMAL(6,2) NOT NULL,
  location VARCHAR(150) NOT NULL,
  description TEXT,
  min_cgpa DECIMAL(4,2) NOT NULL DEFAULT 6.00,
  eligible_departments VARCHAR(255) NOT NULL DEFAULT 'ALL',
  eligible_year INT NOT NULL DEFAULT 2026,
  required_skills TEXT NOT NULL,
  application_deadline DATE NOT NULL,
  status ENUM('Open', 'Closed') NOT NULL DEFAULT 'Open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_job_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_drive FOREIGN KEY (drive_id) REFERENCES placement_drives(id) ON DELETE SET NULL,
  INDEX idx_jobs_status_deadline (status, application_deadline)
);

-- 7. Applications
CREATE TABLE IF NOT EXISTS applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  job_id INT NOT NULL,
  status ENUM('Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected') NOT NULL DEFAULT 'Applied',
  cover_note TEXT,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_app_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_app_job FOREIGN KEY (job_id) REFERENCES job_openings(id) ON DELETE CASCADE,
  UNIQUE KEY uq_student_job_application (student_id, job_id),
  INDEX idx_applications_status (status)
);

-- 8. Interviews
CREATE TABLE IF NOT EXISTS interviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NULL,
  student_id INT NOT NULL,
  job_id INT NOT NULL,
  company_id INT NOT NULL,
  interview_date DATE NOT NULL,
  interview_time VARCHAR(20) NOT NULL,
  mode ENUM('In-Person', 'Online', 'Hybrid') NOT NULL DEFAULT 'Online',
  location_or_link VARCHAR(300) NOT NULL,
  status ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled') NOT NULL DEFAULT 'Scheduled',
  result ENUM('Pending', 'Passed', 'Failed') NOT NULL DEFAULT 'Pending',
  feedback TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_interview_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  CONSTRAINT fk_interview_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_interview_job FOREIGN KEY (job_id) REFERENCES job_openings(id) ON DELETE CASCADE,
  CONSTRAINT fk_interview_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_interviews_date_status (interview_date, status)
);

-- 9. Placements
CREATE TABLE IF NOT EXISTS placements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  company_id INT NOT NULL,
  job_id INT NULL,
  application_id INT NULL,
  job_role VARCHAR(160) NOT NULL,
  package_lpa DECIMAL(6,2) NOT NULL,
  placement_date DATE NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  status ENUM('Offer Accepted', 'Offer Pending', 'Joined') NOT NULL DEFAULT 'Offer Accepted',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_placement_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_placement_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT fk_placement_job FOREIGN KEY (job_id) REFERENCES job_openings(id) ON DELETE SET NULL,
  CONSTRAINT fk_placement_app FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE SET NULL,
  INDEX idx_placements_year (academic_year),
  INDEX idx_placements_company (company_id)
);
