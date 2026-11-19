import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { parseCsvText } from './csv';

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'placify.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL UNIQUE,
      hod_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'student')),
      full_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      roll_number TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
      course TEXT NOT NULL DEFAULT 'B.Tech',
      graduation_year INTEGER NOT NULL,
      cgpa REAL NOT NULL CHECK(cgpa >= 0 AND cgpa <= 10),
      skills TEXT NOT NULL DEFAULT '',
      resume_url TEXT DEFAULT '',
      resume_summary TEXT DEFAULT '',
      placement_status TEXT NOT NULL DEFAULT 'Unplaced' CHECK(placement_status IN ('Unplaced', 'In Process', 'Placed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      industry TEXT NOT NULL,
      location TEXT NOT NULL,
      website TEXT DEFAULT '',
      hr_contact TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS placement_drives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      job_role TEXT NOT NULL,
      drive_date TEXT NOT NULL,
      registration_deadline TEXT NOT NULL,
      venue TEXT NOT NULL,
      description TEXT DEFAULT '',
      min_cgpa REAL NOT NULL DEFAULT 6.0,
      eligible_departments TEXT NOT NULL DEFAULT 'ALL',
      eligible_year INTEGER NOT NULL DEFAULT 2026,
      status TEXT NOT NULL DEFAULT 'Upcoming' CHECK(status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS job_openings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      drive_id INTEGER REFERENCES placement_drives(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      job_type TEXT NOT NULL DEFAULT 'Full-Time' CHECK(job_type IN ('Full-Time', 'Internship + PPO', 'Internship')),
      package_lpa REAL NOT NULL,
      location TEXT NOT NULL,
      description TEXT DEFAULT '',
      min_cgpa REAL NOT NULL DEFAULT 6.0,
      eligible_departments TEXT NOT NULL DEFAULT 'ALL',
      eligible_year INTEGER NOT NULL DEFAULT 2026,
      required_skills TEXT NOT NULL DEFAULT '',
      application_deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'Closed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      job_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'Applied' CHECK(status IN ('Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected')),
      cover_note TEXT DEFAULT '',
      applied_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, job_id)
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      job_id INTEGER NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      interview_date TEXT NOT NULL,
      interview_time TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'Online' CHECK(mode IN ('In-Person', 'Online', 'Hybrid')),
      location_or_link TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Completed', 'Cancelled', 'Rescheduled')),
      result TEXT NOT NULL DEFAULT 'Pending' CHECK(result IN ('Pending', 'Passed', 'Failed')),
      feedback TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
      job_id INTEGER REFERENCES job_openings(id) ON DELETE SET NULL,
      application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      job_role TEXT NOT NULL,
      package_lpa REAL NOT NULL,
      placement_date TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Offer Accepted' CHECK(status IN ('Offer Accepted', 'Offer Pending', 'Joined')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_students_dept ON students(department_id);
    CREATE INDEX IF NOT EXISTS idx_students_year ON students(graduation_year);
    CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);
    CREATE INDEX IF NOT EXISTS idx_apps_job ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_interviews_date ON interviews(interview_date);
    CREATE INDEX IF NOT EXISTS idx_placements_year ON placements(academic_year);
  `);

  const deptCount = (db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number }).c;
  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
  if (deptCount === 0 || adminCount === 0) {
    seedCoreReferenceData();
  }

  const companyCount = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }).c;
  const studentCount = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
  if (companyCount === 0 && studentCount === 0) {
    loadDatasetsFromCsv();
  }
}

function seedCoreReferenceData() {
  const adminPass = bcrypt.hashSync('Admin@123', 10);

  const tx = db.transaction(() => {
    const insertDept = db.prepare('INSERT OR IGNORE INTO departments (code, name, hod_name) VALUES (?, ?, ?)');
    const depts = [
      ['CSE', 'Computer Science & Engineering', 'Dr. Rajeshwari Menon'],
      ['IT', 'Information Technology', 'Dr. Arvind Deshmukh'],
      ['ECE', 'Electronics & Communication', 'Dr. Sanjay Kulkarni'],
      ['ME', 'Mechanical Engineering', 'Dr. Vikramaditya Rao'],
      ['CE', 'Civil Engineering', 'Dr. Meenakshi Iyer'],
      ['MBA', 'Master of Business Administration', 'Dr. Kavita Krishnan'],
    ];
    for (const d of depts) insertDept.run(...d);

    const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (!adminExists) {
      db.prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)').run(
        'admin@placify.edu',
        adminPass,
        'admin',
        'Dr. Ananya Verma'
      );
    }
  });

  tx();
}

function readCsvFile(datasetsDir: string, filename: string): Array<Record<string, string>> {
  const filePath = path.join(datasetsDir, filename);
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return parseCsvText(raw);
}

function loadDatasetsFromCsv() {
  const datasetsDir = path.resolve(process.cwd(), 'datasets');
  if (!fs.existsSync(datasetsDir)) return;

  const studentPass = bcrypt.hashSync('Student@123', 10);

  const tx = db.transaction(() => {
    const deptRows = db.prepare('SELECT id, code FROM departments').all() as Array<{ id: number; code: string }>;
    const deptMap = new Map(deptRows.map((d) => [d.code.toUpperCase(), d.id]));

    // 1. Companies (datasets/companies.csv)
    const insertCompany = db.prepare(
      `INSERT OR IGNORE INTO companies (name, industry, location, website, hr_contact, contact_email, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'companies.csv')) {
      if (!r.name || !r.contact_email) continue;
      insertCompany.run(
        r.name,
        r.industry || 'Technology',
        r.location || 'Bengaluru',
        r.website || '',
        r.hr_contact || 'Campus Recruiting Team',
        r.contact_email.toLowerCase(),
        r.description || ''
      );
    }

    const companyRows = db.prepare('SELECT id, name FROM companies').all() as Array<{ id: number; name: string }>;
    const companyMap = new Map(companyRows.map((c) => [c.name.trim().toLowerCase(), c.id]));

    // 2. Students + Users (datasets/students.csv)
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)');
    const findUser = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?');
    const insertStudent = db.prepare(
      `INSERT OR IGNORE INTO students (
        user_id, roll_number, full_name, email, phone, department_id,
        course, graduation_year, cgpa, skills, placement_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'students.csv')) {
      const deptId = deptMap.get((r.department || '').trim().toUpperCase());
      const cgpa = Number(r.cgpa);
      if (!r.roll_number || !r.full_name || !r.email || !deptId || Number.isNaN(cgpa)) continue;
      const email = r.email.trim().toLowerCase();
      insertUser.run(email, studentPass, 'student', r.full_name.trim());
      const userRow = findUser.get(email) as { id: number } | undefined;
      const status = ['Unplaced', 'In Process', 'Placed'].includes(r.placement_status) ? r.placement_status : 'Unplaced';
      insertStudent.run(
        userRow ? userRow.id : null,
        r.roll_number.trim().toUpperCase(),
        r.full_name.trim(),
        email,
        r.phone || '+91 90000 00000',
        deptId,
        r.course || 'B.Tech',
        Number(r.graduation_year) || 2026,
        cgpa,
        r.skills || '',
        status
      );
    }

    const studentRows = db.prepare('SELECT id, roll_number FROM students').all() as Array<{ id: number; roll_number: string }>;
    const studentMap = new Map(studentRows.map((s) => [s.roll_number.trim().toUpperCase(), s.id]));

    // 3. Placement Drives (datasets/drives.csv)
    const insertDrive = db.prepare(
      `INSERT INTO placement_drives (
        title, company_id, job_role, drive_date, registration_deadline, venue,
        description, min_cgpa, eligible_departments, eligible_year, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'drives.csv')) {
      const companyId = companyMap.get((r.company_name || '').trim().toLowerCase());
      if (!companyId || !r.title) continue;
      insertDrive.run(
        r.title,
        companyId,
        r.job_role || r.title,
        r.drive_date || '2026-12-15',
        r.registration_deadline || '2026-12-08',
        r.venue || 'Central Placement Complex',
        r.description || '',
        Number(r.min_cgpa) || 7.0,
        (r.eligible_departments || 'ALL').toUpperCase(),
        Number(r.eligible_year) || 2026,
        ['Upcoming', 'Ongoing', 'Completed', 'Cancelled'].includes(r.status) ? r.status : 'Upcoming'
      );
    }

    const driveRows = db.prepare('SELECT id, company_id, job_role FROM placement_drives').all() as Array<{
      id: number;
      company_id: number;
      job_role: string;
    }>;
    const driveMap = new Map(driveRows.map((d) => [`${d.company_id}::${d.job_role.trim().toLowerCase()}`, d.id]));

    // 4. Job Openings (datasets/jobs.csv)
    const insertJob = db.prepare(
      `INSERT INTO job_openings (
        company_id, drive_id, title, job_type, package_lpa, location, description,
        min_cgpa, eligible_departments, eligible_year, required_skills, application_deadline, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'jobs.csv')) {
      const companyId = companyMap.get((r.company_name || '').trim().toLowerCase());
      const packageLpa = Number(r.package_lpa);
      if (!companyId || !r.title || Number.isNaN(packageLpa)) continue;
      const driveId = driveMap.get(`${companyId}::${r.title.trim().toLowerCase()}`) ?? null;
      insertJob.run(
        companyId,
        driveId,
        r.title.trim(),
        ['Full-Time', 'Internship + PPO', 'Internship'].includes(r.job_type) ? r.job_type : 'Full-Time',
        packageLpa,
        r.location || 'Bengaluru',
        r.description || '',
        Number(r.min_cgpa) || 6.5,
        (r.eligible_departments || 'ALL').toUpperCase(),
        Number(r.eligible_year) || 2026,
        r.required_skills || '',
        r.application_deadline || '2026-12-31',
        ['Open', 'Closed'].includes(r.status) ? r.status : 'Open'
      );
    }

    const jobRows = db
      .prepare('SELECT j.id, j.company_id, j.title, c.name as company_name FROM job_openings j JOIN companies c ON j.company_id = c.id')
      .all() as Array<{ id: number; company_id: number; title: string; company_name: string }>;
    const jobMap = new Map(jobRows.map((j) => [`${j.company_name.trim().toLowerCase()}::${j.title.trim().toLowerCase()}`, j.id]));

    // 5. Applications (datasets/applications.csv)
    const insertApp = db.prepare(
      `INSERT OR IGNORE INTO applications (student_id, job_id, status, cover_note, applied_at)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'applications.csv')) {
      const studentId = studentMap.get((r.roll_number || '').trim().toUpperCase());
      const jobId = jobMap.get(`${(r.company_name || '').trim().toLowerCase()}::${(r.job_title || '').trim().toLowerCase()}`);
      if (!studentId || !jobId) continue;
      const status = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].includes(r.status)
        ? r.status
        : 'Applied';
      insertApp.run(studentId, jobId, status, r.cover_note || '', r.applied_at || new Date().toISOString().slice(0, 19).replace('T', ' '));
    }

    const appRows = db.prepare('SELECT id, student_id, job_id FROM applications').all() as Array<{
      id: number;
      student_id: number;
      job_id: number;
    }>;
    const appMap = new Map(appRows.map((a) => [`${a.student_id}::${a.job_id}`, a.id]));

    // 6. Interviews (datasets/interviews.csv)
    const insertInterview = db.prepare(
      `INSERT INTO interviews (
        application_id, student_id, job_id, company_id, interview_date, interview_time,
        mode, location_or_link, status, result, feedback
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const r of readCsvFile(datasetsDir, 'interviews.csv')) {
      const studentId = studentMap.get((r.roll_number || '').trim().toUpperCase());
      const companyId = companyMap.get((r.company_name || '').trim().toLowerCase());
      const jobId = jobMap.get(`${(r.company_name || '').trim().toLowerCase()}::${(r.job_title || '').trim().toLowerCase()}`);
      if (!studentId || !companyId || !jobId) continue;
      const appId = appMap.get(`${studentId}::${jobId}`) ?? null;
      insertInterview.run(
        appId,
        studentId,
        jobId,
        companyId,
        r.interview_date || '2026-12-10',
        r.interview_time || '10:00 AM',
        ['In-Person', 'Online', 'Hybrid'].includes(r.mode) ? r.mode : 'Online',
        r.location_or_link || 'Placement Wing',
        ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'].includes(r.status) ? r.status : 'Scheduled',
        ['Pending', 'Passed', 'Failed'].includes(r.result) ? r.result : 'Pending',
        r.feedback || ''
      );
    }

    // 7. Placements (datasets/placements.csv)
    const insertPlacement = db.prepare(
      `INSERT OR IGNORE INTO placements (
        student_id, company_id, job_id, application_id, job_role, package_lpa,
        placement_date, academic_year, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const markPlaced = db.prepare("UPDATE students SET placement_status = 'Placed' WHERE id = ?");
    for (const r of readCsvFile(datasetsDir, 'placements.csv')) {
      const studentId = studentMap.get((r.roll_number || '').trim().toUpperCase());
      const companyId = companyMap.get((r.company_name || '').trim().toLowerCase());
      const packageLpa = Number(r.package_lpa);
      if (!studentId || !companyId || !r.job_role || Number.isNaN(packageLpa)) continue;
      const jobId = jobMap.get(`${(r.company_name || '').trim().toLowerCase()}::${r.job_role.trim().toLowerCase()}`) ?? null;
      const appId = jobId ? (appMap.get(`${studentId}::${jobId}`) ?? null) : null;
      const status = ['Offer Accepted', 'Offer Pending', 'Joined'].includes(r.status) ? r.status : 'Offer Accepted';
      insertPlacement.run(
        studentId,
        companyId,
        jobId,
        appId,
        r.job_role.trim(),
        packageLpa,
        r.placement_date || '2026-11-10',
        r.academic_year || '2025-26',
        status
      );
      markPlaced.run(studentId);
    }
  });

  tx();
}


