import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { parseCsvText } from '../csv';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('admin'));

// ------------------------------------------------------------
// 1. ADMIN DASHBOARD OVERVIEW & ANALYTICS
// ------------------------------------------------------------
router.get('/dashboard', (_req, res) => {
  try {
    const totalStudents = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
    const totalCompanies = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }).c;
    const totalDrives = (db.prepare('SELECT COUNT(*) as c FROM placement_drives').get() as { c: number }).c;
    const totalJobs = (db.prepare('SELECT COUNT(*) as c FROM job_openings').get() as { c: number }).c;
    const totalApplications = (db.prepare('SELECT COUNT(*) as c FROM applications').get() as { c: number }).c;
    const totalPlaced = (db.prepare('SELECT COUNT(*) as c FROM placements').get() as { c: number }).c;

    const pkgAgg = db
      .prepare('SELECT COALESCE(AVG(package_lpa), 0) as avgPkg, COALESCE(MAX(package_lpa), 0) as maxPkg FROM placements')
      .get() as { avgPkg: number; maxPkg: number };

    const placementPercentage = totalStudents > 0 ? Number(((totalPlaced / totalStudents) * 100).toFixed(1)) : 0;

    // Chart 1: Department-wise student distribution
    const deptStudentDist = db
      .prepare(
        `SELECT d.code, d.name, COUNT(s.id) as count
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         GROUP BY d.id
         ORDER BY count DESC`
      )
      .all();

    // Chart 2: Department-wise placement performance
    const deptPlacementPerf = db
      .prepare(
        `SELECT d.code, d.name,
                COUNT(s.id) as total,
                COUNT(p.id) as placed
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         LEFT JOIN placements p ON p.student_id = s.id
         GROUP BY d.id
         ORDER BY placed DESC, total DESC`
      )
      .all() as Array<{ code: string; name: string; total: number; placed: number }>;

    const deptPlacementFormatted = deptPlacementPerf.map((row) => ({
      ...row,
      rate: row.total > 0 ? Number(((row.placed / row.total) * 100).toFixed(1)) : 0,
    }));

    // Chart 3: Application status distribution
    const applicationStatusDist = db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM applications
         GROUP BY status
         ORDER BY count DESC`
      )
      .all();

    // Chart 4: Company-wise student placements
    const companyPlacements = db
      .prepare(
        `SELECT c.name as company, COUNT(p.id) as placedCount, ROUND(AVG(p.package_lpa), 2) as avgPackage
         FROM placements p
         JOIN companies c ON p.company_id = c.id
         GROUP BY c.id
         ORDER BY placedCount DESC, avgPackage DESC
         LIMIT 8`
      )
      .all();

    // Chart 5: Year-wise placement statistics
    const yearWisePlacements = db
      .prepare(
        `SELECT academic_year as academicYear,
                COUNT(*) as placedCount,
                ROUND(AVG(package_lpa), 2) as avgPackage,
                MAX(package_lpa) as highestPackage
         FROM placements
         GROUP BY academic_year
         ORDER BY academic_year ASC`
      )
      .all();

    // Chart 6: Average package trend over placement months
    const packageTrend = db
      .prepare(
        `SELECT strftime('%Y-%m', placement_date) as month,
                ROUND(AVG(package_lpa), 2) as avgPackage,
                COUNT(*) as offers
         FROM placements
         GROUP BY strftime('%Y-%m', placement_date)
         ORDER BY month ASC`
      )
      .all();

    // Recent sections
    const upcomingDrives = db
      .prepare(
        `SELECT d.*, c.name as company_name
         FROM placement_drives d
         JOIN companies c ON d.company_id = c.id
         WHERE d.status IN ('Upcoming', 'Ongoing')
         ORDER BY d.drive_date ASC
         LIMIT 5`
      )
      .all();

    const recentApplications = db
      .prepare(
        `SELECT a.*, s.full_name as student_name, s.roll_number, dept.code as department_code,
                j.title as job_title, c.name as company_name
         FROM applications a
         JOIN students s ON a.student_id = s.id
         JOIN departments dept ON s.department_id = dept.id
         JOIN job_openings j ON a.job_id = j.id
         JOIN companies c ON j.company_id = c.id
         ORDER BY a.applied_at DESC
         LIMIT 6`
      )
      .all();

    const recentStudents = db
      .prepare(
        `SELECT s.*, d.code as department_code, d.name as department_name
         FROM students s
         JOIN departments d ON s.department_id = d.id
         ORDER BY s.created_at DESC, s.id DESC
         LIMIT 5`
      )
      .all();

    const recentCompanies = db
      .prepare('SELECT * FROM companies ORDER BY created_at DESC, id DESC LIMIT 5')
      .all();

    const recentPlacements = db
      .prepare(
        `SELECT p.*, s.full_name as student_name, s.roll_number, d.code as department_code, c.name as company_name
         FROM placements p
         JOIN students s ON p.student_id = s.id
         JOIN departments d ON s.department_id = d.id
         JOIN companies c ON p.company_id = c.id
         ORDER BY p.placement_date DESC, p.id DESC
         LIMIT 5`
      )
      .all();

    return res.json({
      stats: {
        totalStudents,
        totalCompanies,
        totalDrives,
        totalJobs,
        totalApplications,
        totalPlaced,
        placementPercentage,
        avgPackage: Number(pkgAgg.avgPkg.toFixed(2)),
        highestPackage: Number(pkgAgg.maxPkg.toFixed(2)),
      },
      charts: {
        deptStudentDist,
        deptPlacementPerf: deptPlacementFormatted,
        applicationStatusDist,
        companyPlacements,
        yearWisePlacements,
        packageTrend,
      },
      recent: {
        upcomingDrives,
        recentApplications,
        recentStudents,
        recentCompanies,
        recentPlacements,
      },
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard analytics.' });
  }
});

// ------------------------------------------------------------
// 2. STUDENTS CRUD
// ------------------------------------------------------------
router.get('/students', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    const graduationYear = req.query.graduation_year ? Number(req.query.graduation_year) : null;
    const minCgpa = req.query.min_cgpa ? Number(req.query.min_cgpa) : null;
    const status = String(req.query.status || '');

    let sql = `
      SELECT s.*, d.code as department_code, d.name as department_name
      FROM students s
      JOIN departments d ON s.department_id = d.id
      WHERE 1=1
    `;
    const params: Array<string | number> = [];

    if (departmentId) {
      sql += ' AND s.department_id = ?';
      params.push(departmentId);
    }
    if (graduationYear) {
      sql += ' AND s.graduation_year = ?';
      params.push(graduationYear);
    }
    if (minCgpa !== null && !Number.isNaN(minCgpa)) {
      sql += ' AND s.cgpa >= ?';
      params.push(minCgpa);
    }
    if (status && status !== 'ALL') {
      sql += ' AND s.placement_status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.email) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(s.skills) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY s.id DESC';
    const students = db.prepare(sql).all(...params);
    return res.json({ students });
  } catch (err) {
    console.error('List students error:', err);
    return res.status(500).json({ error: 'Failed to load students.' });
  }
});

router.get('/students/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const student = db
      .prepare(
        `SELECT s.*, d.code as department_code, d.name as department_name
         FROM students s
         JOIN departments d ON s.department_id = d.id
         WHERE s.id = ?`
      )
      .get(id);

    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const applications = db
      .prepare(
        `SELECT a.*, j.title as job_title, j.package_lpa, c.name as company_name
         FROM applications a
         JOIN job_openings j ON a.job_id = j.id
         JOIN companies c ON j.company_id = c.id
         WHERE a.student_id = ?
         ORDER BY a.applied_at DESC`
      )
      .all(id);

    const interviews = db
      .prepare(
        `SELECT i.*, j.title as job_title, c.name as company_name
         FROM interviews i
         JOIN job_openings j ON i.job_id = j.id
         JOIN companies c ON i.company_id = c.id
         WHERE i.student_id = ?
         ORDER BY i.interview_date DESC`
      )
      .all(id);

    const placement = db
      .prepare(
        `SELECT p.*, c.name as company_name
         FROM placements p
         JOIN companies c ON p.company_id = c.id
         WHERE p.student_id = ?`
      )
      .get(id);

    return res.json({ student, applications, interviews, placement: placement || null });
  } catch (err) {
    console.error('Get student error:', err);
    return res.status(500).json({ error: 'Failed to load student profile.' });
  }
});

router.post('/students', (req, res) => {
  try {
    const {
      roll_number,
      full_name,
      email,
      phone,
      department_id,
      course,
      graduation_year,
      cgpa,
      skills,
      resume_url,
      resume_summary,
      placement_status,
      password,
    } = req.body;

    if (!roll_number || !full_name || !email || !phone || !department_id || !graduation_year || cgpa === undefined) {
      return res.status(400).json({ error: 'Required student fields are missing.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const numericCgpa = Number(cgpa);
    if (Number.isNaN(numericCgpa) || numericCgpa < 0 || numericCgpa > 10) {
      return res.status(400).json({ error: 'CGPA must be between 0.00 and 10.00.' });
    }

    const dupEmail = db
      .prepare('SELECT id FROM students WHERE LOWER(email) = ? UNION SELECT id FROM users WHERE LOWER(email) = ?')
      .get(normalizedEmail, normalizedEmail);
    if (dupEmail) {
      return res.status(409).json({ error: 'A student or user with this email already exists.' });
    }

    const dupRoll = db.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?').get(String(roll_number).trim().toUpperCase());
    if (dupRoll) {
      return res.status(409).json({ error: 'A student with this roll number already exists.' });
    }

    const passwordHash = bcrypt.hashSync(String(password || 'Student@123'), 10);

    const id = db.transaction(() => {
      const uRes = db
        .prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
        .run(normalizedEmail, passwordHash, 'student', String(full_name).trim());

      const sRes = db
        .prepare(
          `INSERT INTO students (
            user_id, roll_number, full_name, email, phone, department_id,
            course, graduation_year, cgpa, skills, resume_url, resume_summary, placement_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          Number(uRes.lastInsertRowid),
          String(roll_number).trim().toUpperCase(),
          String(full_name).trim(),
          normalizedEmail,
          String(phone).trim(),
          Number(department_id),
          String(course || 'B.Tech').trim(),
          Number(graduation_year),
          numericCgpa,
          String(skills || '').trim(),
          String(resume_url || '').trim(),
          String(resume_summary || '').trim(),
          placement_status || 'Unplaced'
        );

      return Number(sRes.lastInsertRowid);
    })();

    return res.status(201).json({ id, message: 'Student created successfully.' });
  } catch (err) {
    console.error('Create student error:', err);
    return res.status(500).json({ error: 'Failed to create student.' });
  }
});

router.put('/students/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as { id: number; user_id: number | null; email: string } | undefined;
    if (!existing) return res.status(404).json({ error: 'Student not found.' });

    const {
      roll_number,
      full_name,
      email,
      phone,
      department_id,
      course,
      graduation_year,
      cgpa,
      skills,
      resume_url,
      resume_summary,
      placement_status,
    } = req.body;

    if (!roll_number || !full_name || !email || !phone || !department_id || !graduation_year || cgpa === undefined) {
      return res.status(400).json({ error: 'Required student fields are missing.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const numericCgpa = Number(cgpa);
    if (Number.isNaN(numericCgpa) || numericCgpa < 0 || numericCgpa > 10) {
      return res.status(400).json({ error: 'CGPA must be between 0.00 and 10.00.' });
    }

    const dupEmail = db.prepare('SELECT id FROM students WHERE LOWER(email) = ? AND id != ?').get(normalizedEmail, id);
    if (dupEmail) return res.status(409).json({ error: 'Another student already uses this email.' });

    const dupRoll = db.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ? AND id != ?').get(String(roll_number).trim().toUpperCase(), id);
    if (dupRoll) return res.status(409).json({ error: 'Another student already uses this roll number.' });

    db.transaction(() => {
      db.prepare(
        `UPDATE students
         SET roll_number = ?, full_name = ?, email = ?, phone = ?, department_id = ?,
             course = ?, graduation_year = ?, cgpa = ?, skills = ?, resume_url = ?,
             resume_summary = ?, placement_status = ?
         WHERE id = ?`
      ).run(
        String(roll_number).trim().toUpperCase(),
        String(full_name).trim(),
        normalizedEmail,
        String(phone).trim(),
        Number(department_id),
        String(course || 'B.Tech').trim(),
        Number(graduation_year),
        numericCgpa,
        String(skills || '').trim(),
        String(resume_url || '').trim(),
        String(resume_summary || '').trim(),
        placement_status || 'Unplaced',
        id
      );

      if (existing.user_id) {
        db.prepare('UPDATE users SET email = ?, full_name = ? WHERE id = ?').run(
          normalizedEmail,
          String(full_name).trim(),
          existing.user_id
        );
      }
    })();

    return res.json({ message: 'Student updated successfully.' });
  } catch (err) {
    console.error('Update student error:', err);
    return res.status(500).json({ error: 'Failed to update student.' });
  }
});

router.delete('/students/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT id, user_id FROM students WHERE id = ?').get(id) as { id: number; user_id: number | null } | undefined;
    if (!existing) return res.status(404).json({ error: 'Student not found.' });

    db.transaction(() => {
      db.prepare('DELETE FROM students WHERE id = ?').run(id);
      if (existing.user_id) {
        db.prepare('DELETE FROM users WHERE id = ?').run(existing.user_id);
      }
    })();

    return res.json({ message: 'Student deleted successfully.' });
  } catch (err) {
    console.error('Delete student error:', err);
    return res.status(500).json({ error: 'Failed to delete student.' });
  }
});

// ------------------------------------------------------------
// 3. COMPANIES CRUD
// ------------------------------------------------------------
router.get('/companies', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const industry = String(req.query.industry || '');

    let sql = `
      SELECT c.*,
             (SELECT COUNT(*) FROM job_openings j WHERE j.company_id = c.id) as jobs_count,
             (SELECT COUNT(*) FROM placement_drives d WHERE d.company_id = c.id) as drives_count,
             (SELECT COUNT(*) FROM placements p WHERE p.company_id = c.id) as placements_count
      FROM companies c
      WHERE 1=1
    `;
    const params: string[] = [];

    if (industry && industry !== 'ALL') {
      sql += ' AND c.industry = ?';
      params.push(industry);
    }
    if (search) {
      sql += ' AND (LOWER(c.name) LIKE ? OR LOWER(c.industry) LIKE ? OR LOWER(c.location) LIKE ? OR LOWER(c.hr_contact) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY c.id DESC';
    const companies = db.prepare(sql).all(...params);
    return res.json({ companies });
  } catch (err) {
    console.error('List companies error:', err);
    return res.status(500).json({ error: 'Failed to load companies.' });
  }
});

router.get('/companies/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(id);
    if (!company) return res.status(404).json({ error: 'Company not found.' });

    const jobs = db.prepare('SELECT * FROM job_openings WHERE company_id = ? ORDER BY id DESC').all(id);
    const drives = db.prepare('SELECT * FROM placement_drives WHERE company_id = ? ORDER BY drive_date DESC').all(id);
    const placements = db
      .prepare(
        `SELECT p.*, s.full_name as student_name, s.roll_number, d.code as department_code
         FROM placements p
         JOIN students s ON p.student_id = s.id
         JOIN departments d ON s.department_id = d.id
         WHERE p.company_id = ?`
      )
      .all(id);

    return res.json({ company, jobs, drives, placements });
  } catch (err) {
    console.error('Get company detail error:', err);
    return res.status(500).json({ error: 'Failed to load company details.' });
  }
});

router.post('/companies', (req, res) => {
  try {
    const { name, industry, location, website, hr_contact, contact_email, description } = req.body;
    if (!name || !industry || !location || !hr_contact || !contact_email) {
      return res.status(400).json({ error: 'Company name, industry, location, HR contact, and contact email are required.' });
    }

    const dup = db.prepare('SELECT id FROM companies WHERE LOWER(name) = ?').get(String(name).trim().toLowerCase());
    if (dup) return res.status(409).json({ error: 'A company with this name already exists.' });

    const r = db
      .prepare(
        `INSERT INTO companies (name, industry, location, website, hr_contact, contact_email, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(name).trim(),
        String(industry).trim(),
        String(location).trim(),
        String(website || '').trim(),
        String(hr_contact).trim(),
        String(contact_email).trim().toLowerCase(),
        String(description || '').trim()
      );

    return res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Company added successfully.' });
  } catch (err) {
    console.error('Create company error:', err);
    return res.status(500).json({ error: 'Failed to add company.' });
  }
});

router.put('/companies/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, industry, location, website, hr_contact, contact_email, description } = req.body;
    if (!name || !industry || !location || !hr_contact || !contact_email) {
      return res.status(400).json({ error: 'Required company fields are missing.' });
    }

    const dup = db.prepare('SELECT id FROM companies WHERE LOWER(name) = ? AND id != ?').get(String(name).trim().toLowerCase(), id);
    if (dup) return res.status(409).json({ error: 'Another company with this name already exists.' });

    const r = db
      .prepare(
        `UPDATE companies
         SET name = ?, industry = ?, location = ?, website = ?, hr_contact = ?, contact_email = ?, description = ?
         WHERE id = ?`
      )
      .run(
        String(name).trim(),
        String(industry).trim(),
        String(location).trim(),
        String(website || '').trim(),
        String(hr_contact).trim(),
        String(contact_email).trim().toLowerCase(),
        String(description || '').trim(),
        id
      );

    if (r.changes === 0) return res.status(404).json({ error: 'Company not found.' });
    return res.json({ message: 'Company updated successfully.' });
  } catch (err) {
    console.error('Update company error:', err);
    return res.status(500).json({ error: 'Failed to update company.' });
  }
});

router.delete('/companies/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const placementRef = db.prepare('SELECT COUNT(*) as c FROM placements WHERE company_id = ?').get(id) as { c: number };
    if (placementRef.c > 0) {
      return res.status(409).json({
        error: 'Cannot delete a company that has recorded student placements. Archive or remove placement records first.',
      });
    }
    const r = db.prepare('DELETE FROM companies WHERE id = ?').run(id);
    if (r.changes === 0) return res.status(404).json({ error: 'Company not found.' });
    return res.json({ message: 'Company deleted successfully.' });
  } catch (err) {
    console.error('Delete company error:', err);
    return res.status(500).json({ error: 'Failed to delete company.' });
  }
});

// ------------------------------------------------------------
// 4. PLACEMENT DRIVES CRUD + ELIGIBLE/APPLICANTS VIEW
// ------------------------------------------------------------
router.get('/drives', (req, res) => {
  try {
    const status = String(req.query.status || '');
    const search = String(req.query.search || '').trim().toLowerCase();

    let sql = `
      SELECT d.*, c.name as company_name,
             (SELECT COUNT(*) FROM job_openings j WHERE j.drive_id = d.id) as jobs_count,
             (SELECT COUNT(*) FROM applications a JOIN job_openings j ON a.job_id = j.id WHERE j.drive_id = d.id) as applicants_count
      FROM placement_drives d
      JOIN companies c ON d.company_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND d.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (LOWER(d.title) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(d.job_role) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY d.drive_date DESC';
    const drives = db.prepare(sql).all(...params);
    return res.json({ drives });
  } catch (err) {
    console.error('List drives error:', err);
    return res.status(500).json({ error: 'Failed to load placement drives.' });
  }
});

router.get('/drives/:id/candidates', (req, res) => {
  try {
    const id = Number(req.params.id);
    const drive = db
      .prepare('SELECT d.*, c.name as company_name FROM placement_drives d JOIN companies c ON d.company_id = c.id WHERE d.id = ?')
      .get(id) as
      | { id: number; min_cgpa: number; eligible_departments: string; eligible_year: number }
      | undefined;

    if (!drive) return res.status(404).json({ error: 'Placement drive not found.' });

    const allStudents = db
      .prepare(
        `SELECT s.*, d.code as department_code, d.name as department_name
         FROM students s
         JOIN departments d ON s.department_id = d.id
         ORDER BY s.cgpa DESC`
      )
      .all() as Array<{
      id: number;
      roll_number: string;
      full_name: string;
      email: string;
      department_code: string;
      graduation_year: number;
      cgpa: number;
      placement_status: string;
    }>;

    const allowedDepts = drive.eligible_departments
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const eligibleStudents = allStudents.filter(
      (s) =>
        s.cgpa >= drive.min_cgpa &&
        s.graduation_year === drive.eligible_year &&
        (allowedDepts.includes('ALL') || allowedDepts.includes(s.department_code.toUpperCase()))
    );

    const applicants = db
      .prepare(
        `SELECT a.*, s.full_name as student_name, s.roll_number, s.cgpa, dept.code as department_code, j.title as job_title
         FROM applications a
         JOIN job_openings j ON a.job_id = j.id
         JOIN students s ON a.student_id = s.id
         JOIN departments dept ON s.department_id = dept.id
         WHERE j.drive_id = ?
         ORDER BY a.applied_at DESC`
      )
      .all(id);

    return res.json({ drive, eligibleStudents, applicants });
  } catch (err) {
    console.error('Drive candidates error:', err);
    return res.status(500).json({ error: 'Failed to load drive candidates.' });
  }
});

router.post('/drives', (req, res) => {
  try {
    const {
      title,
      company_id,
      job_role,
      drive_date,
      registration_deadline,
      venue,
      description,
      min_cgpa,
      eligible_departments,
      eligible_year,
      status,
    } = req.body;

    if (!title || !company_id || !job_role || !drive_date || !registration_deadline || !venue) {
      return res.status(400).json({ error: 'All required drive fields must be filled.' });
    }

    const r = db
      .prepare(
        `INSERT INTO placement_drives (
          title, company_id, job_role, drive_date, registration_deadline, venue,
          description, min_cgpa, eligible_departments, eligible_year, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        String(title).trim(),
        Number(company_id),
        String(job_role).trim(),
        String(drive_date),
        String(registration_deadline),
        String(venue).trim(),
        String(description || '').trim(),
        Number(min_cgpa ?? 6.0),
        String(eligible_departments || 'ALL').trim(),
        Number(eligible_year || 2026),
        status || 'Upcoming'
      );

    return res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Placement drive created successfully.' });
  } catch (err) {
    console.error('Create drive error:', err);
    return res.status(500).json({ error: 'Failed to create placement drive.' });
  }
});

router.put('/drives/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      company_id,
      job_role,
      drive_date,
      registration_deadline,
      venue,
      description,
      min_cgpa,
      eligible_departments,
      eligible_year,
      status,
    } = req.body;

    if (!title || !company_id || !job_role || !drive_date || !registration_deadline || !venue) {
      return res.status(400).json({ error: 'All required drive fields must be filled.' });
    }

    const r = db
      .prepare(
        `UPDATE placement_drives
         SET title = ?, company_id = ?, job_role = ?, drive_date = ?, registration_deadline = ?,
             venue = ?, description = ?, min_cgpa = ?, eligible_departments = ?, eligible_year = ?, status = ?
         WHERE id = ?`
      )
      .run(
        String(title).trim(),
        Number(company_id),
        String(job_role).trim(),
        String(drive_date),
        String(registration_deadline),
        String(venue).trim(),
        String(description || '').trim(),
        Number(min_cgpa ?? 6.0),
        String(eligible_departments || 'ALL').trim(),
        Number(eligible_year || 2026),
        status || 'Upcoming',
        id
      );

    if (r.changes === 0) return res.status(404).json({ error: 'Placement drive not found.' });
    return res.json({ message: 'Placement drive updated successfully.' });
  } catch (err) {
    console.error('Update drive error:', err);
    return res.status(500).json({ error: 'Failed to update placement drive.' });
  }
});

router.delete('/drives/:id', (req, res) => {
  try {
    const r = db.prepare('DELETE FROM placement_drives WHERE id = ?').run(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ error: 'Placement drive not found.' });
    return res.json({ message: 'Placement drive deleted successfully.' });
  } catch (err) {
    console.error('Delete drive error:', err);
    return res.status(500).json({ error: 'Failed to delete placement drive.' });
  }
});

// ------------------------------------------------------------
// 5. JOB OPENINGS CRUD
// ------------------------------------------------------------
router.get('/jobs', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || '');
    const companyId = req.query.company_id ? Number(req.query.company_id) : null;

    let sql = `
      SELECT j.*, c.name as company_name, d.title as drive_title,
             (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as applications_count
      FROM job_openings j
      JOIN companies c ON j.company_id = c.id
      LEFT JOIN placement_drives d ON j.drive_id = d.id
      WHERE 1=1
    `;
    const params: Array<string | number> = [];

    if (status && status !== 'ALL') {
      sql += ' AND j.status = ?';
      params.push(status);
    }
    if (companyId) {
      sql += ' AND j.company_id = ?';
      params.push(companyId);
    }
    if (search) {
      sql += ' AND (LOWER(j.title) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(j.location) LIKE ? OR LOWER(j.required_skills) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY j.id DESC';
    const jobs = db.prepare(sql).all(...params);
    return res.json({ jobs });
  } catch (err) {
    console.error('List jobs error:', err);
    return res.status(500).json({ error: 'Failed to load job openings.' });
  }
});

router.post('/jobs', (req, res) => {
  try {
    const {
      company_id,
      drive_id,
      title,
      job_type,
      package_lpa,
      location,
      description,
      min_cgpa,
      eligible_departments,
      eligible_year,
      required_skills,
      application_deadline,
      status,
    } = req.body;

    if (!company_id || !title || package_lpa === undefined || !location || !application_deadline) {
      return res.status(400).json({ error: 'Company, title, package, location, and deadline are required.' });
    }

    const r = db
      .prepare(
        `INSERT INTO job_openings (
          company_id, drive_id, title, job_type, package_lpa, location, description,
          min_cgpa, eligible_departments, eligible_year, required_skills, application_deadline, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        Number(company_id),
        drive_id ? Number(drive_id) : null,
        String(title).trim(),
        job_type || 'Full-Time',
        Number(package_lpa),
        String(location).trim(),
        String(description || '').trim(),
        Number(min_cgpa ?? 6.0),
        String(eligible_departments || 'ALL').trim(),
        Number(eligible_year || 2026),
        String(required_skills || '').trim(),
        String(application_deadline),
        status || 'Open'
      );

    return res.status(201).json({ id: Number(r.lastInsertRowid), message: 'Job opening created successfully.' });
  } catch (err) {
    console.error('Create job error:', err);
    return res.status(500).json({ error: 'Failed to create job opening.' });
  }
});

router.put('/jobs/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      company_id,
      drive_id,
      title,
      job_type,
      package_lpa,
      location,
      description,
      min_cgpa,
      eligible_departments,
      eligible_year,
      required_skills,
      application_deadline,
      status,
    } = req.body;

    if (!company_id || !title || package_lpa === undefined || !location || !application_deadline) {
      return res.status(400).json({ error: 'Required job fields are missing.' });
    }

    const r = db
      .prepare(
        `UPDATE job_openings
         SET company_id = ?, drive_id = ?, title = ?, job_type = ?, package_lpa = ?, location = ?,
             description = ?, min_cgpa = ?, eligible_departments = ?, eligible_year = ?,
             required_skills = ?, application_deadline = ?, status = ?
         WHERE id = ?`
      )
      .run(
        Number(company_id),
        drive_id ? Number(drive_id) : null,
        String(title).trim(),
        job_type || 'Full-Time',
        Number(package_lpa),
        String(location).trim(),
        String(description || '').trim(),
        Number(min_cgpa ?? 6.0),
        String(eligible_departments || 'ALL').trim(),
        Number(eligible_year || 2026),
        String(required_skills || '').trim(),
        String(application_deadline),
        status || 'Open',
        id
      );

    if (r.changes === 0) return res.status(404).json({ error: 'Job opening not found.' });
    return res.json({ message: 'Job opening updated successfully.' });
  } catch (err) {
    console.error('Update job error:', err);
    return res.status(500).json({ error: 'Failed to update job opening.' });
  }
});

router.delete('/jobs/:id', (req, res) => {
  try {
    const r = db.prepare('DELETE FROM job_openings WHERE id = ?').run(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ error: 'Job opening not found.' });
    return res.json({ message: 'Job opening deleted successfully.' });
  } catch (err) {
    console.error('Delete job error:', err);
    return res.status(500).json({ error: 'Failed to delete job opening.' });
  }
});

// ------------------------------------------------------------
// 6. APPLICATIONS MANAGEMENT
// ------------------------------------------------------------
router.get('/applications', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const companyId = req.query.company_id ? Number(req.query.company_id) : null;
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    const status = String(req.query.status || '');
    const jobRole = String(req.query.job_role || '').trim().toLowerCase();

    let sql = `
      SELECT a.*,
             s.full_name as student_name, s.roll_number, s.email as student_email, s.cgpa, s.skills as student_skills,
             dept.id as department_id, dept.code as department_code, dept.name as department_name,
             j.title as job_title, j.package_lpa, j.company_id,
             c.name as company_name
      FROM applications a
      JOIN students s ON a.student_id = s.id
      JOIN departments dept ON s.department_id = dept.id
      JOIN job_openings j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE 1=1
    `;
    const params: Array<string | number> = [];

    if (companyId) {
      sql += ' AND j.company_id = ?';
      params.push(companyId);
    }
    if (departmentId) {
      sql += ' AND dept.id = ?';
      params.push(departmentId);
    }
    if (status && status !== 'ALL') {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    if (jobRole) {
      sql += ' AND LOWER(j.title) LIKE ?';
      params.push(`%${jobRole}%`);
    }
    if (search) {
      sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(j.title) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY a.applied_at DESC, a.id DESC';
    const applications = db.prepare(sql).all(...params);
    return res.json({ applications });
  } catch (err) {
    console.error('List applications error:', err);
    return res.status(500).json({ error: 'Failed to load applications.' });
  }
});

router.patch('/applications/:id/status', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const allowed = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid application status.' });
    }

    const app = db.prepare('SELECT id, student_id FROM applications WHERE id = ?').get(id) as
      | { id: number; student_id: number }
      | undefined;
    if (!app) return res.status(404).json({ error: 'Application not found.' });

    db.transaction(() => {
      db.prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);

      if (status === 'Shortlisted' || status === 'Interview') {
        db.prepare("UPDATE students SET placement_status = 'In Process' WHERE id = ? AND placement_status = 'Unplaced'").run(app.student_id);
      }
    })();

    return res.json({ message: `Application status updated to ${status}.` });
  } catch (err) {
    console.error('Update application status error:', err);
    return res.status(500).json({ error: 'Failed to update application status.' });
  }
});

// ------------------------------------------------------------
// 7. INTERVIEWS MANAGEMENT
// ------------------------------------------------------------
router.get('/interviews', (req, res) => {
  try {
    const status = String(req.query.status || '');
    const search = String(req.query.search || '').trim().toLowerCase();

    let sql = `
      SELECT i.*, s.full_name as student_name, s.roll_number, dept.code as department_code,
             j.title as job_title, c.name as company_name
      FROM interviews i
      JOIN students s ON i.student_id = s.id
      JOIN departments dept ON s.department_id = dept.id
      JOIN job_openings j ON i.job_id = j.id
      JOIN companies c ON i.company_id = c.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND i.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(j.title) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    sql += ' ORDER BY i.interview_date DESC, i.id DESC';
    const interviews = db.prepare(sql).all(...params);
    return res.json({ interviews });
  } catch (err) {
    console.error('List interviews error:', err);
    return res.status(500).json({ error: 'Failed to load interviews.' });
  }
});

router.post('/interviews', (req, res) => {
  try {
    const {
      application_id,
      student_id,
      job_id,
      interview_date,
      interview_time,
      mode,
      location_or_link,
      status,
      result,
      feedback,
    } = req.body;

    let finalStudentId = student_id ? Number(student_id) : null;
    let finalJobId = job_id ? Number(job_id) : null;

    if (application_id) {
      const app = db.prepare('SELECT student_id, job_id FROM applications WHERE id = ?').get(Number(application_id)) as
        | { student_id: number; job_id: number }
        | undefined;
      if (!app) return res.status(404).json({ error: 'Linked application not found.' });
      finalStudentId = app.student_id;
      finalJobId = app.job_id;
    }

    if (!finalStudentId || !finalJobId || !interview_date || !interview_time || !location_or_link) {
      return res.status(400).json({ error: 'Student, job, date, time, and location/link are required.' });
    }

    const job = db.prepare('SELECT company_id FROM job_openings WHERE id = ?').get(finalJobId) as { company_id: number } | undefined;
    if (!job) return res.status(404).json({ error: 'Job opening not found.' });

    const id = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO interviews (
            application_id, student_id, job_id, company_id, interview_date, interview_time,
            mode, location_or_link, status, result, feedback
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          application_id ? Number(application_id) : null,
          finalStudentId,
          finalJobId,
          job.company_id,
          String(interview_date),
          String(interview_time).trim(),
          mode || 'Online',
          String(location_or_link).trim(),
          status || 'Scheduled',
          result || 'Pending',
          String(feedback || '').trim()
        );

      if (application_id) {
        db.prepare("UPDATE applications SET status = 'Interview', updated_at = datetime('now') WHERE id = ? AND status IN ('Applied', 'Shortlisted')").run(
          Number(application_id)
        );
      }

      return Number(r.lastInsertRowid);
    })();

    return res.status(201).json({ id, message: 'Interview scheduled successfully.' });
  } catch (err) {
    console.error('Schedule interview error:', err);
    return res.status(500).json({ error: 'Failed to schedule interview.' });
  }
});

router.put('/interviews/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { interview_date, interview_time, mode, location_or_link, status, result, feedback } = req.body;

    if (!interview_date || !interview_time || !location_or_link) {
      return res.status(400).json({ error: 'Date, time, and location/link are required.' });
    }

    const existing = db.prepare('SELECT application_id FROM interviews WHERE id = ?').get(id) as
      | { application_id: number | null }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Interview record not found.' });

    db.transaction(() => {
      db.prepare(
        `UPDATE interviews
         SET interview_date = ?, interview_time = ?, mode = ?, location_or_link = ?,
             status = ?, result = ?, feedback = ?
         WHERE id = ?`
      ).run(
        String(interview_date),
        String(interview_time).trim(),
        mode || 'Online',
        String(location_or_link).trim(),
        status || 'Scheduled',
        result || 'Pending',
        String(feedback || '').trim(),
        id
      );

      if (existing.application_id && result === 'Passed') {
        db.prepare("UPDATE applications SET status = 'Selected', updated_at = datetime('now') WHERE id = ?").run(existing.application_id);
      } else if (existing.application_id && result === 'Failed') {
        db.prepare("UPDATE applications SET status = 'Rejected', updated_at = datetime('now') WHERE id = ?").run(existing.application_id);
      }
    })();

    return res.json({ message: 'Interview updated successfully.' });
  } catch (err) {
    console.error('Update interview error:', err);
    return res.status(500).json({ error: 'Failed to update interview.' });
  }
});

router.delete('/interviews/:id', (req, res) => {
  try {
    const r = db.prepare('DELETE FROM interviews WHERE id = ?').run(Number(req.params.id));
    if (r.changes === 0) return res.status(404).json({ error: 'Interview record not found.' });
    return res.json({ message: 'Interview cancelled and removed.' });
  } catch (err) {
    console.error('Delete interview error:', err);
    return res.status(500).json({ error: 'Failed to delete interview.' });
  }
});

// ------------------------------------------------------------
// 8. PLACEMENTS MANAGEMENT
// ------------------------------------------------------------
router.get('/placements', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const departmentId = req.query.department_id ? Number(req.query.department_id) : null;
    const companyId = req.query.company_id ? Number(req.query.company_id) : null;
    const academicYear = String(req.query.academic_year || '');

    let sql = `
      SELECT p.*, s.full_name as student_name, s.roll_number, s.email as student_email,
             dept.id as department_id, dept.code as department_code, dept.name as department_name,
             c.name as company_name, c.industry as company_industry
      FROM placements p
      JOIN students s ON p.student_id = s.id
      JOIN departments dept ON s.department_id = dept.id
      JOIN companies c ON p.company_id = c.id
      WHERE 1=1
    `;
    const params: Array<string | number> = [];

    if (departmentId) {
      sql += ' AND dept.id = ?';
      params.push(departmentId);
    }
    if (companyId) {
      sql += ' AND p.company_id = ?';
      params.push(companyId);
    }
    if (academicYear && academicYear !== 'ALL') {
      sql += ' AND p.academic_year = ?';
      params.push(academicYear);
    }
    if (search) {
      sql += ' AND (LOWER(s.full_name) LIKE ? OR LOWER(s.roll_number) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(p.job_role) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY p.placement_date DESC, p.id DESC';
    const placements = db.prepare(sql).all(...params);
    return res.json({ placements });
  } catch (err) {
    console.error('List placements error:', err);
    return res.status(500).json({ error: 'Failed to load placement records.' });
  }
});

router.post('/placements', (req, res) => {
  try {
    const { student_id, company_id, job_id, job_role, package_lpa, placement_date, academic_year, status } = req.body;
    if (!student_id || !company_id || !job_role || package_lpa === undefined || !placement_date || !academic_year) {
      return res.status(400).json({ error: 'Student, company, role, package, date, and academic year are required.' });
    }

    const dup = db.prepare('SELECT id FROM placements WHERE student_id = ?').get(Number(student_id));
    if (dup) {
      return res.status(409).json({ error: 'This student already has a confirmed placement record. Edit the existing record instead.' });
    }

    const id = db.transaction(() => {
      const r = db
        .prepare(
          `INSERT INTO placements (student_id, company_id, job_id, job_role, package_lpa, placement_date, academic_year, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          Number(student_id),
          Number(company_id),
          job_id ? Number(job_id) : null,
          String(job_role).trim(),
          Number(package_lpa),
          String(placement_date),
          String(academic_year).trim(),
          status || 'Offer Accepted'
        );

      db.prepare("UPDATE students SET placement_status = 'Placed' WHERE id = ?").run(Number(student_id));

      if (job_id) {
        db.prepare("UPDATE applications SET status = 'Selected', updated_at = datetime('now') WHERE student_id = ? AND job_id = ?").run(
          Number(student_id),
          Number(job_id)
        );
      }

      return Number(r.lastInsertRowid);
    })();

    return res.status(201).json({ id, message: 'Placement recorded successfully.' });
  } catch (err) {
    console.error('Create placement error:', err);
    return res.status(500).json({ error: 'Failed to record placement.' });
  }
});

router.put('/placements/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const { company_id, job_role, package_lpa, placement_date, academic_year, status } = req.body;
    if (!company_id || !job_role || package_lpa === undefined || !placement_date || !academic_year) {
      return res.status(400).json({ error: 'Required placement fields are missing.' });
    }

    const r = db
      .prepare(
        `UPDATE placements
         SET company_id = ?, job_role = ?, package_lpa = ?, placement_date = ?, academic_year = ?, status = ?
         WHERE id = ?`
      )
      .run(
        Number(company_id),
        String(job_role).trim(),
        Number(package_lpa),
        String(placement_date),
        String(academic_year).trim(),
        status || 'Offer Accepted',
        id
      );

    if (r.changes === 0) return res.status(404).json({ error: 'Placement record not found.' });
    return res.json({ message: 'Placement record updated successfully.' });
  } catch (err) {
    console.error('Update placement error:', err);
    return res.status(500).json({ error: 'Failed to update placement record.' });
  }
});

router.delete('/placements/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = db.prepare('SELECT student_id FROM placements WHERE id = ?').get(id) as { student_id: number } | undefined;
    if (!existing) return res.status(404).json({ error: 'Placement record not found.' });

    db.transaction(() => {
      db.prepare('DELETE FROM placements WHERE id = ?').run(id);
      const hasApps = (db.prepare('SELECT COUNT(*) as c FROM applications WHERE student_id = ?').get(existing.student_id) as { c: number }).c > 0;
      db.prepare('UPDATE students SET placement_status = ? WHERE id = ?').run(hasApps ? 'In Process' : 'Unplaced', existing.student_id);
    })();

    return res.json({ message: 'Placement record removed.' });
  } catch (err) {
    console.error('Delete placement error:', err);
    return res.status(500).json({ error: 'Failed to delete placement record.' });
  }
});

// ------------------------------------------------------------
// 9. REPORTS & CSV EXPORT
// ------------------------------------------------------------
router.get('/reports', (_req, res) => {
  try {
    const overall = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM students) as totalStudents,
           (SELECT COUNT(*) FROM placements) as totalPlaced,
           (SELECT COUNT(*) FROM companies) as totalCompanies,
           (SELECT COUNT(*) FROM applications) as totalApplications,
           COALESCE((SELECT ROUND(AVG(package_lpa), 2) FROM placements), 0) as avgPackage,
           COALESCE((SELECT MAX(package_lpa) FROM placements), 0) as highestPackage,
           COALESCE((SELECT MIN(package_lpa) FROM placements), 0) as lowestPackage`
      )
      .get();

    const departmentReport = db
      .prepare(
        `SELECT d.code, d.name,
                COUNT(s.id) as total_students,
                COUNT(p.id) as placed_students,
                COALESCE(ROUND(AVG(p.package_lpa), 2), 0) as avg_package,
                COALESCE(MAX(p.package_lpa), 0) as max_package
         FROM departments d
         LEFT JOIN students s ON s.department_id = d.id
         LEFT JOIN placements p ON p.student_id = s.id
         GROUP BY d.id
         ORDER BY placed_students DESC`
      )
      .all();

    const companyReport = db
      .prepare(
        `SELECT c.name, c.industry, c.location,
                COUNT(DISTINCT j.id) as open_roles,
                COUNT(DISTINCT p.id) as total_hires,
                COALESCE(ROUND(AVG(p.package_lpa), 2), 0) as avg_package,
                COALESCE(MAX(p.package_lpa), 0) as max_package
         FROM companies c
         LEFT JOIN job_openings j ON j.company_id = c.id
         LEFT JOIN placements p ON p.company_id = c.id
         GROUP BY c.id
         ORDER BY total_hires DESC, avg_package DESC`
      )
      .all();

    const applicationStatusReport = db
      .prepare(
        `SELECT status, COUNT(*) as count
         FROM applications
         GROUP BY status
         ORDER BY count DESC`
      )
      .all();

    const yearReport = db
      .prepare(
        `SELECT academic_year,
                COUNT(*) as total_placed,
                ROUND(AVG(package_lpa), 2) as avg_package,
                MAX(package_lpa) as highest_package,
                MIN(package_lpa) as lowest_package
         FROM placements
         GROUP BY academic_year
         ORDER BY academic_year DESC`
      )
      .all();

    return res.json({
      overall,
      departmentReport,
      companyReport,
      applicationStatusReport,
      yearReport,
    });
  } catch (err) {
    console.error('Reports error:', err);
    return res.status(500).json({ error: 'Failed to generate placement reports.' });
  }
});

router.get('/reports/export', (req, res) => {
  try {
    const type = String(req.query.type || 'placements');
    let headers: string[] = [];
    let rows: Array<Array<string | number>> = [];

    if (type === 'students') {
      headers = ['Roll Number', 'Full Name', 'Email', 'Phone', 'Department', 'Course', 'Graduation Year', 'CGPA', 'Placement Status', 'Skills'];
      const data = db
        .prepare(
          `SELECT s.roll_number, s.full_name, s.email, s.phone, d.code, s.course, s.graduation_year, s.cgpa, s.placement_status, s.skills
           FROM students s JOIN departments d ON s.department_id = d.id ORDER BY s.roll_number`
        )
        .all() as Array<Record<string, string | number>>;
      rows = data.map((r) => [r.roll_number, r.full_name, r.email, r.phone, r.code, r.course, r.graduation_year, r.cgpa, r.placement_status, r.skills]);
    } else if (type === 'departments') {
      headers = ['Department Code', 'Department Name', 'Total Students', 'Placed Students', 'Placement %', 'Avg Package (LPA)', 'Highest Package (LPA)'];
      const data = db
        .prepare(
          `SELECT d.code, d.name, COUNT(s.id) as total, COUNT(p.id) as placed,
                  COALESCE(ROUND(AVG(p.package_lpa), 2), 0) as avg_pkg,
                  COALESCE(MAX(p.package_lpa), 0) as max_pkg
           FROM departments d
           LEFT JOIN students s ON s.department_id = d.id
           LEFT JOIN placements p ON p.student_id = s.id
           GROUP BY d.id`
        )
        .all() as Array<Record<string, string | number>>;
      rows = data.map((r) => {
        const total = Number(r.total);
        const placed = Number(r.placed);
        return [r.code, r.name, total, placed, total > 0 ? ((placed / total) * 100).toFixed(1) : '0.0', r.avg_pkg, r.max_pkg];
      });
    } else {
      headers = ['Roll Number', 'Student Name', 'Department', 'Company', 'Job Role', 'Package (LPA)', 'Placement Date', 'Academic Year', 'Status'];
      const data = db
        .prepare(
          `SELECT s.roll_number, s.full_name, d.code as dept_code, c.name as company_name,
                  p.job_role, p.package_lpa, p.placement_date, p.academic_year, p.status
           FROM placements p
           JOIN students s ON p.student_id = s.id
           JOIN departments d ON s.department_id = d.id
           JOIN companies c ON p.company_id = c.id
           ORDER BY p.placement_date DESC`
        )
        .all() as Array<Record<string, string | number>>;
      rows = data.map((r) => [
        r.roll_number,
        r.full_name,
        r.dept_code,
        r.company_name,
        r.job_role,
        r.package_lpa,
        r.placement_date,
        r.academic_year,
        r.status,
      ]);
    }

    const csvEscape = (val: string | number) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvContent = [headers.map(csvEscape).join(','), ...rows.map((row) => row.map(csvEscape).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="placify-${type}-report.csv"`);
    return res.send(csvContent);
  } catch (err) {
    console.error('Export CSV error:', err);
    return res.status(500).json({ error: 'Failed to export CSV report.' });
  }
});

// ------------------------------------------------------------
// 10. BULK CSV IMPORT (STUDENTS, COMPANIES, JOBS, APPLICATIONS, PLACEMENTS)
// ------------------------------------------------------------

router.post('/students/import-csv', (req, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || !csv.trim()) {
      return res.status(400).json({ error: 'Please upload a non-empty CSV file.' });
    }

    const parsedRows = parseCsvText(csv);
    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'CSV must contain a header row and at least one student row.' });
    }

    const deptRows = db.prepare('SELECT id, code, name FROM departments').all() as Array<{
      id: number;
      code: string;
      name: string;
    }>;
    const deptByCode = new Map(deptRows.map((d) => [d.code.toUpperCase(), d.id]));

    const defaultPasswordHash = bcrypt.hashSync('Student@123', 10);
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const insertUser = db.prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)');
    const insertStudent = db.prepare(
      `INSERT INTO students (
        user_id, roll_number, full_name, email, phone, department_id,
        course, graduation_year, cgpa, skills, placement_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const checkEmail = db.prepare('SELECT id FROM students WHERE LOWER(email) = ? UNION SELECT id FROM users WHERE LOWER(email) = ?');
    const checkRoll = db.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?');

    const tx = db.transaction(() => {
      parsedRows.forEach((row, index) => {
        const lineNum = index + 2;
        const roll = (row.roll_number || row.student_id || row.roll_no || '').trim().toUpperCase();
        const fullName = (row.full_name || row.name || row.student_name || '').trim();
        const email = (row.email || '').trim().toLowerCase();
        const phone = (row.phone || row.phone_number || '+91 90000 00000').trim();
        const deptRaw = (row.department || row.department_code || row.dept || '').trim().toUpperCase();
        const course = (row.course || 'B.Tech').trim();
        const gradYear = Number(row.graduation_year || row.batch || 2026);
        const cgpa = Number(row.cgpa);
        const skills = (row.skills || '').trim();
        const statusRaw = (row.placement_status || row.status || 'Unplaced').trim();
        const placementStatus = ['Unplaced', 'In Process', 'Placed'].includes(statusRaw) ? statusRaw : 'Unplaced';

        if (!roll || !fullName || !email || !deptRaw || Number.isNaN(cgpa)) {
          skipped++;
          errors.push(`Row ${lineNum}: Missing required fields (roll_number, full_name, email, department, cgpa).`);
          return;
        }
        if (cgpa < 0 || cgpa > 10) {
          skipped++;
          errors.push(`Row ${lineNum} (${roll}): CGPA must be between 0 and 10.`);
          return;
        }

        const deptId = deptByCode.get(deptRaw);
        if (!deptId) {
          skipped++;
          errors.push(`Row ${lineNum} (${roll}): Unknown department code "${deptRaw}".`);
          return;
        }

        if (checkEmail.get(email, email) || checkRoll.get(roll)) {
          skipped++;
          errors.push(`Row ${lineNum} (${roll}): Duplicate roll number or email already exists.`);
          return;
        }

        const userRes = insertUser.run(email, defaultPasswordHash, 'student', fullName);
        insertStudent.run(
          Number(userRes.lastInsertRowid),
          roll,
          fullName,
          email,
          phone,
          deptId,
          course,
          Number.isNaN(gradYear) ? 2026 : gradYear,
          cgpa,
          skills,
          placementStatus
        );
        imported++;
      });
    });

    tx();
    return res.json({
      imported,
      skipped,
      errors: errors.slice(0, 15),
      message: `Imported ${imported} student${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('Students CSV import error:', err);
    return res.status(500).json({ error: 'Failed to import students CSV.' });
  }
});

router.post('/companies/import-csv', (req, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || !csv.trim()) {
      return res.status(400).json({ error: 'Please upload a non-empty CSV file.' });
    }

    const parsedRows = parseCsvText(csv);
    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'CSV must contain a header row and at least one company row.' });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const checkCompany = db.prepare('SELECT id FROM companies WHERE LOWER(name) = ?');
    const insertCompany = db.prepare(
      `INSERT INTO companies (name, industry, location, website, hr_contact, contact_email, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      parsedRows.forEach((row, index) => {
        const lineNum = index + 2;
        const name = (row.name || row.company_name || '').trim();
        const industry = (row.industry || 'Technology').trim();
        const location = (row.location || 'Bengaluru').trim();
        const website = (row.website || '').trim();
        const hrContact = (row.hr_contact || row.hr_name || 'Campus Recruiting Team').trim();
        const contactEmail = (row.contact_email || row.email || '').trim().toLowerCase();
        const description = (row.description || '').trim();

        if (!name || !contactEmail) {
          skipped++;
          errors.push(`Row ${lineNum}: Missing required company name or contact_email.`);
          return;
        }
        if (checkCompany.get(name.toLowerCase())) {
          skipped++;
          errors.push(`Row ${lineNum} (${name}): Company already exists.`);
          return;
        }

        insertCompany.run(name, industry, location, website, hrContact, contactEmail, description);
        imported++;
      });
    });

    tx();
    return res.json({
      imported,
      skipped,
      errors: errors.slice(0, 15),
      message: `Imported ${imported} compan${imported === 1 ? 'y' : 'ies'}${skipped ? ` (${skipped} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('Companies CSV import error:', err);
    return res.status(500).json({ error: 'Failed to import companies CSV.' });
  }
});

router.post('/jobs/import-csv', (req, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || !csv.trim()) {
      return res.status(400).json({ error: 'Please upload a non-empty CSV file.' });
    }

    const parsedRows = parseCsvText(csv);
    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'CSV must contain a header row and at least one job opening row.' });
    }

    const companyRows = db.prepare('SELECT id, name FROM companies').all() as Array<{ id: number; name: string }>;
    const companyMap = new Map(companyRows.map((c) => [c.name.trim().toLowerCase(), c.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const checkDupJob = db.prepare('SELECT id FROM job_openings WHERE company_id = ? AND LOWER(title) = ?');
    const insertJob = db.prepare(
      `INSERT INTO job_openings (
        company_id, drive_id, title, job_type, package_lpa, location, description,
        min_cgpa, eligible_departments, eligible_year, required_skills, application_deadline, status
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      parsedRows.forEach((row, index) => {
        const lineNum = index + 2;
        const companyName = (row.company_name || row.company || '').trim();
        const title = (row.title || row.job_title || row.role || '').trim();
        const jobTypeRaw = (row.job_type || row.type || 'Full-Time').trim();
        const jobType = ['Full-Time', 'Internship + PPO', 'Internship'].includes(jobTypeRaw) ? jobTypeRaw : 'Full-Time';
        const packageLpa = Number(row.package_lpa || row.package || row.ctc);
        const location = (row.location || 'Bengaluru').trim();
        const description = (row.description || '').trim();
        const minCgpa = Number(row.min_cgpa || 6.5);
        const eligibleDepts = (row.eligible_departments || row.departments || 'ALL').trim().toUpperCase();
        const eligibleYear = Number(row.eligible_year || row.batch || 2026);
        const requiredSkills = (row.required_skills || row.skills || '').trim();
        const deadline = (row.application_deadline || row.deadline || '2026-12-31').trim();
        const statusRaw = (row.status || 'Open').trim();
        const status = ['Open', 'Closed'].includes(statusRaw) ? statusRaw : 'Open';

        if (!companyName || !title || Number.isNaN(packageLpa)) {
          skipped++;
          errors.push(`Row ${lineNum}: Missing company_name, title, or valid package_lpa.`);
          return;
        }

        const companyId = companyMap.get(companyName.toLowerCase());
        if (!companyId) {
          skipped++;
          errors.push(`Row ${lineNum} (${title}): Company "${companyName}" not found. Import companies CSV first.`);
          return;
        }

        if (checkDupJob.get(companyId, title.toLowerCase())) {
          skipped++;
          errors.push(`Row ${lineNum} (${title}): Job opening already exists for ${companyName}.`);
          return;
        }

        insertJob.run(
          companyId,
          title,
          jobType,
          packageLpa,
          location,
          description,
          Number.isNaN(minCgpa) ? 6.5 : minCgpa,
          eligibleDepts || 'ALL',
          Number.isNaN(eligibleYear) ? 2026 : eligibleYear,
          requiredSkills,
          deadline,
          status
        );
        imported++;
      });
    });

    tx();
    return res.json({
      imported,
      skipped,
      errors: errors.slice(0, 15),
      message: `Imported ${imported} job opening${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('Jobs CSV import error:', err);
    return res.status(500).json({ error: 'Failed to import job openings CSV.' });
  }
});

router.post('/applications/import-csv', (req, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || !csv.trim()) {
      return res.status(400).json({ error: 'Please upload a non-empty CSV file.' });
    }

    const parsedRows = parseCsvText(csv);
    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'CSV must contain a header row and at least one application row.' });
    }

    const studentRows = db.prepare('SELECT id, roll_number, email FROM students').all() as Array<{
      id: number;
      roll_number: string;
      email: string;
    }>;
    const studentByRoll = new Map(studentRows.map((s) => [s.roll_number.trim().toUpperCase(), s.id]));
    const studentByEmail = new Map(studentRows.map((s) => [s.email.trim().toLowerCase(), s.id]));

    const jobRows = db
      .prepare(
        `SELECT j.id, j.title, c.name as company_name
         FROM job_openings j
         JOIN companies c ON j.company_id = c.id`
      )
      .all() as Array<{ id: number; title: string; company_name: string }>;
    const jobByKey = new Map(
      jobRows.map((j) => [`${j.company_name.trim().toLowerCase()}::${j.title.trim().toLowerCase()}`, j.id])
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const checkApp = db.prepare('SELECT id FROM applications WHERE student_id = ? AND job_id = ?');
    const insertApp = db.prepare(
      `INSERT INTO applications (student_id, job_id, status, cover_note, applied_at)
       VALUES (?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      parsedRows.forEach((row, index) => {
        const lineNum = index + 2;
        const roll = (row.roll_number || row.student_id || '').trim().toUpperCase();
        const email = (row.email || row.student_email || '').trim().toLowerCase();
        const companyName = (row.company_name || row.company || '').trim().toLowerCase();
        const jobTitle = (row.job_title || row.title || row.job_role || '').trim().toLowerCase();
        const statusRaw = (row.status || 'Applied').trim();
        const status = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].includes(statusRaw)
          ? statusRaw
          : 'Applied';
        const coverNote = (row.cover_note || '').trim();
        const appliedAt = (row.applied_at || row.applied_date || new Date().toISOString().slice(0, 19).replace('T', ' ')).trim();

        const studentId = (roll && studentByRoll.get(roll)) || (email && studentByEmail.get(email));
        if (!studentId) {
          skipped++;
          errors.push(`Row ${lineNum}: Student "${roll || email}" not found.`);
          return;
        }

        const jobId = jobByKey.get(`${companyName}::${jobTitle}`);
        if (!jobId) {
          skipped++;
          errors.push(`Row ${lineNum}: Job "${row.job_title || row.title}" at "${row.company_name || row.company}" not found.`);
          return;
        }

        if (checkApp.get(studentId, jobId)) {
          skipped++;
          errors.push(`Row ${lineNum}: Application already exists for ${roll || email}.`);
          return;
        }

        insertApp.run(studentId, jobId, status, coverNote, appliedAt);
        imported++;
      });
    });

    tx();
    return res.json({
      imported,
      skipped,
      errors: errors.slice(0, 15),
      message: `Imported ${imported} application${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('Applications CSV import error:', err);
    return res.status(500).json({ error: 'Failed to import applications CSV.' });
  }
});

router.post('/placements/import-csv', (req, res) => {
  try {
    const { csv } = req.body as { csv?: string };
    if (!csv || !csv.trim()) {
      return res.status(400).json({ error: 'Please upload a non-empty CSV file.' });
    }

    const parsedRows = parseCsvText(csv);
    if (parsedRows.length === 0) {
      return res.status(400).json({ error: 'CSV must contain a header row and at least one placement row.' });
    }

    const studentRows = db.prepare('SELECT id, roll_number, email FROM students').all() as Array<{
      id: number;
      roll_number: string;
      email: string;
    }>;
    const studentByRoll = new Map(studentRows.map((s) => [s.roll_number.trim().toUpperCase(), s.id]));
    const studentByEmail = new Map(studentRows.map((s) => [s.email.trim().toLowerCase(), s.id]));

    const companyRows = db.prepare('SELECT id, name FROM companies').all() as Array<{ id: number; name: string }>;
    const companyMap = new Map(companyRows.map((c) => [c.name.trim().toLowerCase(), c.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const checkPlaced = db.prepare('SELECT id FROM placements WHERE student_id = ?');
    const insertPlacement = db.prepare(
      `INSERT INTO placements (
        student_id, company_id, job_id, application_id, job_role, package_lpa,
        placement_date, academic_year, status
      ) VALUES (?, ?, NULL, NULL, ?, ?, ?, ?, ?)`
    );
    const markPlaced = db.prepare("UPDATE students SET placement_status = 'Placed' WHERE id = ?");

    const tx = db.transaction(() => {
      parsedRows.forEach((row, index) => {
        const lineNum = index + 2;
        const roll = (row.roll_number || row.student_id || '').trim().toUpperCase();
        const email = (row.email || row.student_email || '').trim().toLowerCase();
        const companyName = (row.company_name || row.company || '').trim();
        const jobRole = (row.job_role || row.role || row.title || '').trim();
        const packageLpa = Number(row.package_lpa || row.package || row.ctc);
        const placementDate = (row.placement_date || row.date || new Date().toISOString().slice(0, 10)).trim();
        const academicYear = (row.academic_year || '2025-26').trim();
        const statusRaw = (row.status || 'Offer Accepted').trim();
        const status = ['Offer Accepted', 'Offer Pending', 'Joined'].includes(statusRaw)
          ? statusRaw
          : 'Offer Accepted';

        const studentId = (roll && studentByRoll.get(roll)) || (email && studentByEmail.get(email));
        if (!studentId) {
          skipped++;
          errors.push(`Row ${lineNum}: Student "${roll || email}" not found. Import students CSV first.`);
          return;
        }

        const companyId = companyMap.get(companyName.toLowerCase());
        if (!companyId) {
          skipped++;
          errors.push(`Row ${lineNum}: Company "${companyName}" not found. Import companies CSV first.`);
          return;
        }

        if (!jobRole || Number.isNaN(packageLpa)) {
          skipped++;
          errors.push(`Row ${lineNum} (${roll || email}): Missing job_role or valid package_lpa.`);
          return;
        }

        if (checkPlaced.get(studentId)) {
          skipped++;
          errors.push(`Row ${lineNum} (${roll || email}): Student already has a recorded placement.`);
          return;
        }

        insertPlacement.run(studentId, companyId, jobRole, packageLpa, placementDate, academicYear, status);
        markPlaced.run(studentId);
        imported++;
      });
    });

    tx();
    return res.json({
      imported,
      skipped,
      errors: errors.slice(0, 15),
      message: `Imported ${imported} placement record${imported === 1 ? '' : 's'}${skipped ? ` (${skipped} skipped)` : ''}.`,
    });
  } catch (err) {
    console.error('Placements CSV import error:', err);
    return res.status(500).json({ error: 'Failed to import placements CSV.' });
  }
});

export default router;


