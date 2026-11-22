export type VerificationStatus = 'verified' | 'historical' | 'needs_review' | 'unavailable';

export interface Spring2027Eligibility {
  general?: string;
  diploma_holder?: string;
  english_medium?: string;
  foreign_student?: string;
  postgraduate?: string;
  eligibility_status?: string;
  manual_confirmation_required?: boolean;
}

export interface Spring2027Fees {
  currency: string;
  academic_intake: string;
  total_semesters: number;
  total_credits: number;
  admission_fee: number;
  fee_per_credit: number;
  payable_during_admission_including_first_semester_registration_and_listed_fees: number;
  total_credit_fee: number;
  published_total_cost: number;
  published_scholarship_offer: string;
  published_scholarship_adjusted_maximum_cost: number;
  fee_source_url: string;
  fee_last_updated: string;
  fee_status: string;
  estimated_duration_months: number;
  monthly_average_cost_bdt: number;
  monthly_average_after_published_scholarship_bdt: number;
  monthly_estimate_method: string;
  monthly_estimate_note: string;
}

export interface Spring2027Program {
  program_name: string;
  school: string;
  level: 'undergraduate' | 'graduate';
  eligibility: Spring2027Eligibility;
  fees: Spring2027Fees;
  eligibility_source_url: string;
  eligibility_last_updated: string;
  official_program_list_source: string;
  record_status: string;
}

export interface Spring2027Dataset {
  dataset_title: string;
  dataset_version: string;
  prepared_on: string;
  current_fee_intake: string;
  fee_page_last_updated: string;
  eligibility_page_last_updated: string;
  official_sources: Record<string, string>;
  university_contact: {
    admission_email: string;
    hunting_number: string;
    admission_hotline: string;
  };
  programs: Spring2027Program[];
  scholarship_policy: {
    intake: string;
    effective_from: string;
    last_updated: string;
    selected_rules: Array<{
      rule: string;
      condition?: string;
      offer?: string;
      bands?: Array<{ combined_gpa: string; scholarship_percent: number }>;
    }>;
    source_url: string;
    status: string;
  };
}

export interface KnowledgeRecord {
  id: string;
  category: string;
  title: string;
  content: string;
  program_name: string | null;
  source_url: string;
  source_type: string;
  last_verified: string;
  validity_period: string;
  verification_status: VerificationStatus;
  school?: string;
  department?: string;
  level?: string;
  min_ssc_gpa?: number;
  min_hsc_gpa?: number;
  min_combined_gpa?: number;
  required_group?: string;
  subject_requirements?: string;
  program_category?: string;
  total_cost_bdt?: number | null;
  scholarship_offer?: string;
  calculator_url?: string;
  important_subjects?: string[];
  career_paths?: string[];
  recommended_skills?: string[];
  address?: string;
  hunting_number?: string;
  mobile_range?: string;
  email?: string;
}

export interface LeadershipEntry {
  id: string;
  name: string;
  designation: string;
  roleCategory: 'executive' | 'dean' | 'proctorial' | 'director_chair';
  schoolOrDepartment: string;
  publicEmail: string | null;
  officialPhotoUrl: string | null;
  profileOrSourceUrl: string;
  sourceUrl?: string;
  photoStatus: string;
  verificationNote?: string;
}

export interface KnowledgeBundle {
  universityData: KnowledgeRecord[];
  undergraduatePrograms: KnowledgeRecord[];
  graduatePrograms: KnowledgeRecord[];
  admissionRequirements: KnowledgeRecord[];
  tuitionFees: KnowledgeRecord[];
  scholarshipPolicy: KnowledgeRecord[];
  departments: KnowledgeRecord[];
  faq: KnowledgeRecord[];
  contact: KnowledgeRecord[];
  spring2027Dataset?: Spring2027Dataset;
  leadershipDirectory?: LeadershipEntry[];
}

export interface VerificationSummary {
  verified: number;
  needs_review: number;
  historical: number;
  unavailable: number;
  total: number;
}

export interface SourceReference {
  title: string;
  url: string;
  status: VerificationStatus;
  lastVerified: string;
}

export interface FeeCardData {
  programName: string;
  programCategory: string;
  intake?: string;
  totalSemesters?: number | null;
  totalCredits?: number | null;
  admissionFee?: number | null;
  feePerCredit?: number | null;
  payableAtAdmission?: number | null;
  totalCreditFee?: number | null;
  totalCostBdt: number | null;
  scholarshipOffer?: string;
  scholarshipAdjustedCost?: number | null;
  monthlyAverageBdt?: number | null;
  monthlyAverageAfterScholarshipBdt?: number | null;
  estimatedDurationMonths?: number | null;
  calculatorUrl: string;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastUpdated?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SourceReference[];
  feeCards?: FeeCardData[];
  leadershipCards?: LeadershipEntry[];
  followUpSuggestions?: string[];
  verificationNote?: string;
  isError?: boolean;
}

export type WorkspaceTab = 'chat' | 'eligibility' | 'scholarship' | 'compare' | 'leadership';

export const WELCOME_MESSAGE = `আসসালামু আলাইকুম! Welcome to Uttara University.

আমি Uttara University AI Admission Assistant।

ভর্তি, বিভাগ, Spring 2027 টিউশন ফি, স্কলারশিপ এবং ক্যারিয়ার সংক্রান্ত তথ্য জানতে আমাকে প্রশ্ন করতে পারেন।

কীভাবে আপনাকে সাহায্য করতে পারি?`;

export const QUICK_REPLY_TOPICS: Array<{ label: string; prompt: string }> = [
  {
    label: 'Admission Requirements',
    prompt: 'What are the undergraduate admission requirements for CSE, EEE, BBA, English, and LLB?',
  },
  {
    label: 'Tuition Fees',
    prompt: 'What is the Spring 2027 tuition fee and monthly estimate for BSc in CSE?',
  },
  {
    label: 'Admission Deadline',
    prompt: 'When is admission open and what is the application deadline?',
  },
  {
    label: 'Available Departments',
    prompt: 'What academic schools, departments, and undergraduate/graduate programs are offered at Uttara University?',
  },
  {
    label: 'Scholarship',
    prompt: 'Tell me about the Spring 2027 Scholarship Policy including merit chart, Founder Scholarship, and the 5% female scholarship.',
  },
  {
    label: 'Required Documents',
    prompt: 'ভর্তির জন্য কী কী কাগজপত্র বা ডকুমেন্ট প্রয়োজন?',
  },
  {
    label: 'Career Opportunities',
    prompt: 'What are the career opportunities and recommended skills for CSE, BBA, and Civil Engineering graduates?',
  },
  {
    label: 'Contact Admission Office',
    prompt: 'How can I contact the Uttara University Admission Office and where is the campus located?',
  },
];

export const ASSETS = {
  universityLogo: '/src/assets/images/university_logo_1795324016328.jpg',
  assistantAvatar: '/src/assets/images/assistant_avatar_1795324017521.jpg',
  campusBanner: '/src/assets/images/campus_banner_1795324017577.jpg',
};
