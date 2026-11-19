export interface User {
  id: number;
  email: string;
  role: 'admin' | 'student';
  full_name: string;
  student_id?: number;
}

export interface Department {
  id: number;
  code: string;
  name: string;
  hod_name: string;
}

export interface Student {
  id: number;
  user_id?: number | null;
  roll_number: string;
  full_name: string;
  email: string;
  phone: string;
  department_id: number;
  department_code?: string;
  department_name?: string;
  course: string;
  graduation_year: number;
  cgpa: number;
  skills: string;
  resume_url: string;
  resume_summary: string;
  placement_status: 'Unplaced' | 'In Process' | 'Placed';
  created_at?: string;
}

export interface Company {
  id: number;
  name: string;
  industry: string;
  location: string;
  website: string;
  hr_contact: string;
  contact_email: string;
  description: string;
  jobs_count?: number;
  open_jobs_count?: number;
  drives_count?: number;
  placements_count?: number;
  created_at?: string;
}

export interface PlacementDrive {
  id: number;
  title: string;
  company_id: number;
  company_name?: string;
  job_role: string;
  drive_date: string;
  registration_deadline: string;
  venue: string;
  description: string;
  min_cgpa: number;
  eligible_departments: string;
  eligible_year: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled';
  jobs_count?: number;
  applicants_count?: number;
}

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

export interface JobOpening {
  id: number;
  company_id: number;
  company_name?: string;
  company_industry?: string;
  drive_id?: number | null;
  drive_title?: string | null;
  drive_date?: string | null;
  title: string;
  job_type: 'Full-Time' | 'Internship + PPO' | 'Internship';
  package_lpa: number;
  location: string;
  description: string;
  min_cgpa: number;
  eligible_departments: string;
  eligible_year: number;
  required_skills: string;
  application_deadline: string;
  status: 'Open' | 'Closed';
  applications_count?: number;
  application_id?: number | null;
  application_status?: string | null;
  applied_at?: string | null;
  eligibility?: EligibilityResult;
}

export interface Application {
  id: number;
  student_id: number;
  job_id: number;
  status: 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';
  cover_note: string;
  applied_at: string;
  updated_at?: string;
  student_name?: string;
  roll_number?: string;
  student_email?: string;
  cgpa?: number;
  student_skills?: string;
  department_id?: number;
  department_code?: string;
  department_name?: string;
  job_title?: string;
  job_type?: string;
  job_location?: string;
  package_lpa?: number;
  company_id?: number;
  company_name?: string;
  company_industry?: string;
}

export interface Interview {
  id: number;
  application_id?: number | null;
  student_id: number;
  job_id: number;
  company_id: number;
  interview_date: string;
  interview_time: string;
  mode: 'In-Person' | 'Online' | 'Hybrid';
  location_or_link: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  result: 'Pending' | 'Passed' | 'Failed';
  feedback: string;
  student_name?: string;
  roll_number?: string;
  department_code?: string;
  job_title?: string;
  company_name?: string;
}

export interface Placement {
  id: number;
  student_id: number;
  company_id: number;
  job_id?: number | null;
  application_id?: number | null;
  job_role: string;
  package_lpa: number;
  placement_date: string;
  academic_year: string;
  status: 'Offer Accepted' | 'Offer Pending' | 'Joined';
  student_name?: string;
  roll_number?: string;
  student_email?: string;
  department_code?: string;
  department_name?: string;
  company_name?: string;
  company_industry?: string;
  company_location?: string;
}

export interface AdminDashboardData {
  stats: {
    totalStudents: number;
    totalCompanies: number;
    totalDrives: number;
    totalJobs: number;
    totalApplications: number;
    totalPlaced: number;
    placementPercentage: number;
    avgPackage: number;
    highestPackage: number;
  };
  charts: {
    deptStudentDist: Array<{ code: string; name: string; count: number }>;
    deptPlacementPerf: Array<{ code: string; name: string; total: number; placed: number; rate: number }>;
    applicationStatusDist: Array<{ status: string; count: number }>;
    companyPlacements: Array<{ company: string; placedCount: number; avgPackage: number }>;
    yearWisePlacements: Array<{ academicYear: string; placedCount: number; avgPackage: number; highestPackage: number }>;
    packageTrend: Array<{ month: string; avgPackage: number; offers: number }>;
  };
  recent: {
    upcomingDrives: PlacementDrive[];
    recentApplications: Application[];
    recentStudents: Student[];
    recentCompanies: Company[];
    recentPlacements: Placement[];
  };
}
