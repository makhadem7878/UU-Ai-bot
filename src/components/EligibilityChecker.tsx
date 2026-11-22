import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, MessageSquare, XCircle } from 'lucide-react';
import type { KnowledgeRecord, Spring2027Program } from '../types';

interface EligibilityCheckerProps {
  requirements: KnowledgeRecord[];
  spring2027Programs: Spring2027Program[];
  onAskInChat: (prompt: string) => void;
}

type StudentTrack = 'ssc_hsc' | 'english_medium' | 'diploma' | 'foreign' | 'postgraduate';

export const EligibilityChecker: React.FC<EligibilityCheckerProps> = ({
  spring2027Programs,
  onAskInChat,
}) => {
  const [track, setTrack] = useState<StudentTrack>('ssc_hsc');
  const [selectedProgramName, setSelectedProgramName] = useState(
    spring2027Programs[0]?.program_name || 'BSc in CSE'
  );
  const [sscGpa, setSscGpa] = useState('4.50');
  const [hscGpa, setHscGpa] = useState('4.25');
  const [ugCgpa, setUgCgpa] = useState('3.20');
  const [group, setGroup] = useState<'Science' | 'Business' | 'Humanities'>('Science');
  const [hasPhysMathC, setHasPhysMathC] = useState(true);
  const [oLevelAvg, setOLevelAvg] = useState('3.20');
  const [aLevelAvg, setALevelAvg] = useState('2.50');

  const selectedProgram = useMemo(
    () =>
      spring2027Programs.find((p) => p.program_name === selectedProgramName) ||
      spring2027Programs[0],
    [spring2027Programs, selectedProgramName]
  );

  const handleProgramChange = (name: string) => {
    setSelectedProgramName(name);
    const prog = spring2027Programs.find((p) => p.program_name === name);
    if (prog?.level === 'graduate' && track !== 'postgraduate') {
      setTrack('postgraduate');
    } else if (prog?.program_name.includes('Diploma Holder')) {
      setTrack('diploma');
    } else if (prog?.level === 'undergraduate' && track === 'postgraduate') {
      setTrack('ssc_hsc');
    }
  };

  const evaluation = useMemo(() => {
    if (!selectedProgram) {
      return {
        status: 'review' as const,
        title: 'Loading Program Catalog...',
        summary: 'Please wait while official entry requirements load.',
        reasons: [],
      };
    }

    const elig = selectedProgram.eligibility;
    const isManualRequired =
      Boolean(elig.manual_confirmation_required) ||
      selectedProgram.record_status === 'partially_verified';

    if (elig.manual_confirmation_required) {
      return {
        status: 'review' as const,
        title: `${selectedProgram.program_name} — Manual Confirmation Required`,
        summary:
          'Complete entry requirements for this program are not listed in the captured official entry table.',
        reasons: [
          'Do not rely on assumed cutoffs. Please contact the Admission Office (09640 888272 / admission@uttara.ac.bd).',
        ],
      };
    }

    if (track === 'postgraduate' || selectedProgram.level === 'graduate') {
      const cgpa = parseFloat(ugCgpa);
      const ssc = parseFloat(sscGpa);
      const hsc = parseFloat(hscGpa);
      if (elig.postgraduate?.includes('Manual confirmation required')) {
        return {
          status: 'review' as const,
          title: `${selectedProgram.program_name} — Manual Confirmation Required`,
          summary: elig.postgraduate,
          reasons: ['Verify route details with the Admission Office before applying.'],
        };
      }
      if (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 4) {
        return {
          status: 'review' as const,
          title: 'Enter Valid Undergraduate CGPA (0.00 – 4.00)',
          summary: 'Most graduate tracks require CGPA >= 2.00/4.00 plus SSC/HSC conditions.',
          reasons: [],
        };
      }
      const cgpaOk = cgpa >= 2.0;
      const sscHscOk =
        (!Number.isNaN(ssc) && !Number.isNaN(hsc) && ((ssc >= 2.5 && hsc >= 2.5) || (ssc + hsc >= 6.0 && ssc >= 2.0 && hsc >= 2.0))) ||
        selectedProgram.program_name.includes('Apparel');

      if (cgpaOk && sscHscOk) {
        return {
          status: isManualRequired ? ('review' as const) : ('eligible' as const),
          title: `Preliminary Match for ${selectedProgram.program_name}`,
          summary: elig.postgraduate || 'Meets published CGPA >= 2.00/4.00 threshold.',
          reasons: [
            `Entered Undergraduate CGPA: ${cgpa.toFixed(2)} / 4.00 (minimum 2.00)`,
            'Verify degree discipline & transcript equivalence with the department.',
          ],
        };
      }
      return {
        status: 'not_eligible' as const,
        title: 'Does Not Meet Published Graduate Minimums',
        summary: elig.postgraduate || 'Minimum CGPA 2.00/4.00 and SSC/HSC thresholds apply.',
        reasons: [
          !cgpaOk ? 'Requires undergraduate CGPA >= 2.00 / 4.00.' : 'Check SSC/HSC GPA minimums.',
        ],
      };
    }

    if (track === 'diploma') {
      if (
        elig.diploma_holder?.includes('needs_manual_confirmation') ||
        elig.diploma_holder?.includes('inconsistency')
      ) {
        return {
          status: 'review' as const,
          title: 'Civil Engineering Diploma Track — Manual Confirmation Required',
          summary:
            'The official entry page contains a copy/paste inconsistency referring to FDT Evening/textile technology under Civil Engineering.',
          reasons: [
            'Do not assume diploma discipline eligibility — confirm accepted diploma technology directly with Admission Office (09640 888272).',
          ],
        };
      }

      const ssc = parseFloat(sscGpa);
      const dip = parseFloat(hscGpa);
      const isFdt = selectedProgram.program_name.includes('Fashion');
      const minSep = isFdt ? 2.0 : 2.5;
      const minComb = isFdt ? 4.0 : 6.0;
      const passes =
        !Number.isNaN(ssc) &&
        !Number.isNaN(dip) &&
        ((ssc >= minSep && dip >= minSep) || (ssc + dip >= minComb && ssc >= 2.0 && dip >= 2.0));

      return {
        status: passes ? ('eligible' as const) : ('not_eligible' as const),
        title: passes
          ? `Preliminary Match (Diploma Track) — ${selectedProgram.program_name}`
          : 'Does Not Meet Diploma GPA Threshold',
        summary:
          elig.diploma_holder ||
          'BTEB Diploma holders may apply subject to department-approved diploma discipline.',
        reasons: [
          `Requires SSC & BTEB Diploma GPA >= ${minSep.toFixed(2)} separately or >= ${minComb.toFixed(2)} combined.`,
          'Verify accepted BTEB diploma technology with the Admission Office.',
        ],
      };
    }

    if (track === 'foreign') {
      return {
        status: 'review' as const,
        title: `Foreign / International Track — ${selectedProgram.program_name}`,
        summary:
          elig.foreign_student ||
          'At least 50% marks in Grade 10 and Grade 12; equivalent certificate from the Ministry of Education is required.',
        reasons: ['Submit Grade 10 & 12 transcripts for Ministry equivalence verification.'],
      };
    }

    if (track === 'english_medium') {
      if (!elig.english_medium) {
        return {
          status: 'review' as const,
          title: 'English Medium Criteria Not Explicitly Listed for This Program',
          summary: 'Please confirm O/A-Level equivalency directly with the Admission Office.',
          reasons: [],
        };
      }
      const oVal = parseFloat(oLevelAvg) || 0;
      const aVal = parseFloat(aLevelAvg) || 0;
      const isFdt = selectedProgram.program_name.includes('Fashion');
      const oMin = isFdt ? 2.0 : 2.5;
      const requiresScience = selectedProgram.school === 'School of Science and Engineering' ||
        selectedProgram.program_name.includes('Civil') ||
        selectedProgram.program_name.includes('Textile');

      const oPass = oVal >= oMin;
      const aPass = aVal >= 2.0;
      const groupOk = !requiresScience || (group === 'Science' && hasPhysMathC);

      if (oPass && aPass && groupOk) {
        return {
          status: 'eligible' as const,
          title: `Preliminary Match (O/A-Level) — ${selectedProgram.program_name}`,
          summary: elig.english_medium,
          reasons: [
            `O-Level average ${oVal.toFixed(2)} >= ${oMin.toFixed(2)}`,
            `A-Level average ${aVal.toFixed(2)} >= 2.00 (only one E acceptable)`,
          ],
        };
      }
      return {
        status: 'not_eligible' as const,
        title: 'Does Not Meet O/A-Level Minimums',
        summary: elig.english_medium,
        reasons: [
          !oPass ? `O-Level average across 5 subjects must be >= ${oMin.toFixed(2)}.` : '',
          !aPass ? 'A-Level average across 2 subjects must be >= 2.00.' : '',
          !groupOk ? 'Requires Science subjects including minimum C grade in A-Level Mathematics/Physics.' : '',
        ].filter(Boolean),
      };
    }

    // Standard SSC & HSC track
    const ssc = parseFloat(sscGpa);
    const hsc = parseFloat(hscGpa);
    if (Number.isNaN(ssc) || Number.isNaN(hsc) || ssc < 0 || ssc > 5 || hsc < 0 || hsc > 5) {
      return {
        status: 'review' as const,
        title: 'Enter Valid GPA Values (0.00 – 5.00)',
        summary: 'Please enter valid SSC and HSC GPAs on the 5.00 scale.',
        reasons: [],
      };
    }

    const isFdt = selectedProgram.program_name.includes('Fashion');
    const minSep = isFdt ? 2.0 : 2.5;
    const minComb = isFdt ? 4.0 : 6.0;
    const requiresScience =
      elig.general?.toLowerCase().includes('science group') ?? false;
    const requiresPhysMath =
      elig.general?.toLowerCase().includes('physics and mathematics') ?? false;

    const combined = ssc + hsc;
    const meetsSeparate = ssc >= minSep && hsc >= minSep;
    const meetsCombined = !isFdt && combined >= minComb && ssc >= 2.0 && hsc >= 2.0;
    const gpaOk = meetsSeparate || meetsCombined;
    const groupOk = !requiresScience || group === 'Science';
    const subjectOk = !requiresPhysMath || hasPhysMathC;

    if (gpaOk && groupOk && subjectOk) {
      return {
        status: 'eligible' as const,
        title: `Preliminary Match — ${selectedProgram.program_name}`,
        summary:
          elig.general || 'Satisfies published entry GPA requirements (preliminary check only).',
        reasons: [
          meetsSeparate
            ? `Separate GPAs (${ssc.toFixed(2)} and ${hsc.toFixed(2)}) >= ${minSep.toFixed(2)}`
            : `Combined GPA (${combined.toFixed(2)}) >= ${minComb.toFixed(2)} (neither below 2.00)`,
          requiresScience
            ? 'Science group & minimum C grade in Physics and Mathematics confirmed'
            : 'Open to all academic groups',
        ],
      };
    }

    return {
      status: 'not_eligible' as const,
      title: 'Does Not Meet Published Minimums',
      summary: elig.general || 'Please review the unmet entry conditions below.',
      reasons: [
        !gpaOk
          ? `Requires GPA >= ${minSep.toFixed(2)} separately${!isFdt ? ' or >= 6.00 combined (neither below 2.00)' : ''}.`
          : '',
        !groupOk ? `${selectedProgram.program_name} requires Science group.` : '',
        !subjectOk ? 'Requires at least a "C" grade in Physics and Mathematics.' : '',
      ].filter(Boolean),
    };
  }, [selectedProgram, track, sscGpa, hscGpa, ugCgpa, group, hasPhysMathC, oLevelAvg, aLevelAvg]);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Admission Eligibility Checker
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Preliminary eligibility guidance across {spring2027Programs.length || 30} official undergraduate, diploma, and graduate programs (updated 2026-11-18).
          </p>
        </div>
        <a
          href="https://uttarauniversity.edu.bd/entry-requirements/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline shrink-0"
        >
          <span>Official Entry Requirements</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
          <div>
            <label htmlFor="elig-program" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Program ({spring2027Programs.length} Official Programs)
            </label>
            <select
              id="elig-program"
              value={selectedProgramName}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {spring2027Programs.map((p) => (
                <option key={p.program_name} value={p.program_name}>
                  {p.program_name} ({p.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              Applicant Background Track
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg">
              {[
                { id: 'ssc_hsc', label: 'SSC & HSC' },
                { id: 'english_medium', label: 'O / A Level' },
                { id: 'diploma', label: 'Diploma' },
                { id: 'foreign', label: 'Foreign' },
                { id: 'postgraduate', label: 'Graduate' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrack(t.id as StudentTrack)}
                  className={`px-2.5 py-2 min-h-[38px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    track === t.id
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(track === 'ssc_hsc' || track === 'diploma' || track === 'postgraduate') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="ssc-gpa" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  SSC GPA (5.00 scale)
                </label>
                <input
                  id="ssc-gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={sscGpa}
                  onChange={(e) => setSscGpa(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div>
                <label htmlFor="hsc-gpa" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {track === 'diploma' ? 'BTEB Diploma GPA (4.00 / 5.00)' : 'HSC GPA (5.00 scale)'}
                </label>
                <input
                  id="hsc-gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={hscGpa}
                  onChange={(e) => setHscGpa(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          {(track === 'postgraduate' || selectedProgram?.level === 'graduate') && (
            <div>
              <label htmlFor="ug-cgpa" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Bachelor&apos;s / Undergraduate CGPA (4.00 scale)
              </label>
              <input
                id="ug-cgpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={ugCgpa}
                onChange={(e) => setUgCgpa(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          )}

          {track === 'english_medium' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="o-avg" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  O-Level Average (5 Subjects, 5.0 scale)
                </label>
                <input
                  id="o-avg"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={oLevelAvg}
                  onChange={(e) => setOLevelAvg(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
              <div>
                <label htmlFor="a-avg" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  A-Level Average (2 Subjects, 5.0 scale)
                </label>
                <input
                  id="a-avg"
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={aLevelAvg}
                  onChange={(e) => setALevelAvg(e.target.value)}
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                />
              </div>
            </div>
          )}

          {(track === 'ssc_hsc' || track === 'english_medium') && selectedProgram?.level === 'undergraduate' && (
            <div className="space-y-3 pt-1">
              <div>
                <label htmlFor="acad-group" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Academic Group
                </label>
                <select
                  id="acad-group"
                  value={group}
                  onChange={(e) =>
                    setGroup(e.target.value as 'Science' | 'Business' | 'Humanities')
                  }
                  className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                >
                  <option value="Science">Science</option>
                  <option value="Business">Business Studies / Commerce</option>
                  <option value="Humanities">Humanities / Arts</option>
                </select>
              </div>

              {(selectedProgram?.eligibility.general?.includes('Physics and Mathematics') ||
                selectedProgram?.eligibility.english_medium?.includes('Mathematics')) && (
                <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={hasPhysMathC}
                    onChange={(e) => setHasPhysMathC(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>I have at least a &quot;C&quot; grade in Physics and Mathematics</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            {evaluation.status === 'eligible' && (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {evaluation.status === 'not_eligible' && (
              <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            {evaluation.status === 'review' && (
              <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900">{evaluation.title}</h2>
              <p className="text-sm text-slate-600 mt-1">{evaluation.summary}</p>
            </div>
          </div>

          {evaluation.reasons.length > 0 && (
            <ul className="space-y-2 pt-2 border-t border-slate-100 text-sm text-slate-700">
              {evaluation.reasons.map((r, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}

          {selectedProgram && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">
                Spring 2027 Published Cost ({selectedProgram.program_name})
              </div>
              <div className="font-mono text-slate-900 tabular-nums">
                Total: BDT {selectedProgram.fees.published_total_cost.toLocaleString('en-US')} ·
                Admission: BDT {selectedProgram.fees.admission_fee.toLocaleString('en-US')} ·
                Monthly Avg: ~BDT {selectedProgram.fees.monthly_average_cost_bdt.toLocaleString('en-US')}/mo
              </div>
              <div className="text-[11px] text-slate-500">
                Preliminary guidance only — final eligibility is confirmed by the Admission Office.
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                onAskInChat(
                  `What are the Spring 2027 tuition fees and entry requirements for ${selectedProgramName} (${track} track)?`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>View Full Fee & Eligibility in Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
