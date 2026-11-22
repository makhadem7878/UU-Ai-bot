import React, { useState } from 'react';
import { GraduationCap, Phone } from 'lucide-react';
import { ASSETS, type WorkspaceTab } from '../types';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenContact: () => void;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'chat', label: 'Assistant Chat' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'compare', label: 'Compare' },
  { id: 'leadership', label: 'Leadership' },
];

export const TopBar: React.FC<TopBarProps> = ({ activeTab, onSelectTab, onOpenContact }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single Brand Wordmark with University Emblem */}
        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg shrink-0"
        >
          <div className="h-9 w-9 rounded-lg overflow-hidden border border-slate-200 bg-blue-950 flex items-center justify-center shrink-0">
            {!logoError ? (
              <img
                src={ASSETS.universityLogo}
                alt="Uttara University crest"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <GraduationCap className="h-5 w-5 text-white" aria-hidden="true" />
            )}
          </div>
          <span className="font-semibold text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap shrink-0">
            Uttara University
          </span>
        </button>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav aria-label="Workspace navigation" className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded ${
                  isActive
                    ? 'text-blue-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-blue-700 rounded-full"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenContact}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Admission Office</span>
          </button>
        </div>
      </div>

      {/* Mobile Compact Tab Bar */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden border-t border-slate-100 px-3 py-1.5 flex items-center gap-1 overflow-x-auto bg-slate-50/70"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-2 min-h-[40px] rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-white text-blue-700 border border-slate-200 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
