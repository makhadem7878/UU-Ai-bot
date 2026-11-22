import type { KnowledgeRecord, Spring2027Dataset, Spring2027Program } from './types';

export function convertSpring2027ToRecords(dataset: Spring2027Dataset): KnowledgeRecord[] {
  const records: KnowledgeRecord[] = [];
  const calculatorUrl =
    dataset.official_sources?.tuition_fee_calculator ||
    'https://erp.uttara.ac.bd/tuition-fee-calculator';

  for (const prog of dataset.programs) {
    const slug = prog.program_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const isPartial =
      prog.record_status === 'partially_verified' ||
      Boolean(prog.eligibility.manual_confirmation_required) ||
      Boolean(prog.eligibility.diploma_holder?.includes('needs_manual_confirmation')) ||
      Boolean(prog.eligibility.diploma_holder?.includes('inconsistency')) ||
      Boolean(prog.eligibility.postgraduate?.includes('Manual confirmation required'));

    // 1. Tuition fee record (always verified from Spring 2027 fee table)
    const f = prog.fees;
    records.push({
      id: `s27-fee-${slug}`,
      category: 'tuition_fee',
      title: `${prog.program_name} — Spring 2027 Tuition Fees`,
      content: `${prog.program_name} (${prog.school}, ${prog.level}) Spring 2027 published fees (updated ${f.fee_last_updated}): Total Semesters: ${f.total_semesters}, Total Credits: ${f.total_credits}, Admission Fee: BDT ${f.admission_fee.toLocaleString('en-US')}, Fee per Credit: BDT ${f.fee_per_credit.toLocaleString('en-US')}, Payable During Admission (incl. 1st semester registration & listed fees): BDT ${f.payable_during_admission_including_first_semester_registration_and_listed_fees.toLocaleString('en-US')}, Total Credit Fee: BDT ${f.total_credit_fee.toLocaleString('en-US')}, Published Total Cost: BDT ${f.published_total_cost.toLocaleString('en-US')}, Published Scholarship Offer: ${f.published_scholarship_offer}, Published Scholarship-Adjusted Maximum Cost: BDT ${f.published_scholarship_adjusted_maximum_cost.toLocaleString('en-US')}. Estimated Monthly Budgeting Average (${f.estimated_duration_months} months): BDT ${f.monthly_average_cost_bdt.toLocaleString('en-US')}/month before scholarship, or BDT ${f.monthly_average_after_published_scholarship_bdt.toLocaleString('en-US')}/month after published scholarship (${f.monthly_estimate_note})`,
      program_name: prog.program_name,
      school: prog.school,
      level: prog.level,
      program_category: prog.program_name.includes('Diploma') ? 'Diploma Holder' : 'Regular',
      admission_fee: f.admission_fee,
      total_credits: f.total_credits,
      total_semesters: f.total_semesters,
      fee_per_credit: f.fee_per_credit,
      payable_at_admission: f.payable_during_admission_including_first_semester_registration_and_listed_fees,
      total_credit_fee: f.total_credit_fee,
      total_cost_bdt: f.published_total_cost,
      scholarship_offer: f.published_scholarship_offer,
      scholarship_adjusted_cost: f.published_scholarship_adjusted_maximum_cost,
      monthly_average_cost_bdt: f.monthly_average_cost_bdt,
      monthly_average_after_scholarship_bdt: f.monthly_average_after_published_scholarship_bdt,
      estimated_duration_months: f.estimated_duration_months,
      calculator_url: calculatorUrl,
      source_url: f.fee_source_url,
      source_type: 'official_webpage',
      last_verified: f.fee_last_updated,
      validity_period: f.academic_intake,
      verification_status: 'verified',
    });

    // 2. Eligibility record
    const eligParts: string[] = [];
    if (prog.eligibility.general) eligParts.push(`General: ${prog.eligibility.general}`);
    if (prog.eligibility.diploma_holder)
      eligParts.push(`Diploma Holder: ${prog.eligibility.diploma_holder}`);
    if (prog.eligibility.english_medium)
      eligParts.push(`English Medium (O/A Level): ${prog.eligibility.english_medium}`);
    if (prog.eligibility.foreign_student)
      eligParts.push(`Foreign Students: ${prog.eligibility.foreign_student}`);
    if (prog.eligibility.postgraduate)
      eligParts.push(`Postgraduate: ${prog.eligibility.postgraduate}`);
    if (prog.eligibility.manual_confirmation_required) {
      eligParts.push(
        `Eligibility Notice: ${prog.eligibility.eligibility_status || 'Not found in captured entry requirements'} — manual confirmation with Admission Office required.`
      );
    }

    records.push({
      id: `s27-elig-${slug}`,
      category: 'admission_requirement',
      title: `${prog.program_name} — Entry Requirements`,
      content: eligParts.join(' | '),
      program_name: prog.program_name,
      school: prog.school,
      level: prog.level,
      source_url: prog.eligibility_source_url,
      source_type: 'official_webpage',
      last_verified: prog.eligibility_last_updated,
      validity_period: 'Current (Updated 2026-11-18)',
      verification_status: isPartial ? 'needs_review' : 'verified',
    });
  }

  // 3. Spring 2027 Scholarship Policy Record
  if (dataset.scholarship_policy) {
    const sp = dataset.scholarship_policy;
    const rulesSummary = sp.selected_rules
      .map((r) => {
        if (r.bands) {
          return `${r.rule}: ${r.bands.map((b) => `Combined GPA ${b.combined_gpa} -> ${b.scholarship_percent}%`).join(', ')}`;
        }
        return `${r.rule}: ${r.condition ? r.condition + ' — ' : ''}${r.offer || ''}`;
      })
      .join(' | ');

    records.push({
      id: 's27-scholarship-policy',
      category: 'scholarship',
      title: 'Spring 2027 Scholarship Policy (Merit Bands, Founder & Caps)',
      content: `Spring 2027 Scholarship Policy (effective ${sp.effective_from}, updated ${sp.last_updated}): ${rulesSummary}. Note: Total scholarship is capped at 60%, and full policy confirmation must be verified with the Admission Office.`,
      program_name: null,
      source_url: sp.source_url,
      source_type: 'official_webpage',
      last_verified: sp.last_updated,
      validity_period: sp.intake,
      verification_status: 'verified',
    });
  }

  // 4. Monthly Cost Calculation Methodology
  if (dataset.monthly_cost_calculation) {
    const mc = dataset.monthly_cost_calculation;
    records.push({
      id: 's27-monthly-calculation',
      category: 'tuition_fee',
      title: 'Monthly Average Cost Calculation Method & Caveat',
      content: `${mc.purpose} Formula: ${mc.formula} (${mc.general_program_calendar}; ${mc.law_program_calendar}). Important caveat: ${mc.important_caveat}`,
      program_name: null,
      source_url: mc.official_policy_source,
      source_type: 'official_webpage',
      last_verified: dataset.fee_page_last_updated,
      validity_period: dataset.current_fee_intake,
      verification_status: 'verified',
    });
  }

  // 5. Spring 2027 Admission Contact
  if (dataset.university_contact) {
    records.push({
      id: 's27-contact',
      category: 'contact',
      title: 'Uttara University Admission Contact (Spring 2027 Pages)',
      content: `Admission Email: ${dataset.university_contact.admission_email} (and info@uttarauniversity.edu.bd). Hunting Number: ${dataset.university_contact.hunting_number}. Admission Hotline: ${dataset.university_contact.admission_hotline}. ${dataset.university_contact.note || ''}`,
      program_name: null,
      hunting_number: dataset.university_contact.hunting_number,
      mobile_range: dataset.university_contact.admission_hotline,
      email: dataset.university_contact.admission_email,
      source_url: dataset.official_sources?.contact || 'https://uttarauniversity.edu.bd/contact-us/',
      source_type: 'official_webpage',
      last_verified: dataset.prepared_on,
      validity_period: dataset.current_fee_intake,
      verification_status: 'verified',
    });
  }

  return records;
}

export function findMatchingPrograms(
  programs: Spring2027Program[],
  query: string
): Spring2027Program[] {
  const q = query.toLowerCase();
  const isDiploma = /diploma|ডিপ্লোমা/i.test(q);
  const isEvening = /evening|ইভিনিং/i.test(q);

  const PROGRAM_PATTERNS: Array<{ match: RegExp; filter: (p: Spring2027Program) => boolean }> = [
    {
      match: /\b(cse|computer science)\b|সিএসই|কম্পিউটার/i,
      filter: (p) => p.program_name.toLowerCase().includes('cse'),
    },
    {
      match: /\b(eee|electrical)\b|ইইই|ইলেকট্রিক্যাল/i,
      filter: (p) => p.program_name.toLowerCase().includes('eee'),
    },
    {
      match: /\b(bba|business administration)\b|বিবিএ/i,
      filter: (p) => p.program_name === 'BBA',
    },
    {
      match: /\b(emba|executive mba)\b/i,
      filter: (p) => p.program_name === 'Executive MBA',
    },
    {
      match: /\b(mba)\b|এমবিএ/i,
      filter: (p) => p.program_name.toLowerCase().includes('mba'),
    },
    {
      match: /\b(civil)\b|সিভিল|পুরকৌশল/i,
      filter: (p) => p.program_name.toLowerCase().includes('civil'),
    },
    {
      match: /\b(textile)\b|টেক্সটাইল|বস্ত্র/i,
      filter: (p) => p.program_name.toLowerCase().includes('textile'),
    },
    {
      match: /\b(fashion|fdt|merchandising)\b|ফ্যাশন/i,
      filter: (p) =>
        p.program_name.toLowerCase().includes('fashion') ||
        p.program_name.toLowerCase().includes('apparel'),
    },
    {
      match: /\b(math|mathematics)\b|গণিত|ম্যাথ/i,
      filter: (p) => p.program_name.toLowerCase().includes('mathematics'),
    },
    {
      match: /\b(physics)\b|পদার্থ/i,
      filter: (p) => p.program_name.toLowerCase().includes('physics'),
    },
    {
      match: /\b(elt|english language teaching)\b/i,
      filter: (p) => p.program_name.toLowerCase().includes('english language teaching'),
    },
    {
      match: /\b(english)\b|ইংরেজি/i,
      filter: (p) => p.program_name.toLowerCase().includes('english'),
    },
    {
      match: /\b(bangla)\b|বাংলা\s*(বিভাগ|ডিপার্টমেন্ট|প্রোগ্রাম|অনার্স|মাস্টার্স|ma|ba)/i,
      filter: (p) => p.program_name.toLowerCase().includes('bangla'),
    },
    {
      match: /\b(llb)\b|এলএলবি/i,
      filter: (p) => p.program_name === 'LLB (Hons)',
    },
    {
      match: /\b(llm)\b|এলএলএম/i,
      filter: (p) => p.program_name === 'LLM (1 Year)',
    },
    {
      match: /\b(law)\b|আইন/i,
      filter: (p) => p.program_name.includes('LLB') || p.program_name.includes('LLM'),
    },
    {
      match: /\b(islamic)\b|ইসলামিক/i,
      filter: (p) => p.program_name.toLowerCase().includes('islamic'),
    },
    {
      match: /\b(bped)\b|বিপিএড/i,
      filter: (p) => p.program_name.includes('BPEd'),
    },
    {
      match: /\b(mped)\b|এমপিএড/i,
      filter: (p) => p.program_name.includes('MPEd'),
    },
    {
      match: /\b(bed)\b|বিএড/i,
      filter: (p) => p.program_name.includes('(BEd)'),
    },
    {
      match: /\b(med)\b|এমএড/i,
      filter: (p) => p.program_name.includes('(MEd)'),
    },
    {
      match: /\b(physical education)\b/i,
      filter: (p) => p.program_name.includes('Physical Education'),
    },
  ];

  const matchedSet = new Map<string, Spring2027Program>();
  for (const rule of PROGRAM_PATTERNS) {
    if (rule.match.test(q)) {
      for (const prog of programs) {
        if (rule.filter(prog)) {
          matchedSet.set(prog.program_name, prog);
        }
      }
    }
  }

  let results = Array.from(matchedSet.values());

  // Prioritize diploma, graduate, or default to regular undergraduate if user didn't specify
  if (results.length > 1) {
    if (isDiploma || isEvening) {
      const dip = results.filter((p) => p.program_name.toLowerCase().includes('diploma'));
      if (dip.length > 0) results = dip;
    } else if (/msc|ma\b|mba|llm|mped|med|master|graduate|মাস্টার্স/i.test(q)) {
      const grad = results.filter((p) => p.level === 'graduate');
      if (grad.length > 0) results = grad;
    } else {
      const ug = results.filter(
        (p) => p.level === 'undergraduate' && !p.program_name.toLowerCase().includes('diploma')
      );
      if (ug.length > 0) results = ug;
    }
  }

  return results;
}
