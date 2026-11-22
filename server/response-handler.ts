import { generateGroundedReply } from './gemini';
import type { KnowledgeRepository } from './knowledge-base';
import { programToFeeCard, retrieveKnowledge } from './retrieval';
import {
  EXACT_FALLBACK_MESSAGE,
  type ChatResponsePayload,
  type ChatTurn,
  type IntentType,
  type Spring2027Program,
} from './types';

function getFollowUpSuggestions(intent: IntentType, lang: 'bn' | 'en' | 'mixed'): string[] {
  const isBn = lang === 'bn';
  switch (intent) {
    case 'admission_eligibility':
      return isBn
        ? ['এই প্রোগ্রামের টিউশন ফি ও মাসিক খরচ কত?', 'Spring 2027 স্কলারশিপ নীতিমালা কী?', 'ভর্তির জন্য কী কী কাগজপত্র লাগবে?']
        : ['What is the Spring 2027 tuition fee & monthly average?', 'Explain the Spring 2027 scholarship bands', 'What documents are required for admission?'];
    case 'tuition_fees':
      return isBn
        ? ['মাসিক গড় খরচ কীভাবে হিসাব করা হয়েছে?', 'স্কলারশিপের শর্ত ও মেরিট ব্যান্ড কী?', 'এই প্রোগ্রামে ভর্তির যোগ্যতা কী?']
        : ['How is the monthly average cost calculated?', 'What are the Spring 2027 scholarship bands?', 'What are the entry requirements for this program?'];
    case 'scholarship':
      return isBn
        ? ['মেয়ে শিক্ষার্থীদের অতিরিক্ত ৫% বৃত্তির শর্ত কী?', 'CSE ও BBA-র Spring 2027 ফি কত?', 'অফিসিয়াল ফি ক্যালকুলেটর লিংক দিন']
        : ['What is the Spring 2027 total cost for CSE or BBA?', 'What is the 60% scholarship cap?', 'Show official fee calculator link'];
    case 'department_guide':
    case 'career_guidance':
      return isBn
        ? ['এই বিভাগে ভর্তির যোগ্যতা কী?', 'এই প্রোগ্রামের Spring 2027 টিউশন ফি কত?', 'অন্যান্য বিভাগগুলো সম্পর্কে জানতে চাই']
        : ['What are the entry requirements for this program?', 'What is the Spring 2027 tuition fee?', 'Compare two departments'];
    case 'leadership_directory':
      return isBn
        ? ['ভাইস-চ্যান্সেলর, ট্রেজারার ও রেজিস্ট্রার কে?', 'সকল অনুষদের ডিনদের তালিকা দেখুন', 'প্রক্টরিয়াল বডির সদস্য কারা?']
        : ['Who are the Vice-Chancellor, Treasurer & Registrar?', 'List all School Deans', 'Who are in the Proctorial Body?'];
    default:
      return isBn
        ? ['CSE ভর্তির যোগ্যতা ও Spring 2027 ফি কত?', 'Spring 2027 স্কলারশিপ নীতিমালা কী?', 'সকল অনুষদের ডিন ও উপাচার্যের তথ্য দিন']
        : ['CSE eligibility & Spring 2027 fees', 'Spring 2027 scholarship policy', 'List Vice-Chancellor & School Deans'];
  }
}

function buildDirectLeadershipReply(
  entries: import('./types').LeadershipEntry[],
  lang: 'bn' | 'en' | 'mixed'
): string {
  const isBn = lang === 'bn';
  const shown = entries.slice(0, 9);
  const header = isBn
    ? `উত্তরা বিশ্ববিদ্যালয়ের অফিসিয়াল নেতৃত্ব ও প্রক্টরিয়াল ডিরেক্টরি থেকে প্রাপ্ত তথ্য (${entries.length} জন):`
    : `Official Uttara University Leadership & Proctorial Directory (${entries.length} matching record${entries.length > 1 ? 's' : ''}):`;

  const lines = shown.map((e, i) => {
    const emailText = e.publicEmail
      ? e.publicEmail
      : isBn
      ? 'পাবলিক ইমেইল প্রকাশিত নয়'
      : 'Not published in directory';
    const noteLine = e.verificationNote ? `\n   _${e.verificationNote}_` : '';
    return `${i + 1}. **${e.name}** — ${e.designation} (${e.schoolOrDepartment})\n   ${
      isBn ? 'ইমেইল' : 'Email'
    }: ${emailText} | ${isBn ? 'সোর্স' : 'Source'}: ${e.sourceUrl || e.profileOrSourceUrl}${noteLine}`;
  });

  if (entries.length > shown.length) {
    lines.push(
      isBn
        ? `...এবং আরও ${entries.length - shown.length} জন। সম্পূর্ণ তালিকা দেখতে উপরের **Leadership** ট্যাবে যান।`
        : `...and ${entries.length - shown.length} more. Open the **Leadership** tab above to browse the full directory.`
    );
  }

  return `${header}\n\n${lines.join('\n')}`;
}

function formatBdt(val: number): string {
  return `BDT ${val.toLocaleString('en-US')}`;
}

function buildDirectProgramReply(params: {
  programs: Spring2027Program[];
  intent: IntentType;
  askMonthly: boolean;
  askFees: boolean;
  askEligibility: boolean;
  lang: 'bn' | 'en' | 'mixed';
  calculatorUrl: string;
}): string {
  const { programs, askMonthly, askFees, askEligibility, lang, calculatorUrl } = params;
  const isBn = lang === 'bn';

  const sections = programs.slice(0, 2).map((prog) => {
    const f = prog.fees;
    const e = prog.eligibility;
    const lines: string[] = [];

    lines.push(`**${prog.program_name}** (${prog.school})`);

    if (askFees || askMonthly) {
      if (isBn) {
        lines.push(`**Spring 2027 প্রকাশিত টিউশন ফি (আপডেট: ${f.fee_last_updated}):**`);
        lines.push(`- **মোট সেমিস্টার ও ক্রেডিট:** ${f.total_semesters} সেমিস্টার, ${f.total_credits} ক্রেডিট`);
        lines.push(`- **ভর্তি ফি (Admission Fee):** ${formatBdt(f.admission_fee)}`);
        lines.push(`- **প্রতি ক্রেডিট ফি:** ${formatBdt(f.fee_per_credit)} (মোট ক্রেডিট ফি: ${formatBdt(f.total_credit_fee)})`);
        lines.push(`- **ভর্তির সময় দেয় (১ম সেমিস্টার রেজিস্ট্রেশন ও অন্যান্য ফিসহ):** ${formatBdt(f.payable_during_admission_including_first_semester_registration_and_listed_fees)}`);
        lines.push(`- **প্রকাশিত মোট খরচ (Published Total Cost):** ${formatBdt(f.published_total_cost)}`);
        lines.push(`- **প্রকাশিত স্কলারশিপ অফার:** ${f.published_scholarship_offer}`);
        lines.push(`- **স্কলারশিপ-সমন্বিত সর্বোচ্চ প্রকাশিত খরচ:** ${formatBdt(f.published_scholarship_adjusted_maximum_cost)} *(এটি চূড়ান্ত নিশ্চিত বিল নয়; আপনার প্রযোজ্য স্কলারশিপ বিশ্ববিদ্যালয় যাচাই করবে)*`);
        if (askMonthly) {
          lines.push(`- **মাসিক গড় বাজেট হিসাব (${f.estimated_duration_months} মাস অনুযায়ী):** স্কলারশিপ ছাড়া গড়ে **${formatBdt(f.monthly_average_cost_bdt)}/মাস** এবং প্রকাশিত স্কলারশিপসহ গড়ে **${formatBdt(f.monthly_average_after_published_scholarship_bdt)}/মাস**।`);
          lines.push(`  *(সতর্কতা: এটি শুধু বাজেটিং গড় হিসাব—প্রতি মাসে নির্দিষ্ট কিস্তি হিসেবে এটি নির্ধারিত নয়। প্রকৃত পেমেন্ট শিডিউল Finance and Accounts Office নির্ধারণ করে।)*`);
        }
      } else {
        lines.push(`**Spring 2027 Published Tuition Fees (Updated ${f.fee_last_updated}):**`);
        lines.push(`- **Duration & Credits:** ${f.total_semesters} semesters, ${f.total_credits} credits`);
        lines.push(`- **Admission Fee:** ${formatBdt(f.admission_fee)}`);
        lines.push(`- **Fee per Credit:** ${formatBdt(f.fee_per_credit)} (Total Credit Fee: ${formatBdt(f.total_credit_fee)})`);
        lines.push(`- **Payable During Admission (incl. 1st semester registration & listed fees):** ${formatBdt(f.payable_during_admission_including_first_semester_registration_and_listed_fees)}`);
        lines.push(`- **Published Total Cost:** ${formatBdt(f.published_total_cost)}`);
        lines.push(`- **Published Scholarship Offer:** ${f.published_scholarship_offer}`);
        lines.push(`- **Published Scholarship-Adjusted Maximum Cost:** ${formatBdt(f.published_scholarship_adjusted_maximum_cost)} *(Note: Not a guaranteed personal net bill; actual scholarship eligibility is confirmed by the university.)*`);
        if (askMonthly) {
          lines.push(`- **Estimated Monthly Budgeting Average (${f.estimated_duration_months} months):** **${formatBdt(f.monthly_average_cost_bdt)}/month** before scholarship, or **${formatBdt(f.monthly_average_after_published_scholarship_bdt)}/month** after published scholarship.`);
          lines.push(`  *(Note: ${f.monthly_estimate_note})*`);
        }
      }
    }

    if (askEligibility) {
      if (isBn) {
        lines.push(`**ভর্তির যোগ্যতা (আপডেট: ${prog.eligibility_last_updated}):**`);
        if (e.manual_confirmation_required) {
          lines.push(`- এই প্রোগ্রামের সম্পূর্ণ ভর্তি যোগ্যতা ক্যাপচার করা অফিসিয়াল পেজে পাওয়া যায়নি। অনুগ্রহ করে Admission Office (09640 888272 / admission@uttara.ac.bd) থেকে নিশ্চিত হয়ে নিন।`);
        } else {
          if (e.general) lines.push(`- **সাধারণ শিক্ষার্থী (SSC/HSC):** ${e.general}`);
          if (e.diploma_holder) lines.push(`- **ডিপ্লোমা হোল্ডার:** ${e.diploma_holder}`);
          if (e.english_medium) lines.push(`- **ইংলিশ মিডিয়াম (O/A Level):** ${e.english_medium}`);
          if (e.foreign_student) lines.push(`- **বিদেশি শিক্ষার্থী:** ${e.foreign_student}`);
          if (e.postgraduate) lines.push(`- **পোস্টগ্র্যাজুয়েট যোগ্যতা:** ${e.postgraduate}`);
        }
        lines.push(`*(দ্রষ্টব্য: এটি প্রাথমিক নির্দেশিকা মাত্র; চূড়ান্ত যোগ্যতা Admission Office যাচাই করবে।)*`);
      } else {
        lines.push(`**Entry Requirements (Updated ${prog.eligibility_last_updated}):**`);
        if (e.manual_confirmation_required) {
          lines.push(`- Complete entry criteria for this program are not listed in the captured official entry requirements table. Manual confirmation with the Admission Office (09640 888272 / admission@uttara.ac.bd) is required.`);
        } else {
          if (e.general) lines.push(`- **General (SSC/HSC):** ${e.general}`);
          if (e.diploma_holder) lines.push(`- **Diploma Holders:** ${e.diploma_holder}`);
          if (e.english_medium) lines.push(`- **English Medium (O/A Level):** ${e.english_medium}`);
          if (e.foreign_student) lines.push(`- **Foreign Students:** ${e.foreign_student}`);
          if (e.postgraduate) lines.push(`- **Postgraduate:** ${e.postgraduate}`);
        }
        lines.push(`*(Preliminary guidance only — official eligibility is confirmed by the Admission Office.)*`);
      }
    }

    return lines.join('\n');
  });

  if (isBn) {
    sections.push(
      `অফিসিয়াল ফি ক্যালকুলেটর: ${calculatorUrl}\nযোগাযোগ: 09640 888272 | admission@uttara.ac.bd`
    );
  } else {
    sections.push(
      `Official Fee Calculator: ${calculatorUrl}\nAdmission Office: 09640 888272 | admission@uttara.ac.bd`
    );
  }

  return sections.join('\n\n');
}

export async function handleChatRequest(params: {
  repo: KnowledgeRepository;
  apiKey: string | undefined;
  message: string;
  history: ChatTurn[];
  piiWarning?: boolean;
}): Promise<ChatResponsePayload> {
  const { repo, apiKey, message, history, piiWarning } = params;
  const retrieval = retrieveKnowledge(repo, message);

  const isGreeting = /^(hi|hello|hey|assalamu\s*alaikum|salam|হ্যালো|হাই|আসসালামু\s*আলাইকুম|সালাম)[\s!?.]*$/i.test(
    message.trim()
  );

  if (!isGreeting && retrieval.isOutOfScope) {
    return {
      reply: EXACT_FALLBACK_MESSAGE,
      intent: 'out_of_scope',
      sources: [
        {
          title: 'Uttara University Official Contact',
          url: 'https://uttarauniversity.edu.bd/contact-us/',
          status: 'verified',
          lastVerified: '2026-11-22',
        },
      ],
      feeCards: [],
      followUpSuggestions: getFollowUpSuggestions('university_overview', retrieval.detectedLanguage),
      servedLocally: true,
    };
  }

  // Direct local lookup for leadership directory queries
  if (!piiWarning && retrieval.intent === 'leadership_directory' && retrieval.matchedLeadership.length > 0) {
    const uniqueSources = new Map<string, { title: string; url: string; status: 'verified'; lastVerified: string }>();
    for (const item of retrieval.matchedLeadership.slice(0, 3)) {
      if (!uniqueSources.has(item.profileOrSourceUrl)) {
        uniqueSources.set(item.profileOrSourceUrl, {
          title: `${item.name} (${item.designation})`,
          url: item.profileOrSourceUrl,
          status: 'verified',
          lastVerified: '2026-11-22',
        });
      }
    }
    return {
      reply: buildDirectLeadershipReply(retrieval.matchedLeadership, retrieval.detectedLanguage),
      intent: 'leadership_directory',
      sources: Array.from(uniqueSources.values()),
      feeCards: [],
      leadershipCards: retrieval.matchedLeadership.slice(0, 6),
      followUpSuggestions: getFollowUpSuggestions('leadership_directory', retrieval.detectedLanguage),
      servedLocally: true,
    };
  }

  // Direct local JSON lookup for exact program fee/monthly/eligibility queries (no Gemini API call needed)
  const askCareerOrCompare = /career|job|skill|compare|comparison|difference|subject|curriculum|ক্যারিয়ার|চাকরি|তুলনা|পার্থক্য|সাবজেক্ট/i.test(
    message
  );
  const askFees = /tuition|fee|fees|cost|monthly|installment|instalment|খরচ|টিউশন|ফি|টাকা|ক্রেডিট|মাসিক/i.test(
    message
  );
  const askMonthly = /monthly|month|per month|মাসিক|প্রতি মাসে/i.test(message);
  const askEligibility = /eligible|eligibility|requirement|criteria|gpa|ssc|hsc|o level|a level|diploma|যোগ্যতা|ভর্তি/i.test(
    message
  );

  const calculatorUrl =
    repo.getSpring2027Dataset()?.official_sources?.tuition_fee_calculator ||
    'https://erp.uttara.ac.bd/tuition-fee-calculator';

  if (
    !piiWarning &&
    !askCareerOrCompare &&
    retrieval.matchedPrograms.length >= 1 &&
    retrieval.matchedPrograms.length <= 2 &&
    (askFees || askEligibility)
  ) {
    const directReply = buildDirectProgramReply({
      programs: retrieval.matchedPrograms,
      intent: retrieval.intent,
      askMonthly,
      askFees,
      askEligibility,
      lang: retrieval.detectedLanguage,
      calculatorUrl,
    });

    const needsManual = retrieval.matchedPrograms.some(
      (p) =>
        p.record_status === 'partially_verified' ||
        p.eligibility.manual_confirmation_required ||
        p.eligibility.diploma_holder?.includes('needs_manual_confirmation')
    );

    return {
      reply: directReply,
      intent: askFees ? 'tuition_fees' : 'admission_eligibility',
      sources: retrieval.matchedPrograms.slice(0, 2).map((p) => ({
        title: `${p.program_name} (Spring 2027 Official Data)`,
        url: askFees ? p.fees.fee_source_url : p.eligibility_source_url,
        status: p.record_status === 'partially_verified' ? 'needs_review' : 'verified',
        lastVerified: askFees ? p.fees.fee_last_updated : p.eligibility_last_updated,
      })),
      feeCards: askFees ? retrieval.matchedPrograms.slice(0, 2).map((p) => programToFeeCard(p, calculatorUrl)) : [],
      followUpSuggestions: getFollowUpSuggestions(
        askFees ? 'tuition_fees' : 'admission_eligibility',
        retrieval.detectedLanguage
      ),
      verificationNote: needsManual
        ? 'Some eligibility conditions for this program require direct confirmation with the Admission Office.'
        : undefined,
      servedLocally: true,
    };
  }

  const contextRecords = isGreeting
    ? repo.getBundle().universityData.slice(0, 2)
    : retrieval.records;

  const formattedContext = contextRecords
    .map(
      (r, idx) =>
        `[${idx + 1}] ID: ${r.id} | Category: ${r.category} | Status: ${r.verification_status} | Validity: ${r.validity_period} | Verified: ${r.last_verified}\nTitle: ${r.title}\nProgram: ${r.program_name ?? 'General'}\nContent: ${r.content}\nSource URL: ${r.source_url}`
    )
    .join('\n\n');

  const dataQualityNotes = repo.getSpring2027Dataset()?.data_quality_notes?.join('\n- ') || '';

  const systemInstruction = `You are the "Uttara University AI Admission Assistant" (উত্তরা বিশ্ববিদ্যালয়, বাংলাদেশ).
Persona & Boundaries:
- Polite, welcoming, student-focused, accurate, and transparent virtual admission support representative.
- NEVER claim to be a human admission officer.
- Language Rule: Detect the student's language and respond in the EXACT SAME language (Bangla Unicode for Bangla questions, English for English questions, or natural Bangla-English mix for mixed queries). Use clear, simple wording.
- Grounding Rule: Answer ONLY using the VERIFIED UNIVERSITY CONTEXT provided below. Do NOT rely on outside training memory for current fees, deadlines, GPA requirements, or scholarships.
- Fee Rule: Label all Spring 2027 tuition figures clearly as **Spring 2027 published figures** (updated 2026-11-19). Show published total cost, admission fee, payable at admission, published scholarship offer, and published scholarship-adjusted maximum cost when available. Never treat scholarship-adjusted maximum cost as a guaranteed personal bill.
- Monthly Cost Rule: When asked about monthly cost, cite the monthly_average_cost_bdt and monthly_average_after_published_scholarship_bdt from the context and explain clearly that these are average budgeting estimates over program duration, NOT guaranteed fixed monthly instalments (Finance and Accounts Office sets actual payment schedules).
- Never invent missing fees, exact closing dates, or missing eligibility criteria (for example, BEd/MEd missing criteria or Civil Engineering diploma inconsistency must be flagged for manual confirmation with Admission Office).
- Scholarship Rule: Cite Spring 2027 scholarship bands (9.76-9.99: 30%, 9.51-9.75: 25%, 9.01-9.50: 20%, 8.51-9.00: 15%, 7.00-8.50: 10%; Founder Scholarship for double 5.00 with HSC 2024+ & SSC 2022+ up to BDT 150,000 total cost cap; +5% female; 60% overall cap). Always label results as preliminary estimates.
- Career Rule: Clearly separate university-published program facts from general career guidance, and NEVER guarantee employment or salary.
- Privacy Rule: ${piiWarning ? 'The user message may contain sensitive personal numbers; gently remind them NOT to share NID scans, certificates, passwords, or private documents in chat.' : 'Never ask students to submit NID scans, certificates, passwords, or sensitive documents in chat.'}
- If the user asks something completely unsupported by the context (other than a polite greeting), output this exact fallback message verbatim:
${EXACT_FALLBACK_MESSAGE}

DATA QUALITY NOTES:
- ${dataQualityNotes}

VERIFIED UNIVERSITY CONTEXT:
${formattedContext}`;

  const reply = await generateGroundedReply({
    apiKey,
    systemInstruction,
    userMessage: message,
    history,
  });

  let verificationNote: string | undefined;
  if (retrieval.historicalDetected) {
    verificationNote = 'Historical records are excluded from active policy recommendations.';
  } else if (retrieval.needsReviewDetected) {
    verificationNote = 'Some requested details require direct confirmation from the Admission Office or official portal.';
  }

  return {
    reply,
    intent: isGreeting ? 'university_overview' : retrieval.intent,
    sources: retrieval.sources,
    feeCards: retrieval.feeCards,
    followUpSuggestions: getFollowUpSuggestions(retrieval.intent, retrieval.detectedLanguage),
    verificationNote,
    servedLocally: false,
  };
}
