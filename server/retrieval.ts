import type { KnowledgeRepository } from './knowledge-base';
import { findMatchingLeadership } from './leadership-loader';
import { findMatchingPrograms } from './spring2027-loader';
import type {
  FeeCardData,
  IntentType,
  KnowledgeRecord,
  LeadershipEntry,
  SourceReference,
  Spring2027Program,
} from './types';

export interface RetrievalOutput {
  intent: IntentType;
  records: KnowledgeRecord[];
  matchedPrograms: Spring2027Program[];
  matchedLeadership: LeadershipEntry[];
  sources: SourceReference[];
  feeCards: FeeCardData[];
  historicalDetected: boolean;
  needsReviewDetected: boolean;
  isOutOfScope: boolean;
  detectedLanguage: 'bn' | 'en' | 'mixed';
}

const BANGLA_REGEX = /[\u0980-\u09FF]/;

const SYNONYM_MAP: Array<[RegExp, string[]]> = [
  [/ভর্তি|আবেদন|যোগ্যতা|এডমিশন|admission|apply|eligible|eligibility|criteria|gpa|ssc|hsc|o level|a level|diploma|foreign|international/i, ['admission', 'requirement', 'eligibility', 'gpa', 'entry']],
  [/টিউশন|ফি|খরচ|টাকা|বেতন|কত টাকা|মাসিক|tuition|fee|fees|cost|credit|semester|monthly|installment|instalment|calculator/i, ['tuition', 'fee', 'cost', 'monthly', 'bdt', 'spring 2027']],
  [/স্কলারশিপ|বৃত্তি|ছাড়|ওয়েভার|scholarship|waiver|founder|merit|female|60%/i, ['scholarship', 'founder', 'merit', 'female', 'cap']],
  [/সময়সীমা|শেষ তারিখ|ডেডলাইন|কবে|ভর্তি চলছে|deadline|last date|closing|fall 2026|spring 2027|intake|open/i, ['deadline', 'fall 2026', 'spring 2027', 'admission']],
  [/কাগজপত্র|ডকুমেন্ট|সার্টিফিকেট|ছবি|document|documents|certificate|transcript|photo|nid/i, ['documents', 'certificate', 'transcript', 'nid', 'process']],
  [/বিভাগ|ডিপার্টমেন্ট|স্কুল|অনুষদ|department|departments|school|schools|faculty/i, ['department', 'school', 'faculty']],
  [/প্রোগ্রাম|সাবজেক্ট|বিষয়|ডিগ্রি|program|programs|undergraduate|graduate|masters|bachelor|honours|bsc|bba|ba|llb|msc|mba|ma|llm|bped|mped|bed|med/i, ['program', 'undergraduate', 'graduate', 'degree']],
  [/ক্যারিয়ার|চাকরি|দক্ষতা|ভবিষ্যৎ|career|job|salary|skills|scope|future/i, ['career', 'skills', 'industry']],
  [/যোগাযোগ|ঠিকানা|ফোন|নাম্বার|ইমেইল|লোকেশন|ক্যাম্পাস|contact|address|phone|email|location|campus|office|helpline/i, ['contact', 'address', 'phone', 'email', 'turag']],
  [/ডিন|প্রক্টর|চেয়ারম্যান|পরিচালক|হেড|নেতৃত্ব|উপাচার্য|ভাইস[\s-]*চ্যান্সেলর|ভিসি|প্রো[\s-]*ভিসি|কোষাধ্যক্ষ|ট্রেজারার|রেজিস্ট্রার|পরীক্ষা[\s-]*নিয়ন্ত্রক|dean|associate dean|proctor|deputy proctor|assistant proctor|proctorial|chairman|director|leadership|vice[\s-]*chancellor|pro[\s-]*vice[\s-]*chancellor|treasurer|registrar|controller/i, ['leadership', 'dean', 'proctor', 'chairman', 'director', 'vice-chancellor', 'treasurer', 'registrar', 'controller']],
  [/সিএসই|কম্পিউটার|cse|computer science|software/i, ['cse', 'computer science']],
  [/ইইই|ইলেকট্রিক্যাল|eee|electrical/i, ['eee', 'electrical']],
  [/বিবিএ|ব্যবসায়|ব্যবসা|bba|business|mba|emba|accounting|finance|marketing|hrm|mis/i, ['bba', 'business administration', 'mba']],
  [/সিভিল|পুরকৌশল|civil/i, ['civil engineering']],
  [/টেক্সটাইল|বস্ত্র|textile|fashion|apparel/i, ['textile', 'fashion', 'apparel']],
  [/ইংরেজি|english|elt|literature/i, ['english']],
  [/বাংলা\s*(বিভাগ|ডিপার্টমেন্ট|প্রোগ্রাম|অনার্স|মাস্টার্স)|bangla\s*(hons|ma|ba)/i, ['bangla']],
  [/আইন|ল|llb|llm|law/i, ['law', 'llb', 'llm']],
  [/গণিত|ম্যাথ|math|mathematics/i, ['mathematics']],
  [/পদার্থ|physics/i, ['physics']],
  [/ইসলামিক|islamic/i, ['islamic']],
  [/বিপিএড|এমপিএড|বিএড|এমএড|bped|mped|bed|med|physical education|education/i, ['bped', 'mped', 'bed', 'med', 'education']],
  [/ডিপ্লোমা|diploma/i, ['diploma']],
];

const UNIVERSITY_DOMAIN_MARKERS =
  /uttara|উত্তরা|university|বিশ্ববিদ্যালয়|বিশ্ববিদ্যালয়|ভর্তি|টিউশন|স্কলারশিপ|বৃত্তি|বিভাগ|ডিপার্টমেন্ট|প্রোগ্রাম|সাবজেক্ট|যোগ্যতা|কাগজপত্র|ক্যাম্পাস|মাসিক|খরচ|ডিন|প্রক্টর|চেয়ারম্যান|পরিচালক|উপাচার্য|ভাইস[\s-]*চ্যান্সেলর|ভিসি|প্রো[\s-]*ভিসি|কোষাধ্যক্ষ|ট্রেজারার|রেজিস্ট্রার|পরীক্ষা[\s-]*নিয়ন্ত্রক|dean|proctor|proctorial|chairman|director|leadership|vice[\s-]*chancellor|pro[\s-]*vice[\s-]*chancellor|\bvc\b|\bpro[\s-]*vc\b|treasurer|registrar|controller|eaysmin|lekha|gour|gobinda|goswami|haspia|bashirullah|mahiuddin|tareq|rabbani|shakowat|ishrat|afroza|mahmuda|sultanul|anisuzzaman|zahidul|noman|ashraful|shah ahmed|amzad|farruque|amanat|mafruza|mahfuj|shazzaduzzaman|aseaya|sose|soass|soceie|soepe|sob|admission|tuition|fee|fees|cost|monthly|scholarship|waiver|department|program|cse|eee|bba|civil|textile|english|bangla|llb|llm|mba|emba|msc|ma|math|mathematics|physics|fashion|fdt|islamic|bped|mped|bed|med|education|gpa|ssc|hsc|o level|a level|diploma|foreign|career|deadline|contact|address|phone|email|campus|semester|credit|fall 2026|spring 2027|turag|beribadh|হ্যালো|hello|hi|assalamu|আসসালামু|কেমন|help|সাহায্য/i;

const LEADERSHIP_QUERY_REGEX =
  /\b(dean|deans|associate dean|proctor|deputy proctor|assistant proctor|proctorial|chairman|chair|director|leadership|vice[\s-]*chancellor|pro[\s-]*vice[\s-]*chancellor|vc|pro[\s-]*vc|treasurer|registrar|controller of examinations|eaysmin|lekha|gour|gobinda|goswami|haspia|bashirullah|mahiuddin|tareq|rabbani|shakowat|ishrat|afroza|mahmuda|sultanul|anisuzzaman|zahidul|noman|ashraful|shah ahmed|amzad|farruque|amanat|mafruza|mahfuj|shazzaduzzaman|aseaya)\b|ডিন|প্রক্টর|চেয়ারম্যান|পরিচালক|প্রক্টরিয়াল|উপাচার্য|ভাইস[\s-]*চ্যান্সেলর|ভিসি|প্রো[\s-]*ভিসি|কোষাধ্যক্ষ|ট্রেজারার|রেজিস্ট্রার|পরীক্ষা[\s-]*নিয়ন্ত্রক/i;

export function detectLanguage(text: string): 'bn' | 'en' | 'mixed' {
  const hasBangla = BANGLA_REGEX.test(text);
  const hasLatinWords = /[a-zA-Z]{2,}/.test(text);
  if (hasBangla && hasLatinWords) return 'mixed';
  if (hasBangla) return 'bn';
  return 'en';
}

export function classifyIntent(query: string): IntentType {
  const q = query.toLowerCase();

  if (
    /(old\s*pdf|outdated|previous\s*(policy|circular|fee|brochure)|পুরনো|পুরানো|আগের\s*(পিডিএফ|নীতিমালা|সার্কুলার))/i.test(
      q
    ) ||
    (/(2020|2021|2022|2023|2024)/i.test(q) &&
      /(pdf|policy|fee|admission|circular|brochure|নীতিমালা|ভর্তি|ফি)/i.test(q))
  ) {
    return 'outdated_policy';
  }
  if (!UNIVERSITY_DOMAIN_MARKERS.test(q)) {
    return 'out_of_scope';
  }
  if (LEADERSHIP_QUERY_REGEX.test(q)) {
    return 'leadership_directory';
  }
  if (/deadline|last date|closing|কবে|সময়সীমা|শেষ তারিখ|ভর্তি চলছে/i.test(q)) {
    return 'admission_deadline';
  }
  if (/document|certificate|transcript|কাগজপত্র|ডকুমেন্ট|সার্টিফিকেট|ছবি/i.test(q)) {
    return 'required_documents';
  }
  if (/scholarship|waiver|founder|বৃত্তি|স্কলারশিপ|ছাড়|ওয়েভার/i.test(q)) {
    return 'scholarship';
  }
  if (/tuition|fee|fees|cost|monthly|installment|instalment|খরচ|টিউশন|ফি|টাকা|ক্রেডিট|মাসিক|calculator/i.test(q)) {
    return 'tuition_fees';
  }
  if (/career|job|salary|skills|ক্যারিয়ার|চাকরি|দক্ষতা|ভবিষ্যৎ/i.test(q)) {
    return 'career_guidance';
  }
  if (/contact|phone|email|address|location|office|যোগাযোগ|ঠিকানা|ফোন|নাম্বার|ইমেইল|ক্যাম্পাস/i.test(q)) {
    return 'contact_info';
  }
  if (/eligible|eligibility|requirement|criteria|gpa|ssc|hsc|o level|a level|diploma|foreign|যোগ্যতা|ভর্তি/i.test(q)) {
    return 'admission_eligibility';
  }
  if (/department|school|faculty|বিভাগ|ডিপার্টমেন্ট|স্কুল|অনুষদ/i.test(q)) {
    return 'department_guide';
  }
  if (/program|programs|undergraduate|graduate|masters|bachelor|প্রোগ্রাম|সাবজেক্ট|ডিগ্রি/i.test(q)) {
    return 'programs_list';
  }
  return 'university_overview';
}

function expandTokens(query: string): string[] {
  const baseTokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const expanded = new Set<string>(baseTokens);
  for (const [pattern, additions] of SYNONYM_MAP) {
    if (pattern.test(query)) {
      for (const word of additions) {
        expanded.add(word);
      }
    }
  }
  return Array.from(expanded);
}

function scoreRecord(record: KnowledgeRecord, tokens: string[], intent: IntentType): number {
  let score = 0;
  const titleLower = record.title.toLowerCase();
  const contentLower = record.content.toLowerCase();
  const programLower = (record.program_name || '').toLowerCase();
  const categoryLower = record.category.toLowerCase();

  for (const token of tokens) {
    if (programLower.includes(token)) score += 6;
    if (titleLower.includes(token)) score += 5;
    if (categoryLower.includes(token)) score += 4;
    if (contentLower.includes(token)) score += 2;
  }

  if (intent === 'tuition_fees' && record.category === 'tuition_fee') score += 10;
  if (intent === 'scholarship' && record.category === 'scholarship') score += 10;
  if (intent === 'admission_eligibility' && record.category === 'admission_requirement') score += 10;
  if (intent === 'admission_deadline' && record.category === 'admission_deadline') score += 12;
  if (intent === 'required_documents' && record.category === 'admission_process') score += 12;
  if (intent === 'contact_info' && record.category === 'contact') score += 12;
  if (intent === 'leadership_directory' && record.category === 'leadership') score += 14;
  if ((intent === 'department_guide' || intent === 'career_guidance') && record.category === 'department') score += 10;
  if (intent === 'programs_list' && (record.category === 'undergraduate_program' || record.category === 'graduate_program' || record.category === 'academic_schools')) score += 8;
  if (intent === 'university_overview' && (record.category === 'university_overview' || record.category === 'academic_schools' || record.category === 'contact')) score += 8;
  if (intent === 'outdated_policy' && record.verification_status === 'historical') score += 15;

  return score;
}

export function programToFeeCard(
  prog: Spring2027Program,
  calculatorUrl = 'https://erp.uttara.ac.bd/tuition-fee-calculator'
): FeeCardData {
  const f = prog.fees;
  return {
    programName: prog.program_name,
    programCategory: prog.program_name.toLowerCase().includes('diploma')
      ? 'Diploma Holder'
      : prog.level === 'graduate'
      ? 'Graduate'
      : 'Regular',
    intake: f.academic_intake,
    totalSemesters: f.total_semesters,
    totalCredits: f.total_credits,
    admissionFee: f.admission_fee,
    feePerCredit: f.fee_per_credit,
    payableAtAdmission:
      f.payable_during_admission_including_first_semester_registration_and_listed_fees,
    totalCreditFee: f.total_credit_fee,
    totalCostBdt: f.published_total_cost,
    scholarshipOffer: f.published_scholarship_offer,
    scholarshipAdjustedCost: f.published_scholarship_adjusted_maximum_cost,
    monthlyAverageBdt: f.monthly_average_cost_bdt,
    monthlyAverageAfterScholarshipBdt: f.monthly_average_after_published_scholarship_bdt,
    estimatedDurationMonths: f.estimated_duration_months,
    calculatorUrl,
    sourceUrl: f.fee_source_url,
    verificationStatus: 'verified',
    lastUpdated: f.fee_last_updated,
  };
}

export function retrieveKnowledge(repo: KnowledgeRepository, query: string): RetrievalOutput {
  const detectedLanguage = detectLanguage(query);
  const intent = classifyIntent(query);

  if (intent === 'out_of_scope') {
    return {
      intent,
      records: [],
      matchedPrograms: [],
      matchedLeadership: [],
      sources: [],
      feeCards: [],
      historicalDetected: false,
      needsReviewDetected: false,
      isOutOfScope: true,
      detectedLanguage,
    };
  }

  const springPrograms = repo.getSpring2027Programs();
  const matchedPrograms = findMatchingPrograms(springPrograms, query);
  const matchedLeadership =
    intent === 'leadership_directory'
      ? findMatchingLeadership(repo.getLeadershipEntries(), query)
      : [];

  const tokens = expandTokens(query);
  const candidates =
    intent === 'outdated_policy' ? repo.getAllRecords() : repo.getActiveRecords();

  const scored = candidates
    .map((record) => ({ record, score: scoreRecord(record, tokens, intent) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const topRecords = scored.slice(0, 10).map((s) => s.record);

  const contactRec = repo.getBundle().contact[0];
  if (topRecords.length > 0 && contactRec && !topRecords.some((r) => r.id === contactRec.id)) {
    topRecords.push(contactRec);
  }

  const historicalDetected = topRecords.some((r) => r.verification_status === 'historical');
  const needsReviewDetected = topRecords.some((r) => r.verification_status === 'needs_review');

  const sourceMap = new Map<string, SourceReference>();
  for (const r of topRecords) {
    if (!sourceMap.has(r.source_url)) {
      sourceMap.set(r.source_url, {
        title: r.title,
        url: r.source_url,
        status: r.verification_status,
        lastVerified: r.last_verified,
      });
    }
  }

  const calculatorUrl =
    repo.getSpring2027Dataset()?.official_sources?.tuition_fee_calculator ||
    'https://erp.uttara.ac.bd/tuition-fee-calculator';

  let feeCards: FeeCardData[] = [];
  if (matchedPrograms.length > 0 && (intent === 'tuition_fees' || /fee|cost|tuition|monthly|টিউশন|ফি|খরচ|মাসিক/i.test(query))) {
    feeCards = matchedPrograms.slice(0, 3).map((p) => programToFeeCard(p, calculatorUrl));
  } else if (intent === 'tuition_fees') {
    feeCards = topRecords
      .filter((r) => r.category === 'tuition_fee' && r.total_cost_bdt != null)
      .slice(0, 3)
      .map((r) => ({
        programName: r.program_name || r.title,
        programCategory: r.program_category || 'Regular',
        intake: r.validity_period,
        totalSemesters: r.total_semesters ?? null,
        totalCredits: r.total_credits ?? null,
        admissionFee: r.admission_fee ?? null,
        feePerCredit: r.fee_per_credit ?? null,
        payableAtAdmission: r.payable_at_admission ?? null,
        totalCreditFee: r.total_credit_fee ?? null,
        totalCostBdt: r.total_cost_bdt ?? null,
        scholarshipOffer: r.scholarship_offer,
        scholarshipAdjustedCost: r.scholarship_adjusted_cost ?? null,
        monthlyAverageBdt: r.monthly_average_cost_bdt ?? null,
        monthlyAverageAfterScholarshipBdt: r.monthly_average_after_scholarship_bdt ?? null,
        estimatedDurationMonths: r.estimated_duration_months ?? null,
        calculatorUrl: r.calculator_url || calculatorUrl,
        sourceUrl: r.source_url,
        verificationStatus: r.verification_status,
        lastUpdated: r.last_verified,
      }));
  }

  return {
    intent,
    records: topRecords,
    matchedPrograms,
    matchedLeadership,
    sources: Array.from(sourceMap.values()).slice(0, 4),
    feeCards,
    historicalDetected,
    needsReviewDetected,
    isOutOfScope: topRecords.length === 0,
    detectedLanguage,
  };
}
