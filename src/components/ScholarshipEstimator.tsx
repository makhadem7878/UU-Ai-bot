import React, { useMemo, useState } from 'react';
import { Calculator, ExternalLink, Info, MessageSquare } from 'lucide-react';
import type { Spring2027Program } from '../types';

interface ScholarshipEstimatorProps {
  spring2027Programs: Spring2027Program[];
  onAskInChat: (prompt: string) => void;
}

export const ScholarshipEstimator: React.FC<ScholarshipEstimatorProps> = ({
  spring2027Programs,
  onAskInChat,
}) => {
  const [sscGpa, setSscGpa] = useState('5.00');
  const [hscGpa, setHscGpa] = useState('5.00');
  const [sscYear, setSscYear] = useState('2024');
  const [hscYear, setHscYear] = useState('2026');
  const [programName, setProgramName] = useState(
    spring2027Programs[0]?.program_name || 'BSc in CSE'
  );
  const [isFemale, setIsFemale] = useState(false);

  const selectedProgram = useMemo(
    () =>
      spring2027Programs.find((p) => p.program_name === programName) ||
      spring2027Programs[0],
    [spring2027Programs, programName]
  );

  const estimate = useMemo(() => {
    const ssc = parseFloat(sscGpa);
    const hsc = parseFloat(hscGpa);
    const sscYr = parseInt(sscYear, 10);
    const hscYr = parseInt(hscYear, 10);
    if (Number.isNaN(ssc) || Number.isNaN(hsc) || ssc < 0 || ssc > 5 || hsc < 0 || hsc > 5) {
      return null;
    }

    const combined = ssc + hsc;
    const isDoubleGolden = ssc === 5.0 && hsc === 5.0;
    const meetsFounderYears = sscYr >= 2022 && hscYr >= 2024;

    let meritBandPercent = 0;
    let meritLabel = 'Below general merit chart (< 7.00 combined GPA)';

    if (isDoubleGolden) {
      meritBandPercent = 100;
      meritLabel = meetsFounderYears
        ? 'Founder Scholarship Eligible Tier (Double GPA 5.00, SSC >= 2022 & HSC >= 2024): 100% scholarship; total cost up to BDT 150,000 including all fees, subject to official conditions.'
        : 'Double GPA 5.00 achieved, but Founder Scholarship requires HSC 2024 onwards & SSC 2022 onwards. Confirm alternate merit band with Admission Office.';
    } else if (combined >= 9.76) {
      meritBandPercent = 30;
      meritLabel = 'General Merit Band (9.76 – 9.99): 30% tuition merit band';
    } else if (combined >= 9.51) {
      meritBandPercent = 25;
      meritLabel = 'General Merit Band (9.51 – 9.75): 25% tuition merit band';
    } else if (combined >= 9.01) {
      meritBandPercent = 20;
      meritLabel = 'General Merit Band (9.01 – 9.50): 20% tuition merit band';
    } else if (combined >= 8.51) {
      meritBandPercent = 15;
      meritLabel = 'General Merit Band (8.51 – 9.00): 15% tuition merit band';
    } else if (combined >= 7.0) {
      meritBandPercent = 10;
      meritLabel = 'General Merit Band (7.00 – 8.50): 10% tuition merit band';
    }

    const femaleNote = isFemale
      ? 'Additional 5% female student scholarship may apply subject to Spring 2027 exclusions and the 60% overall scholarship cap.'
      : '';

    return {
      combined,
      isDoubleGolden,
      meetsFounderYears,
      meritBandPercent,
      meritLabel,
      femaleNote,
    };
  }, [sscGpa, hscGpa, sscYear, hscYear, isFemale]);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Spring 2027 Scholarship Eligibility Estimator
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Official Spring 2027 merit bands, Founder Scholarship rules, program-specific flat/merit offers, and the 60% cap.
          </p>
        </div>
        <a
          href="https://www.uttara.ac.bd/scholarship-policy/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline shrink-0"
        >
          <span>Spring 2027 Scholarship Policy</span>
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-sm text-amber-900">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-semibold">Preliminary Estimate Only — Not a Guaranteed Bill:</span>{' '}
          Published scholarship-adjusted maximum costs and merit bands are not guaranteed personal payable amounts. Eligibility and final waivers are confirmed by Uttara University.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6 items-start">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div>
            <label htmlFor="sch-prog" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Desired Program ({spring2027Programs.length} Spring 2027 Programs)
            </label>
            <select
              id="sch-prog"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              {spring2027Programs.map((p) => (
                <option key={p.program_name} value={p.program_name}>
                  {p.program_name} ({p.fees.published_scholarship_offer})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sch-ssc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                SSC GPA
              </label>
              <input
                id="sch-ssc"
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
              <label htmlFor="sch-hsc" className="block text-xs font-semibold text-slate-700 mb-1.5">
                HSC GPA
              </label>
              <input
                id="sch-hsc"
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="sch-ssc-yr" className="block text-xs font-semibold text-slate-700 mb-1.5">
                SSC Passing Year (Founder: 2022+)
              </label>
              <input
                id="sch-ssc-yr"
                type="number"
                value={sscYear}
                onChange={(e) => setSscYear(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
            <div>
              <label htmlFor="sch-hsc-yr" className="block text-xs font-semibold text-slate-700 mb-1.5">
                HSC Passing Year (Founder: 2024+)
              </label>
              <input
                id="sch-hsc-yr"
                type="number"
                value={hscYear}
                onChange={(e) => setHscYear(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-300 font-mono text-sm tabular-nums focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isFemale}
              onChange={(e) => setIsFemale(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span>Female Applicant (+5% additional subject to exclusions & 60% cap)</span>
          </label>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="text-xs text-slate-500">Spring 2027 Policy Band (Estimate)</div>
              <div className="text-lg font-semibold text-slate-900 mt-0.5">
                Combined GPA:{' '}
                <span className="font-mono text-blue-800 tabular-nums">
                  {estimate ? estimate.combined.toFixed(2) : '—'}
                </span>
              </div>
            </div>
            {estimate && estimate.meritBandPercent > 0 && (
              <span className="font-mono text-sm font-semibold text-emerald-700 tabular-nums">
                {estimate.meritBandPercent}% Band
              </span>
            )}
          </div>

          {estimate && (
            <div className="space-y-2.5 text-sm text-slate-700">
              <p>{estimate.meritLabel}</p>
              {estimate.femaleNote && <p className="text-xs text-slate-600">{estimate.femaleNote}</p>}
              <p className="text-xs text-slate-500">
                Total combined scholarship is capped at 60% under Spring 2027 policy (Founder Scholarship follows separate official terms).
              </p>
            </div>
          )}

          {selectedProgram && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-semibold text-slate-900">
                {selectedProgram.program_name} — Spring 2027 Published Table
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Published Total Cost:</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  BDT {selectedProgram.fees.published_total_cost.toLocaleString('en-US')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">
                  Published Offer ({selectedProgram.fees.published_scholarship_offer}):
                </span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  Max Cost BDT{' '}
                  {selectedProgram.fees.published_scholarship_adjusted_maximum_cost.toLocaleString(
                    'en-US'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Est. Monthly Avg ({selectedProgram.fees.estimated_duration_months} mo):</span>
                <span className="font-mono tabular-nums">
                  BDT {selectedProgram.fees.monthly_average_cost_bdt.toLocaleString('en-US')}/mo →
                  BDT{' '}
                  {selectedProgram.fees.monthly_average_after_published_scholarship_bdt.toLocaleString(
                    'en-US'
                  )}
                  /mo
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            <a
              href="https://erp.uttara.ac.bd/tuition-fee-calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              <Calculator className="h-4 w-4 text-blue-700" aria-hidden="true" />
              <span>Open Official Fee Calculator</span>
            </a>

            <button
              type="button"
              onClick={() =>
                onAskInChat(
                  `I want to check Spring 2027 scholarship rules for ${programName}. My SSC GPA is ${sscGpa} (${sscYear}), HSC GPA is ${hscGpa} (${hscYear})${
                    isFemale ? ', and I am a female applicant' : ''
                  }. Please explain the merit chart, published offer, and 60% cap.`
                )
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>Verify Conditions in Chat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
