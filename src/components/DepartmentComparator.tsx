import React, { useState } from 'react';
import { ExternalLink, MessageSquare } from 'lucide-react';
import type { KnowledgeRecord, Spring2027Program } from '../types';

interface DepartmentComparatorProps {
  departments: KnowledgeRecord[];
  spring2027Programs: Spring2027Program[];
  onAskInChat: (prompt: string) => void;
}

export const DepartmentComparator: React.FC<DepartmentComparatorProps> = ({
  departments,
  spring2027Programs,
  onAskInChat,
}) => {
  const [leftName, setLeftName] = useState(
    spring2027Programs[0]?.program_name || 'BSc in CSE'
  );
  const [rightName, setRightName] = useState(
    spring2027Programs.find((p) => p.program_name === 'BBA')?.program_name ||
      spring2027Programs[1]?.program_name ||
      'BBA'
  );

  const leftProg =
    spring2027Programs.find((p) => p.program_name === leftName) || spring2027Programs[0];
  const rightProg =
    spring2027Programs.find((p) => p.program_name === rightName) || spring2027Programs[1];

  const findDeptGuidance = (prog?: Spring2027Program) => {
    if (!prog) return null;
    const pLower = prog.program_name.toLowerCase();
    return (
      departments.find((d) => {
        const t = d.title.toLowerCase();
        if (pLower.includes('cse') && t.includes('computer')) return true;
        if (pLower.includes('eee') && t.includes('electrical')) return true;
        if ((pLower === 'bba' || pLower.includes('mba')) && t.includes('business')) return true;
        if (pLower.includes('civil') && t.includes('civil')) return true;
        if (pLower.includes('textile') && t.includes('textile')) return true;
        if (pLower.includes('english') && t.includes('english')) return true;
        if ((pLower.includes('llb') || pLower.includes('llm')) && t.includes('law')) return true;
        return false;
      }) || null
    );
  };

  const renderProgramColumn = (
    prog: Spring2027Program | undefined,
    selectedName: string,
    onChange: (name: string) => void,
    label: string
  ) => {
    const dept = findDeptGuidance(prog);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
          <select
            value={selectedName}
            onChange={(e) => onChange(e.target.value)}
            aria-label={label}
            className="w-full h-11 px-3 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            {spring2027Programs.map((p) => (
              <option key={p.program_name} value={p.program_name}>
                {p.program_name} ({p.level})
              </option>
            ))}
          </select>
        </div>

        {prog && (
          <>
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <div className="text-xs text-blue-700 font-medium">{prog.school}</div>
              <h2 className="text-lg font-semibold text-slate-900">{prog.program_name}</h2>
              <p className="text-xs text-slate-500">
                {prog.level} · {prog.fees.total_semesters} semesters · {prog.fees.total_credits} credits
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">Published Total Cost</div>
                <div className="font-mono font-semibold text-sm text-blue-800 tabular-nums mt-0.5">
                  BDT {prog.fees.published_total_cost.toLocaleString('en-US')}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500">
                  Adjusted Max ({prog.fees.published_scholarship_offer})
                </div>
                <div className="font-mono font-semibold text-sm text-emerald-700 tabular-nums mt-0.5">
                  BDT {prog.fees.published_scholarship_adjusted_maximum_cost.toLocaleString('en-US')}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Admission Fee / At Admission</div>
                <div className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                  BDT {prog.fees.admission_fee.toLocaleString('en-US')} / BDT{' '}
                  {prog.fees.payable_during_admission_including_first_semester_registration_and_listed_fees.toLocaleString(
                    'en-US'
                  )}
                </div>
              </div>
              <div>
                <div className="text-slate-500">
                  Est. Monthly Avg ({prog.fees.estimated_duration_months} mo)
                </div>
                <div className="font-mono font-medium text-slate-900 tabular-nums mt-0.5">
                  BDT {prog.fees.monthly_average_cost_bdt.toLocaleString('en-US')}/mo (BDT{' '}
                  {prog.fees.monthly_average_after_published_scholarship_bdt.toLocaleString('en-US')}
                  /mo offer)
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-slate-600">Entry Requirements</div>
              {prog.eligibility.manual_confirmation_required ? (
                <p className="text-amber-800">
                  Complete entry criteria not found in captured page — confirm with Admission Office.
                </p>
              ) : (
                <p className="text-slate-700 leading-relaxed">
                  {prog.eligibility.general ||
                    prog.eligibility.diploma_holder ||
                    prog.eligibility.postgraduate}
                </p>
              )}
            </div>

            {dept?.important_subjects && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">Core Subjects</div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  {dept.important_subjects.join(' · ')}
                </div>
              </div>
            )}

            {dept?.career_paths && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">
                  Potential Career Paths (General Guidance)
                </div>
                <ul className="space-y-1 text-xs text-slate-700">
                  {dept.career_paths.map((c) => (
                    <li key={c} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              <a
                href={prog.fees.fee_source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
              >
                <span>Spring 2027 Fee Page</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <span className="text-slate-400 font-mono tabular-nums">
                Updated {prog.fees.fee_last_updated}
              </span>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Program & Department Comparison
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Compare any two Spring 2027 programs side by side across credits, itemized costs, monthly budgeting averages, and eligibility.
          </p>
        </div>

        {leftProg && rightProg && (
          <button
            type="button"
            onClick={() =>
              onAskInChat(
                `Compare ${leftProg.program_name} and ${rightProg.program_name} at Uttara University for Spring 2027 in terms of entry requirements, tuition fees, monthly budgeting averages, and career guidance.`
              )
            }
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors shrink-0"
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            <span>Ask AI to Compare Both</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderProgramColumn(leftProg, leftName, setLeftName, 'Program A')}
        {renderProgramColumn(rightProg, rightName, setRightName, 'Program B')}
      </div>
    </div>
  );
};
