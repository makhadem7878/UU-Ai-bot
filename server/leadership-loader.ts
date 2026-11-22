import type { KnowledgeRecord, LeadershipEntry } from './types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function classifyRoleCategory(
  designation: string,
  schoolOrDepartment: string
): LeadershipEntry['roleCategory'] {
  const lower = designation.toLowerCase();
  const deptLower = schoolOrDepartment.toLowerCase();
  if (lower.includes('proctor')) return 'proctorial';
  if (lower.includes('dean')) return 'dean';
  if (
    lower.includes('vice-chancellor') ||
    lower.includes('treasurer') ||
    lower.includes('registrar') ||
    lower.includes('controller of examinations') ||
    deptLower.includes('office of admission') ||
    deptLower.includes('office of the ')
  ) {
    return 'executive';
  }
  return 'director_chair';
}

export function parseLeadershipCsv(csvText: string): LeadershipEntry[] {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headerCols = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const isExtendedSchema =
    headerCols.includes('verification_note') || headerCols.includes('profile_url');

  const entries: LeadershipEntry[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[0] || '';
    const designation = cols[1] || '';
    const schoolOrDepartment = cols[2] || '';
    const publicEmail = cols[3] ? cols[3] : null;
    const officialPhotoUrl = cols[4] ? cols[4] : null;

    let profileOrSourceUrl = 'https://www.uttara.ac.bd/';
    let sourceUrl: string | undefined;
    let photoStatus = 'Photo status unspecified';
    let verificationNote: string | undefined;

    if (isExtendedSchema) {
      const profileUrl = cols[5] || '';
      const src = cols[6] || '';
      profileOrSourceUrl = profileUrl || src || 'https://www.uttara.ac.bd/';
      sourceUrl = src || undefined;
      photoStatus = cols[7] || 'Photo status unspecified';
      verificationNote = cols[8] ? cols[8] : undefined;
    } else {
      profileOrSourceUrl = cols[5] || 'https://www.uttara.ac.bd/';
      photoStatus = cols[6] || 'Photo status unspecified';
    }

    if (!name || !designation) continue;

    const slug = `${name}-${designation}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    entries.push({
      id: `lead-${slug}`,
      name,
      designation,
      roleCategory: classifyRoleCategory(designation, schoolOrDepartment),
      schoolOrDepartment,
      publicEmail,
      officialPhotoUrl,
      profileOrSourceUrl,
      sourceUrl,
      photoStatus,
      verificationNote,
    });
  }

  return entries;
}

export function mergeLeadershipLists(...lists: LeadershipEntry[][]): LeadershipEntry[] {
  const map = new Map<string, LeadershipEntry>();

  for (const list of lists) {
    for (const entry of list) {
      const key = `${entry.name.toLowerCase().replace(/[^a-z0-9]/g, '')}::${entry.designation
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, entry);
      } else {
        map.set(key, {
          ...existing,
          ...entry,
          publicEmail: entry.publicEmail || existing.publicEmail,
          officialPhotoUrl: entry.officialPhotoUrl || existing.officialPhotoUrl,
          profileOrSourceUrl: entry.profileOrSourceUrl || existing.profileOrSourceUrl,
          sourceUrl: entry.sourceUrl || existing.sourceUrl,
          photoStatus: entry.photoStatus || existing.photoStatus,
          verificationNote: entry.verificationNote || existing.verificationNote,
        });
      }
    }
  }

  const order: Record<LeadershipEntry['roleCategory'], number> = {
    executive: 0,
    dean: 1,
    director_chair: 2,
    proctorial: 3,
  };

  return Array.from(map.values()).sort((a, b) => order[a.roleCategory] - order[b.roleCategory]);
}

export function convertLeadershipToRecords(entries: LeadershipEntry[]): KnowledgeRecord[] {
  return entries.map((entry) => ({
    id: entry.id,
    category: 'leadership',
    title: `${entry.name} — ${entry.designation}`,
    content: `${entry.name} serves as ${entry.designation} at ${entry.schoolOrDepartment}.${
      entry.publicEmail ? ` Official Email: ${entry.publicEmail}.` : ''
    } Official Profile/Source: ${entry.profileOrSourceUrl}.${
      entry.sourceUrl && entry.sourceUrl !== entry.profileOrSourceUrl
        ? ` Reference Source: ${entry.sourceUrl}.`
        : ''
    } Photo status: ${entry.photoStatus}.${
      entry.verificationNote ? ` Verification Note: ${entry.verificationNote}` : ''
    }`,
    program_name: null,
    school: entry.schoolOrDepartment,
    email: entry.publicEmail || undefined,
    source_url: entry.sourceUrl || entry.profileOrSourceUrl,
    source_type: 'official_webpage',
    last_verified: '2026-11-22',
    validity_period: 'Current',
    verification_status: 'verified',
  }));
}

export function findMatchingLeadership(
  entries: LeadershipEntry[],
  query: string
): LeadershipEntry[] {
  const q = query.toLowerCase();

  // Specific group queries
  const wantsExecutive =
    /\b(vc|vice[\s-]*chancellor|pro[\s-]*vc|pro[\s-]*vice[\s-]*chancellor|treasurer|registrar|controller|statutory|executive|admission director|director of admission)\b|উপাচার্য|ভাইস[\s-]*চ্যান্সেলর|ভিসি|প্রো[\s-]*ভিসি|কোষাধ্যক্ষ|ট্রেজারার|রেজিস্ট্রার|পরীক্ষা[\s-]*নিয়ন্ত্রক|ভর্তি[\s-]*পরিচালক/i.test(
      q
    );
  const wantsDeans = /\b(dean|deans)\b|ডিন/i.test(q);
  const wantsProctorial =
    /\b(proctor|proctorial|deputy proctor|assistant proctor)\b|প্রক্টর/i.test(q);
  const wantsChairOrDirector =
    /\b(chair|chairman|head|director)\b|চেয়ারম্যান|পরিচালক|হেড/i.test(q);

  // School / Department / Office matchers
  const deptMatchers: Array<[RegExp, RegExp]> = [
    [/\b(sose|science and engineering)\b/i, /science and engineering/i],
    [/\b(soass|arts and social)\b/i, /arts and social/i],
    [/\b(soceie|civil, environment)\b/i, /civil, environment/i],
    [/\b(soepe|education and physical)\b/i, /education and physical/i],
    [/\b(sob|business administration)\b|বিবিএ|এমবিএ/i, /business administration/i],
    [/\b(cse|computer science)\b|সিএসই/i, /computer science/i],
    [/\b(eee|electrical)\b|ইইই/i, /electrical and electronic/i],
    [/\b(civil)\b|সিভিল/i, /civil engineering/i],
    [/\b(english)\b|ইংরেজি/i, /english/i],
    [/\b(law|llb|llm)\b|আইন/i, /law/i],
    [/\b(fashion|fdt)\b|ফ্যাশন/i, /fashion design/i],
    [/\b(islamic)\b|ইসলামিক/i, /islamic studies/i],
    [/\b(physical education|bped|mped)\b/i, /physical education/i],
    [/\b(education|bed|med)\b/i, /department of education/i],
    [/\b(mba|emba)\b/i, /mba and emba/i],
    [/\b(bba)\b/i, /bba program/i],
    [/\b(admission office|office of admission|admission director|director of admission)\b|ভর্তি[\s-]*পরিচালক|অ্যাডমিশন ডিরেক্টর/i, /office of admission/i],
    [/\b(treasurer)\b|কোষাধ্যক্ষ|ট্রেজারার/i, /treasurer/i],
    [/\b(registrar)\b|রেজিস্ট্রার/i, /registrar/i],
    [/\b(controller)\b|পরীক্ষা[\s-]*নিয়ন্ত্রক/i, /controller of examinations/i],
  ];

  // 1. Direct person name token match (minimum 4 chars, avoiding generic words)
  const nameMatches = entries.filter((e) => {
    const tokens = e.name
      .toLowerCase()
      .replace(/\b(dr|professor|prof|mr|ms|md|kazi|mohammad)\b\.?/g, '')
      .split(/\s+/)
      .filter((t) => t.length >= 4);
    return tokens.some((t) => q.includes(t));
  });
  if (nameMatches.length > 0) return nameMatches;

  // 2. Specific Executive role match
  if (wantsExecutive) {
    const asksProVc = /\b(pro[\s-]*vc|pro[\s-]*vice[\s-]*chancellor)\b|প্রো[\s-]*ভিসি|উপ-উপাচার্য/i.test(q);
    const asksVc =
      (/\b(vc|vice[\s-]*chancellor)\b|উপাচার্য|ভাইস[\s-]*চ্যান্সেলর|\bভিসি\b/i.test(q) &&
        !asksProVc) ||
      (/\bvice[\s-]*chancellor\b/i.test(q) && !/pro[\s-]*vice/i.test(q));
    const asksTreasurer = /\btreasurer\b|কোষাধ্যক্ষ|ট্রেজারার/i.test(q);
    const asksRegistrar = /\bregistrar\b|রেজিস্ট্রার/i.test(q);
    const asksController = /\bcontroller\b|পরীক্ষা[\s-]*নিয়ন্ত্রক/i.test(q);
    const asksAdmissionDir =
      /\b(admission director|director of admission)\b|ভর্তি[\s-]*পরিচালক/i.test(q);

    const specificMatches: LeadershipEntry[] = [];
    for (const e of entries) {
      const des = e.designation.toLowerCase();
      const unit = e.schoolOrDepartment.toLowerCase();
      if (asksVc && des === 'vice-chancellor') specificMatches.push(e);
      if (asksProVc && des === 'pro-vice-chancellor') specificMatches.push(e);
      if (asksTreasurer && des === 'treasurer') specificMatches.push(e);
      if (asksRegistrar && des === 'registrar') specificMatches.push(e);
      if (asksController && des.includes('controller of examinations')) specificMatches.push(e);
      if (asksAdmissionDir && unit.includes('office of admission')) specificMatches.push(e);
    }
    if (specificMatches.length > 0) return specificMatches;
    return entries.filter((e) => e.roleCategory === 'executive');
  }

  // 3. Role + Department intersection
  let pool = entries;
  if (wantsDeans && !wantsProctorial && !wantsChairOrDirector) {
    pool = entries.filter((e) => e.roleCategory === 'dean');
  } else if (wantsProctorial && !wantsDeans && !wantsChairOrDirector) {
    if (/deputy/i.test(q)) {
      pool = entries.filter((e) => e.designation.toLowerCase().includes('deputy proctor'));
    } else if (/assistant|সহকারী/i.test(q)) {
      pool = entries.filter((e) => e.designation.toLowerCase().includes('assistant proctor'));
    } else if (/\bproctor\b|প্রক্টর/i.test(q) && !/body|committee|list|all|সকল|কারা|বডি/i.test(q)) {
      const mainProctor = entries.filter((e) => e.designation.toLowerCase() === 'proctor');
      pool = mainProctor.length > 0 ? mainProctor : entries.filter((e) => e.roleCategory === 'proctorial');
    } else {
      pool = entries.filter((e) => e.roleCategory === 'proctorial');
    }
  } else if (wantsChairOrDirector && !wantsDeans && !wantsProctorial) {
    pool = entries.filter(
      (e) => e.roleCategory === 'director_chair' || e.designation.toLowerCase().includes('director')
    );
  }

  for (const [queryRegex, targetRegex] of deptMatchers) {
    if (queryRegex.test(q)) {
      const filtered = pool.filter(
        (e) => targetRegex.test(e.schoolOrDepartment) || targetRegex.test(e.designation)
      );
      if (filtered.length > 0) return filtered;
      const globalFiltered = entries.filter(
        (e) => targetRegex.test(e.schoolOrDepartment) || targetRegex.test(e.designation)
      );
      if (globalFiltered.length > 0) return globalFiltered;
    }
  }

  return pool;
}
