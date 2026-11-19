import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { requireAuth, signToken, type AuthenticatedRequest, type AuthUser } from '../middleware/auth';

const router = Router();

router.post('/login', (req, res) => {
  try {
    const { email, password, role, rememberMe } = req.body as {
      email?: string;
      password?: string;
      role?: 'admin' | 'student';
      rememberMe?: boolean;
    };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = db
      .prepare('SELECT id, email, password_hash, role, full_name FROM users WHERE LOWER(email) = ?')
      .get(normalizedEmail) as
      | { id: number; email: string; password_hash: string; role: 'admin' | 'student'; full_name: string }
      | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (role && user.role !== role) {
      return res.status(403).json({
        error: `This account is registered as ${user.role === 'admin' ? 'Administrator' : 'Student'}. Please switch role and try again.`,
      });
    }

    const passwordValid = bcrypt.compareSync(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = db
        .prepare(
          `SELECT s.*, d.code as department_code, d.name as department_name
           FROM students s
           JOIN departments d ON s.department_id = d.id
           WHERE s.user_id = ? OR LOWER(s.email) = ?`
        )
        .get(user.id, normalizedEmail) as { id: number } | undefined;
    }

    const payload: AuthUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      student_id: studentProfile?.id,
    };

    const token = signToken(payload, Boolean(rememberMe));

    res.cookie('placify_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: rememberMe ? 30 * 24 * 3600 * 1000 : 24 * 3600 * 1000,
    });

    return res.json({
      token,
      user: payload,
      student: studentProfile,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Unable to complete sign-in. Please try again.' });
  }
});

router.post('/register', (req, res) => {
  try {
    const {
      full_name,
      email,
      password,
      roll_number,
      phone,
      department_id,
      course,
      graduation_year,
      cgpa,
      skills,
    } = req.body;

    if (!full_name || !email || !password || !roll_number || !phone || !department_id || !graduation_year || cgpa === undefined) {
      return res.status(400).json({ error: 'All required student fields must be completed.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const numericCgpa = Number(cgpa);
    if (Number.isNaN(numericCgpa) || numericCgpa < 0 || numericCgpa > 10) {
      return res.status(400).json({ error: 'CGPA must be a valid number between 0.00 and 10.00.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existingEmail = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = ? UNION SELECT id FROM students WHERE LOWER(email) = ?')
      .get(normalizedEmail, normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const existingRoll = db.prepare('SELECT id FROM students WHERE UPPER(roll_number) = ?').get(String(roll_number).trim().toUpperCase());
    if (existingRoll) {
      return res.status(409).json({ error: 'A student with this Roll / Registration ID already exists.' });
    }

    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(Number(department_id));
    if (!dept) {
      return res.status(400).json({ error: 'Selected department is invalid.' });
    }

    const hash = bcrypt.hashSync(String(password), 10);

    const result = db.transaction(() => {
      const userRes = db
        .prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)')
        .run(normalizedEmail, hash, 'student', String(full_name).trim());
      const userId = Number(userRes.lastInsertRowid);

      const studentRes = db
        .prepare(
          `INSERT INTO students (
            user_id, roll_number, full_name, email, phone, department_id,
            course, graduation_year, cgpa, skills, placement_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unplaced')`
        )
        .run(
          userId,
          String(roll_number).trim().toUpperCase(),
          String(full_name).trim(),
          normalizedEmail,
          String(phone).trim(),
          Number(department_id),
          String(course || 'B.Tech').trim(),
          Number(graduation_year),
          numericCgpa,
          String(skills || '').trim()
        );

      return { userId, studentId: Number(studentRes.lastInsertRowid) };
    })();

    const studentProfile = db
      .prepare(
        `SELECT s.*, d.code as department_code, d.name as department_name
         FROM students s
         JOIN departments d ON s.department_id = d.id
         WHERE s.id = ?`
      )
      .get(result.studentId);

    const payload: AuthUser = {
      id: result.userId,
      email: normalizedEmail,
      role: 'student',
      full_name: String(full_name).trim(),
      student_id: result.studentId,
    };

    const token = signToken(payload, false);
    res.cookie('placify_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 24 * 3600 * 1000 });

    return res.status(201).json({
      token,
      user: payload,
      student: studentProfile,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Registration failed. Please verify your details.' });
  }
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = db
        .prepare(
          `SELECT s.*, d.code as department_code, d.name as department_name
           FROM students s
           JOIN departments d ON s.department_id = d.id
           WHERE s.user_id = ? OR LOWER(s.email) = ?`
        )
        .get(user.id, user.email.toLowerCase());
    }
    return res.json({ user, student: studentProfile });
  } catch (err) {
    console.error('Me endpoint error:', err);
    return res.status(500).json({ error: 'Failed to retrieve current session.' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('placify_token');
  return res.json({ message: 'Signed out successfully.' });
});

export default router;
