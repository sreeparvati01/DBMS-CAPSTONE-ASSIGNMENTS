export interface EligibilityCheckItem {
  label: string;
  passed: boolean;
  detail: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  checks: EligibilityCheckItem[];
  skillMatchPercent: number;
}

interface StudentEligibilityInput {
  cgpa: number;
  department_code: string;
  graduation_year: number;
  skills: string;
  placement_status: string;
}

interface JobEligibilityInput {
  min_cgpa: number;
  eligible_departments: string;
  eligible_year: number;
  required_skills: string;
  application_deadline: string;
  status: string;
}

export function evaluateEligibility(
  student: StudentEligibilityInput,
  job: JobEligibilityInput
): EligibilityResult {
  const checks: EligibilityCheckItem[] = [];
  const reasons: string[] = [];

  // 1. Job status
  const isOpen = job.status === 'Open';
  checks.push({
    label: 'Opening Status',
    passed: isOpen,
    detail: isOpen ? 'Applications are currently open' : 'This job opening is closed',
  });
  if (!isOpen) reasons.push('This job opening is currently closed.');

  // 2. Application deadline
  const todayStr = new Date().toISOString().slice(0, 10);
  const beforeDeadline = !job.application_deadline || job.application_deadline >= todayStr;
  checks.push({
    label: 'Application Deadline',
    passed: beforeDeadline,
    detail: beforeDeadline
      ? `Deadline is ${job.application_deadline}`
      : `Deadline (${job.application_deadline}) has passed`,
  });
  if (!beforeDeadline) reasons.push(`Application deadline (${job.application_deadline}) has passed.`);

  // 3. Minimum CGPA
  const cgpaOk = Number(student.cgpa) >= Number(job.min_cgpa);
  checks.push({
    label: 'Minimum CGPA',
    passed: cgpaOk,
    detail: `Your CGPA ${Number(student.cgpa).toFixed(2)} vs required ${Number(job.min_cgpa).toFixed(2)}`,
  });
  if (!cgpaOk) {
    reasons.push(`Minimum CGPA required is ${Number(job.min_cgpa).toFixed(2)} (your CGPA is ${Number(student.cgpa).toFixed(2)}).`);
  }

  // 4. Department eligibility
  const allowedDepts = (job.eligible_departments || 'ALL')
    .split(',')
    .map((d) => d.trim().toUpperCase())
    .filter(Boolean);
  const deptOk = allowedDepts.includes('ALL') || allowedDepts.includes((student.department_code || '').toUpperCase());
  checks.push({
    label: 'Department',
    passed: deptOk,
    detail: deptOk
      ? `${student.department_code} is eligible (${allowedDepts.join(', ')})`
      : `${student.department_code} not in allowed departments (${allowedDepts.join(', ')})`,
  });
  if (!deptOk) {
    reasons.push(`Open only to ${allowedDepts.join(', ')} departments (yours is ${student.department_code}).`);
  }

  // 5. Graduation year
  const yearOk = !job.eligible_year || Number(job.eligible_year) === 0 || Number(student.graduation_year) === Number(job.eligible_year);
  checks.push({
    label: 'Graduation Year',
    passed: yearOk,
    detail: yearOk
      ? `Batch ${student.graduation_year} matches requirement`
      : `Requires ${job.eligible_year} batch (your batch is ${student.graduation_year})`,
  });
  if (!yearOk) {
    reasons.push(`Restricted to ${job.eligible_year} graduating batch (your batch is ${student.graduation_year}).`);
  }

  // 6. Required skills match (advisory + threshold check if configured)
  const requiredSkills = (job.required_skills || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const studentSkills = (student.skills || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  let skillMatchPercent = 100;
  let skillsOk = true;
  if (requiredSkills.length > 0) {
    const matched = requiredSkills.filter((req) =>
      studentSkills.some((st) => st.includes(req.toLowerCase()) || req.toLowerCase().includes(st))
    );
    skillMatchPercent = Math.round((matched.length / requiredSkills.length) * 100);
    // Require at least 1 matching skill when required skills are configured
    skillsOk = matched.length > 0;
    const missing = requiredSkills.filter((req) => !matched.includes(req));
    checks.push({
      label: 'Required Skills',
      passed: skillsOk,
      detail: skillsOk
        ? `Matched ${matched.length}/${requiredSkills.length} (${matched.join(', ')})`
        : `Missing required skills: ${missing.join(', ')}`,
    });
    if (!skillsOk) {
      reasons.push(`Missing required skills (${missing.join(', ')}). Update your profile skills if applicable.`);
    }
  }

  return {
    eligible: checks.every((c) => c.passed),
    reasons,
    checks,
    skillMatchPercent,
  };
}
