import React from 'react';
import { Calculator, ExternalLink, Mail, MapPin, Phone, ShieldCheck, X } from 'lucide-react';
import type { VerificationSummary } from '../types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: VerificationSummary | null;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, summary }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 id="contact-modal-title" className="text-lg font-semibold text-slate-900">
              Uttara University Admission Office
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official Contact & Verification Reference
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact dialog"
            className="h-10 w-10 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-blue-700 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-slate-900">Permanent Campus Address</div>
                <p className="text-slate-600">
                  Holding 77, Beribadh Road, Turag, Uttara, Dhaka 1230, Bangladesh
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 text-blue-700 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-slate-900">Admission Hotline & Mobile</div>
                <p className="text-slate-600 font-mono tabular-nums text-[13px]">
                  Hunting: 09640 888272 · Mobile: 01872607360 – 01872607369
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-blue-700 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <div className="font-medium text-slate-900">Official Emails</div>
                <div className="space-y-0.5">
                  <a
                    href="mailto:admission@uttara.ac.bd"
                    className="block text-blue-700 hover:underline"
                  >
                    admission@uttara.ac.bd
                  </a>
                  <a
                    href="mailto:info@uttarauniversity.edu.bd"
                    className="block text-blue-700 hover:underline"
                  >
                    info@uttarauniversity.edu.bd
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <a
              href="https://erp.uttara.ac.bd/tuition-fee-calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors"
            >
              <Calculator className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Official Fee Calculator</span>
            </a>
            <a
              href="https://uttarauniversity.edu.bd/contact-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Official Contact Page</span>
            </a>
          </div>

          {summary && (
            <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-700 shrink-0" aria-hidden="true" />
                <span>Knowledge Base Records</span>
              </div>
              <div className="font-mono tabular-nums">
                {summary.verified} verified · {summary.needs_review} review · {summary.historical} historical
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
