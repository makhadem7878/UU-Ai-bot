import React, { useMemo, useState } from 'react';
import { ExternalLink, Mail, MessageSquare, Search } from 'lucide-react';
import type { LeadershipEntry } from '../types';

interface LeadershipDirectoryProps {
  entries: LeadershipEntry[];
  onAskInChat: (prompt: string) => void;
}

type RoleFilter = 'all' | 'executive' | 'dean' | 'director_chair' | 'proctorial';

function getInitials(name: string): string {
  const words = name
    .replace(/\b(Professor|Prof\.|Dr\.|Dr|Mr\.|Mr|Ms\.|Ms|Md\.|Md)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'UU';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

const LeadershipAvatar: React.FC<{ entry: LeadershipEntry }> = ({ entry }) => {
  const [imgFailed, setImgFailed] = useState(false);

  if (entry.officialPhotoUrl && !imgFailed) {
    return (
      <img
        src={entry.officialPhotoUrl}
        alt={`${entry.name}, ${entry.designation}`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="h-14 w-14 rounded-xl object-cover border border-slate-200 bg-slate-100 shrink-0"
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="h-14 w-14 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 font-semibold text-sm flex items-center justify-center shrink-0"
    >
      {getInitials(entry.name)}
    </div>
  );
};

export const LeadershipDirectory: React.FC<LeadershipDirectoryProps> = ({
  entries,
  onAskInChat,
}) => {
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    return {
      all: entries.length,
      executive: entries.filter((e) => e.roleCategory === 'executive').length,
      dean: entries.filter((e) => e.roleCategory === 'dean').length,
      director_chair: entries.filter((e) => e.roleCategory === 'director_chair').length,
      proctorial: entries.filter((e) => e.roleCategory === 'proctorial').length,
    };
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== 'all' && e.roleCategory !== filter) return false;
      if (!q) return true;
      return (
        e.name.toLowerCase().includes(q) ||
        e.designation.toLowerCase().includes(q) ||
        e.schoolOrDepartment.toLowerCase().includes(q) ||
        (e.publicEmail && e.publicEmail.toLowerCase().includes(q))
      );
    });
  }, [entries, filter, search]);

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Academic Leadership &amp; Proctorial Directory
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Official Executive Officers, Deans, Associate Deans, Program Directors, Department Chairmen, and Proctorial Body of Uttara University.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            onAskInChat('Who are the Vice-Chancellor, Pro-Vice-Chancellor, Treasurer, Registrar, and Controller of Examinations?')
          }
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[40px] rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-medium transition-colors shrink-0"
        >
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          <span>Summarize in Chat</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'all', label: `All (${counts.all})` },
            { id: 'executive', label: `Executive & Officers (${counts.executive})` },
            { id: 'dean', label: `Deans (${counts.dean})` },
            { id: 'director_chair', label: `Directors & Chairmen (${counts.director_chair})` },
            { id: 'proctorial', label: `Proctorial Body (${counts.proctorial})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id as RoleFilter)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, role, or department..."
            aria-label="Search leadership directory"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
          No matching leadership records found. Try clearing your search filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <article
              key={entry.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex items-start gap-3.5">
                <LeadershipAvatar entry={entry} />
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 leading-snug">
                    {entry.name}
                  </h2>
                  <div className="text-xs font-medium text-blue-700 mt-0.5">
                    {entry.designation}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {entry.schoolOrDepartment}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {entry.publicEmail ? (
                  <a
                    href={`mailto:${entry.publicEmail}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-blue-700 truncate"
                  >
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">{entry.publicEmail}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>Public email not listed in notice</span>
                  </div>
                )}

                {entry.verificationNote && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2.5 py-1.5 leading-relaxed">
                    {entry.verificationNote}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-3">
                    <a
                      href={entry.profileOrSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                    >
                      <span>{entry.sourceUrl && entry.sourceUrl !== entry.profileOrSourceUrl ? 'Profile' : 'Official Source'}</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                    {entry.sourceUrl && entry.sourceUrl !== entry.profileOrSourceUrl && (
                      <a
                        href={entry.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline"
                      >
                        <span>Source</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={entry.photoStatus}>
                    {entry.officialPhotoUrl ? 'Photo verified' : 'No photo URL'}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
