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
    note?: string;
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
  data_quality_notes: string[];
  monthly_cost_calculation: {
    purpose: string;
    formula: string;
    general_program_calendar: string;
    law_program_calendar: string;
    important_caveat: string;
    official_policy_source: string;
    academic_calendar_source: string;
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
  admission_fee?: number | null;
  total_credits?: number | null;
  total_semesters?: number | null;
  fee_per_credit?: number | null;
  payable_at_admission?: number | null;
  registration_fee?: number | null;
  non_tuition_fees?: number | null;
  total_credit_fee?: number | null;
  total_cost_bdt?: number | null;
  scholarship_offer?: string;
  scholarship_adjusted_cost?: number | null;
  monthly_average_cost_bdt?: number | null;
  monthly_average_after_scholarship_bdt?: number | null;
  estimated_duration_months?: number | null;
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

export type IntentType =
  | 'admission_eligibility'
  | 'tuition_fees'
  | 'scholarship'
  | 'department_guide'
  | 'career_guidance'
  | 'admission_deadline'
  | 'required_documents'
  | 'programs_list'
  | 'contact_info'
  | 'university_overview'
  | 'leadership_directory'
  | 'outdated_policy'
  | 'out_of_scope';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestBody {
  message: string;
  history?: ChatTurn[];
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

export interface ChatResponsePayload {
  reply: string;
  intent: IntentType;
  sources: SourceReference[];
  feeCards: FeeCardData[];
  leadershipCards?: LeadershipEntry[];
  followUpSuggestions: string[];
  verificationNote?: string;
  servedLocally?: boolean;
}

export const EXACT_FALLBACK_MESSAGE = `দুঃখিত, এই বিষয়ে আমার কাছে নির্দিষ্ট তথ্য নেই। অনুগ্রহ করে উত্তরা বিশ্ববিদ্যালয়ের Admission Office-এ যোগাযোগ করুন।

ফোন: 09640 888272
ইমেইল: info@uttarauniversity.edu.bd / admission@uttara.ac.bd

ওয়েবসাইট: https://uttarauniversity.edu.bd/contact-us/`;
