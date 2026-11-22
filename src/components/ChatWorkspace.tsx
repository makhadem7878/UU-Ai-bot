import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calculator,
  Check,
  Copy,
  ExternalLink,
  Mail,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  ASSETS,
  QUICK_REPLY_TOPICS,
  type ChatMessage,
  type FeeCardData,
  type LeadershipEntry,
} from '../types';
import { SafeMessageContent } from './SafeMessageContent';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onResetChat: () => void;
  onOpenContact: () => void;
}

function getLeadershipInitials(name: string): string {
  const words = name
    .replace(/\b(Professor|Prof\.|Dr\.|Dr|Mr\.|Mr|Ms\.|Ms|Md\.|Md)\b/gi, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'UU';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

const ChatLeadershipCard: React.FC<{ entry: LeadershipEntry }> = ({ entry }) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-start gap-3">
      {entry.officialPhotoUrl && !imgFailed ? (
        <img
          src={entry.officialPhotoUrl}
          alt={`${entry.name}, ${entry.designation}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-11 w-11 rounded-lg object-cover border border-slate-200 bg-slate-100 shrink-0"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-11 w-11 rounded-lg border border-blue-200 bg-blue-50 text-blue-800 font-semibold text-xs flex items-center justify-center shrink-0"
        >
          {getLeadershipInitials(entry.name)}
        </div>
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <div className="font-semibold text-slate-900 leading-snug">{entry.name}</div>
        <div className="text-blue-700 font-medium">{entry.designation}</div>
        <div className="text-slate-600">{entry.schoolOrDepartment}</div>
        {entry.verificationNote && (
          <p className="text-[11px] text-slate-500 leading-snug">{entry.verificationNote}</p>
        )}
        <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {entry.publicEmail ? (
            <a
              href={`mailto:${entry.publicEmail}`}
              className="inline-flex items-center gap-1 text-slate-700 hover:text-blue-700 hover:underline"
            >
              <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{entry.publicEmail}</span>
            </a>
          ) : (
            <span className="text-slate-400">Email not listed in notice</span>
          )}
          <a
            href={entry.sourceUrl || entry.profileOrSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
          >
            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>Official Source</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  isLoading,
  onSendMessage,
  onResetChat,
  onOpenContact,
}) => {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 sm:py-6 h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] min-h-[560px]">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[310px_1fr] gap-5">
        {/* Left Sidebar: Campus Overview & Quick Reply Topics */}
        <aside className="hidden lg:flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Campus Card */}
          <div className="relative h-36 bg-blue-950 shrink-0 overflow-hidden">
            {!bannerError ? (
              <img
                src={ASSETS.campusBanner}
                alt="Uttara University Dhaka campus"
                referrerPolicy="no-referrer"
                onError={() => setBannerError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-blue-900 to-slate-900">
                <Building2 className="h-10 w-10 text-blue-200" aria-hidden="true" />
              </div>
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent"
              aria-hidden="true"
            />
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <div className="text-sm font-semibold">Uttara University Campus</div>
              <div className="text-xs text-slate-200">
                Turag, Uttara, Dhaka 1230 · Est. 2003
              </div>
            </div>
          </div>

          {/* University Key Figures (Unboxed Typographic Grid) */}
          <div className="px-4 py-3.5 border-b border-slate-200 grid grid-cols-3 gap-2 text-center bg-slate-50/70">
            <div>
              <div className="font-mono text-base font-semibold text-blue-800 tabular-nums">5</div>
              <div className="text-[11px] text-slate-600">Schools</div>
            </div>
            <div>
              <div className="font-mono text-base font-semibold text-blue-800 tabular-nums">14</div>
              <div className="text-[11px] text-slate-600">Departments</div>
            </div>
            <div>
              <div className="font-mono text-base font-semibold text-blue-800 tabular-nums">39</div>
              <div className="text-[11px] text-slate-600">Programs</div>
            </div>
          </div>

          {/* Quick Reply Topics */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 tracking-wide">
                Quick Admission Topics
              </h2>
              <span className="text-[11px] text-slate-400">Spring 2027</span>
            </div>
            <div className="space-y-1.5">
              {QUICK_REPLY_TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => onSendMessage(topic.prompt)}
                  className="w-full text-left px-3 py-2.5 min-h-[40px] rounded-lg border border-slate-200 bg-white hover:bg-blue-50/70 hover:border-blue-300 text-xs font-medium text-slate-800 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Official ERP Calculator Shortcut */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-2">
            <a
              href="https://erp.uttara.ac.bd/tuition-fee-calculator"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-medium text-blue-900 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Calculator className="h-3.5 w-3.5 text-blue-700 shrink-0" aria-hidden="true" />
                <span>Official ERP Fee Calculator</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-blue-700 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </aside>

        {/* Right Stage: Messenger-Inspired Chat Window */}
        <section
          aria-label="Admission Support Chat"
          className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0"
        >
          {/* Chat Header */}
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-blue-50 shrink-0">
                {!avatarError ? (
                  <img
                    src={ASSETS.assistantAvatar}
                    alt="Uttara University AI Admission Assistant avatar"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-blue-700 text-white font-semibold text-sm">
                    UU
                  </div>
                )}
                {/* Messenger Online Indicator */}
                <span
                  title="Online"
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
                  Uttara University AI Admission Assistant
                </h1>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="text-emerald-700 font-medium">Online</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">Bangla & English Official Policy Support</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onResetChat}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                title="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Reset Chat</span>
              </button>
            </div>
          </div>

          {/* Mobile Quick Reply Strip */}
          <div className="lg:hidden border-b border-slate-100 px-3 py-2 flex items-center gap-1.5 overflow-x-auto bg-slate-50/70 shrink-0">
            {QUICK_REPLY_TOPICS.map((topic) => (
              <button
                key={topic.label}
                type="button"
                disabled={isLoading}
                onClick={() => onSendMessage(topic.prompt)}
                className="px-3 py-1.5 min-h-[36px] rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-800 whitespace-nowrap shrink-0"
              >
                {topic.label}
              </button>
            ))}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 bg-slate-50/60">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-blue-50 shrink-0 mb-1">
                      {!avatarError ? (
                        <img
                          src={ASSETS.assistantAvatar}
                          alt=""
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-blue-700 text-white text-xs font-semibold">
                          UU
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        isUser
                          ? 'bg-blue-700 text-white rounded-br-sm shadow-xs'
                          : msg.isError
                          ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-sm'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm shadow-xs'
                      }`}
                    >
                      {msg.isError && (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700 mb-1.5">
                          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                          <span>Service Notice</span>
                        </div>
                      )}

                      <SafeMessageContent text={msg.content} isUser={isUser} />

                      {/* Fee Information Cards inside assistant response */}
                      {!isUser && msg.feeCards && msg.feeCards.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                          {msg.feeCards.map((card: FeeCardData, i: number) => (
                            <div
                              key={`${card.programName}-${i}`}
                              className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                                <span className="font-semibold text-slate-900">
                                  {card.programName}
                                </span>
                                <span className="text-slate-500 font-medium shrink-0">
                                  {card.intake || 'Spring 2027'} · {card.programCategory}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                {card.totalSemesters != null && card.totalCredits != null && (
                                  <div>
                                    <span className="text-slate-500 block">Duration / Credits</span>
                                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                                      {card.totalSemesters} sem · {card.totalCredits} cr
                                    </span>
                                  </div>
                                )}
                                {card.admissionFee != null && (
                                  <div>
                                    <span className="text-slate-500 block">Admission Fee</span>
                                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                                      BDT {card.admissionFee.toLocaleString('en-US')}
                                    </span>
                                  </div>
                                )}
                                {card.feePerCredit != null && (
                                  <div>
                                    <span className="text-slate-500 block">Fee per Credit</span>
                                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                                      BDT {card.feePerCredit.toLocaleString('en-US')}
                                    </span>
                                  </div>
                                )}
                                {card.payableAtAdmission != null && (
                                  <div>
                                    <span className="text-slate-500 block">Payable at Admission</span>
                                    <span className="font-mono font-medium text-slate-800 tabular-nums">
                                      BDT {card.payableAtAdmission.toLocaleString('en-US')}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-1.5 border-t border-slate-200 space-y-1">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="text-slate-600">Published Total Cost:</span>
                                  {card.totalCostBdt !== null ? (
                                    <span className="font-mono font-semibold text-sm text-blue-800 tabular-nums">
                                      BDT {card.totalCostBdt.toLocaleString('en-US')}
                                    </span>
                                  ) : (
                                    <span className="font-medium text-amber-700">
                                      Check Official Calculator
                                    </span>
                                  )}
                                </div>
                                {card.scholarshipAdjustedCost != null && (
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-slate-600">
                                      Adjusted Max ({card.scholarshipOffer}):
                                    </span>
                                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                                      BDT {card.scholarshipAdjustedCost.toLocaleString('en-US')}
                                    </span>
                                  </div>
                                )}
                                {card.monthlyAverageBdt != null && (
                                  <div className="flex items-baseline justify-between gap-2 text-[11px] text-slate-600">
                                    <span>
                                      Est. Monthly Avg ({card.estimatedDurationMonths} mo):
                                    </span>
                                    <span className="font-mono tabular-nums text-slate-800">
                                      BDT {card.monthlyAverageBdt.toLocaleString('en-US')}/mo
                                      {card.monthlyAverageAfterScholarshipBdt != null
                                        ? ` (BDT ${card.monthlyAverageAfterScholarshipBdt.toLocaleString('en-US')}/mo after offer)`
                                        : ''}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-1 flex flex-wrap items-center gap-3">
                                <a
                                  href={card.calculatorUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-700 hover:underline font-medium"
                                >
                                  <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Official Fee Calculator</span>
                                </a>
                                <a
                                  href={card.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                  <span>Tuition Policy</span>
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Leadership Directory Cards inside assistant response */}
                      {!isUser && msg.leadershipCards && msg.leadershipCards.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                          {msg.leadershipCards.map((entry) => (
                            <ChatLeadershipCard key={entry.id} entry={entry} />
                          ))}
                        </div>
                      )}

                      {/* Verification Notice */}
                      {!isUser && msg.verificationNote && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[11px] text-amber-800">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                          <span>{msg.verificationNote}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata, Sources & Copy Action */}
                    <div
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 px-1 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span className="font-mono tabular-nums">{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 rounded"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-700" aria-hidden="true" />
                              <span className="text-emerald-700 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                      {!isUser &&
                        msg.sources &&
                        msg.sources.slice(0, 2).map((src) => (
                          <a
                            key={src.url}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>Official Source</span>
                          </a>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Animated Typing Indicator */}
            {isLoading && (
              <div className="flex items-end gap-2.5 justify-start" aria-live="polite">
                <div className="h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-blue-50 shrink-0">
                  {!avatarError ? (
                    <img
                      src={ASSETS.assistantAvatar}
                      alt=""
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-blue-700 text-white text-xs font-semibold">
                      UU
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-white border border-slate-200 shadow-xs flex items-center gap-1.5">
                  <span className="text-xs text-slate-500 mr-1">Checking official records</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" />
                </div>
              </div>
            )}

            {/* Suggested Follow-Up Questions */}
            {!isLoading &&
              lastAssistantMsg?.followUpSuggestions &&
              lastAssistantMsg.followUpSuggestions.length > 0 && (
                <div className="pt-1 pl-10 flex flex-wrap gap-2">
                  {lastAssistantMsg.followUpSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => onSendMessage(suggestion)}
                      className="px-3 py-1.5 min-h-[36px] rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-medium text-blue-800 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Composer */}
          <form
            onSubmit={handleSubmit}
            className="p-3 sm:p-4 border-t border-slate-200 bg-white shrink-0 space-y-2"
          >
            <div className="flex items-end gap-2.5">
              <label htmlFor="chat-input" className="sr-only">
                Ask a question in Bangla or English
              </label>
              <textarea
                id="chat-input"
                ref={textareaRef}
                rows={1}
                maxLength={1500}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="বাংলা বা ইংরেজিতে প্রশ্ন লিখুন (e.g., CSE admission GPA, BBA tuition fee, scholarship)..."
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 min-h-[44px] max-h-[132px]"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                aria-label="Send message"
                className="h-[44px] px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium text-sm inline-flex items-center justify-center gap-2 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 px-1">
              <span>
                AI virtual assistant — please do not submit NID scans, certificates, or passwords here.
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="text-blue-700 hover:underline font-medium"
                >
                  Admission Helpline: 09640 888272
                </button>
                <span className="font-mono tabular-nums">{input.length}/1500</span>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};
