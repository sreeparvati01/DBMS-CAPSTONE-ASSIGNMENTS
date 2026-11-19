import { Router } from 'express';
import { db } from '../db';

const router = Router();

router.get('/departments', (_req, res) => {
  try {
    const departments = db.prepare('SELECT id, code, name, hod_name FROM departments ORDER BY code ASC').all();
    return res.json({ departments });
  } catch (err) {
    console.error('Error fetching departments:', err);
    return res.status(500).json({ error: 'Failed to load departments.' });
  }
});

router.get('/public/stats', (_req, res) => {
  try {
    const students = (db.prepare('SELECT COUNT(*) as c FROM students').get() as { c: number }).c;
    const companies = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }).c;
    const openJobs = (db.prepare("SELECT COUNT(*) as c FROM job_openings WHERE status = 'Open'").get() as { c: number }).c;
    const totalJobs = (db.prepare('SELECT COUNT(*) as c FROM job_openings').get() as { c: number }).c;
    const applications = (db.prepare('SELECT COUNT(*) as c FROM applications').get() as { c: number }).c;
    const placements = (db.prepare('SELECT COUNT(*) as c FROM placements').get() as { c: number }).c;

    return res.json({
      students,
      companies,
      openJobs,
      totalJobs,
      applications,
      placements,
    });
  } catch (err) {
    console.error('Error fetching public stats:', err);
    return res.status(500).json({ error: 'Failed to load placement statistics.' });
  }
});

router.get('/public/jobs', (req, res) => {
  try {
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || 'Open');

    const rows = db
      .prepare(
        `SELECT j.*, c.name as company_name, c.industry as company_industry, c.location as company_location,
                d.title as drive_title, d.drive_date
         FROM job_openings j
         JOIN companies c ON j.company_id = c.id
         LEFT JOIN placement_drives d ON j.drive_id = d.id
         WHERE (? = 'ALL' OR j.status = ?)
         ORDER BY j.status ASC, j.package_lpa DESC`
      )
      .all(status, status) as Array<Record<string, unknown>>;

    const filtered = search
      ? rows.filter(
          (r) =>
            String(r.title).toLowerCase().includes(search) ||
            String(r.company_name).toLowerCase().includes(search) ||
            String(r.location).toLowerCase().includes(search) ||
            String(r.required_skills).toLowerCase().includes(search)
        )
      : rows;

    return res.json({ jobs: filtered });
  } catch (err) {
    console.error('Error fetching public jobs:', err);
    return res.status(500).json({ error: 'Failed to load job openings.' });
  }
});

router.get('/public/companies', (_req, res) => {
  try {
    const companies = db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM job_openings j WHERE j.company_id = c.id AND j.status = 'Open') as open_jobs_count,
                (SELECT COUNT(*) FROM placement_drives d WHERE d.company_id = c.id) as drives_count,
                (SELECT COUNT(*) FROM placements p WHERE p.company_id = c.id) as placements_count
         FROM companies c
         ORDER BY c.name ASC`
      )
      .all();

    return res.json({ companies });
  } catch (err) {
    console.error('Error fetching public companies:', err);
    return res.status(500).json({ error: 'Failed to load partner companies.' });
  }
});

export default router;
