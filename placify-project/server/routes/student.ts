import { Router } from 'express';
import { db } from '../db';
import { evaluateEligibility } from '../eligibility';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth, requireRole('student'));

function getLoggedInStudent(req: AuthenticatedRequest) {
  const user = req.user!;
  return db
    .prepare(
      `SELECT s.*, d.code as department_code, d.name as department_name
       FROM students s
       JOIN departments d ON s.department_id = d.id
       WHERE s.user_id = ? OR LOWER(s.email) = ?`
    )
    .get(user.id, user.email.toLowerCase()) as
    | {
        id: number;
        user_id: number;
        roll_number: string;
        full_name: string;
        email: string;
        phone: string;
        department_id: number;
        department_code: string;
        department_name: string;
        course: string;
        graduation_year: number;
        cgpa: number;
        skills: string;
        resume_url: string;
        resume_summary: string;
        placement_status: string;
      }
    | undefined;
}

router.get('/dashboard', (req: AuthenticatedRequest, res) => {
  try {
    const student = getLoggedInStudent(req);
    if (!student) {
      return res.status(404).json({ error: 'Student profile record not found.' });
    }

    const jobsRaw = db
      .prepare(
        `SELECT j.*, c.name as company_name, c.industry as company_industry, c.location as company_hq,
                d.title as drive_title, d.drive_date,
                a.id as application_id, a.status as application_status, a.applied_at
         FROM job_openings j
         JOIN companies c ON j.company_id = c.id
         LEFT JOIN placement_drives d ON j.drive_id = d.id
         LEFT JOIN applications a ON a.job_id = j.id AND a.student_id = ?
         ORDER BY j.status ASC, j.application_deadline ASC`
      )
      .all(student.id) as Array<Record<string, unknown>>;

    const jobs = jobsRaw.map((job) => {
      const eligibility = evaluateEligibility(student, {
        min_cgpa: Number(job.min_cgpa),
        eligible_departments: String(job.eligible_departments),
        eligible_year: Number(job.eligible_year),
        required_skills: String(job.required_skills || ''),
        application_deadline: String(job.application_deadline),
        status: String(job.status),
      });
      return { ...job, eligibility };
    });

    const applications = db
      .prepare(
        `SELECT a.*, j.title as job_title, j.package_lpa, j.location as job_location, j.job_type,
                c.name as company_name, c.industry as company_industry
         FROM applications a
         JOIN job_openings j ON a.job_id = j.id
         JOIN companies c ON j.company_id = c.id
         WHERE a.student_id = ?
         ORDER BY a.applied_at DESC`
      )
      .all(student.id);

    const interviews = db
      .prepare(
        `SELECT i.*, j.title as job_title, c.name as company_name
         FROM interviews i
         JOIN job_openings j ON i.job_id = j.id
         JOIN companies c ON i.company_id = c.id
         WHERE i.student_id = ?
         ORDER BY i.interview_date ASC`
      )
      .all(student.id);

    const placement = db
      .prepare(
        `SELECT p.*, c.name as company_name, c.industry as company_industry, c.location as company_location
         FROM placements p
         JOIN companies c ON p.company_id = c.id
         WHERE p.student_id = ?`
      )
      .get(student.id);

    const drives = db
      .prepare(
        `SELECT d.*, c.name as company_name
         FROM placement_drives d
         JOIN companies c ON d.company_id = c.id
         WHERE d.status IN ('Upcoming', 'Ongoing')
         ORDER BY d.drive_date ASC`
      )
      .all();

    return res.json({
      student,
      jobs,
      applications,
      interviews,
      placement: placement || null,
      drives,
    });
  } catch (err) {
    console.error('Student dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load student dashboard.' });
  }
});

router.put('/profile', (req: AuthenticatedRequest, res) => {
  try {
    const student = getLoggedInStudent(req);
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const { phone, skills, resume_url, resume_summary } = req.body;
    if (!phone || String(phone).trim().length < 7) {
      return res.status(400).json({ error: 'Please provide a valid phone number.' });
    }

    db.prepare(
      `UPDATE students
       SET phone = ?, skills = ?, resume_url = ?, resume_summary = ?
       WHERE id = ?`
    ).run(
      String(phone).trim(),
      String(skills ?? student.skills).trim(),
      String(resume_url ?? student.resume_url).trim(),
      String(resume_summary ?? student.resume_summary).trim(),
      student.id
    );

    const updated = getLoggedInStudent(req);
    return res.json({ student: updated, message: 'Profile updated successfully.' });
  } catch (err) {
    console.error('Update student profile error:', err);
    return res.status(500).json({ error: 'Failed to update student profile.' });
  }
});

router.get('/eligibility/:jobId', (req: AuthenticatedRequest, res) => {
  try {
    const student = getLoggedInStudent(req);
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    const job = db
      .prepare(
        `SELECT j.*, c.name as company_name
         FROM job_openings j
         JOIN companies c ON j.company_id = c.id
         WHERE j.id = ?`
      )
      .get(Number(req.params.jobId)) as Record<string, unknown> | undefined;

    if (!job) return res.status(404).json({ error: 'Job opening not found.' });

    const eligibility = evaluateEligibility(student, {
      min_cgpa: Number(job.min_cgpa),
      eligible_departments: String(job.eligible_departments),
      eligible_year: Number(job.eligible_year),
      required_skills: String(job.required_skills || ''),
      application_deadline: String(job.application_deadline),
      status: String(job.status),
    });

    return res.json({ job, eligibility });
  } catch (err) {
    console.error('Eligibility check error:', err);
    return res.status(500).json({ error: 'Failed to evaluate eligibility.' });
  }
});

router.post('/applications', (req: AuthenticatedRequest, res) => {
  try {
    const student = getLoggedInStudent(req);
    if (!student) return res.status(404).json({ error: 'Student profile not found.' });

    const { job_id, cover_note } = req.body;
    if (!job_id) return res.status(400).json({ error: 'Job ID is required.' });

    const job = db.prepare('SELECT * FROM job_openings WHERE id = ?').get(Number(job_id)) as Record<string, unknown> | undefined;
    if (!job) return res.status(404).json({ error: 'Job opening not found.' });

    const existing = db
      .prepare('SELECT id FROM applications WHERE student_id = ? AND job_id = ?')
      .get(student.id, Number(job_id));
    if (existing) {
      return res.status(409).json({ error: 'You have already applied for this job opening.' });
    }

    const eligibility = evaluateEligibility(student, {
      min_cgpa: Number(job.min_cgpa),
      eligible_departments: String(job.eligible_departments),
      eligible_year: Number(job.eligible_year),
      required_skills: String(job.required_skills || ''),
      application_deadline: String(job.application_deadline),
      status: String(job.status),
    });

    if (!eligibility.eligible) {
      return res.status(400).json({
        error: `You are not eligible for this role: ${eligibility.reasons.join(' ')}`,
        eligibility,
      });
    }

    const result = db.transaction(() => {
      const insert = db
        .prepare("INSERT INTO applications (student_id, job_id, status, cover_note) VALUES (?, ?, 'Applied', ?)")
        .run(student.id, Number(job_id), String(cover_note || '').trim());

      if (student.placement_status === 'Unplaced') {
        db.prepare("UPDATE students SET placement_status = 'In Process' WHERE id = ?").run(student.id);
      }

      return Number(insert.lastInsertRowid);
    })();

    return res.status(201).json({
      id: result,
      message: 'Application submitted successfully.',
    });
  } catch (err) {
    console.error('Submit application error:', err);
    return res.status(500).json({ error: 'Failed to submit job application.' });
  }
});

export default router;
