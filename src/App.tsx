import { useEffect, useState } from 'react';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ContactModal } from './components/ContactModal';
import { DepartmentComparator } from './components/DepartmentComparator';
import { EligibilityChecker } from './components/EligibilityChecker';
import { LeadershipDirectory } from './components/LeadershipDirectory';
import { ScholarshipEstimator } from './components/ScholarshipEstimator';
import { TopBar } from './components/TopBar';
import {
  WELCOME_MESSAGE,
  type ChatMessage,
  type KnowledgeBundle,
  type VerificationSummary,
  type WorkspaceTab,
} from './types';

function formatTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function createInitialMessages(): ChatMessage[] {
  return [
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: WELCOME_MESSAGE,
      timestamp: formatTime(),
      sources: [
        {
          title: 'Uttara University Official Website',
          url: 'https://uttarauniversity.edu.bd/',
          status: 'verified',
          lastVerified: '2026-11-21',
        },
      ],
      followUpSuggestions: [
        'CSE ভর্তির যোগ্যতা ও ফি কত?',
        'Tell me about BBA admission & fees',
        'Fall 2026 scholarship policy',
      ],
    },
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>(createInitialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeBundle | null>(null);
  const [summary, setSummary] = useState<VerificationSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/knowledge')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.bundle) {
          setKnowledge(data.bundle);
          setSummary(data.summary);
        }
      })
      .catch(() => {
        // Non-fatal; interactive tabs fall back gracefully
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: formatTime(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setActiveTab('chat');
    setIsLoading(true);

    const historyPayload = nextMessages
      .filter((m) => m.id !== 'welcome-msg' && !m.isError)
      .slice(-10, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorText =
          typeof data?.error === 'string'
            ? data.error
            : 'Unable to reach the admission assistant service right now.';
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: `${errorText}\n\nFor immediate assistance, please contact the Uttara University Admission Office at 09640 888272 or info@uttarauniversity.edu.bd.`,
            timestamp: formatTime(),
            isError: true,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: formatTime(),
          sources: data.sources,
          feeCards: data.feeCards,
          leadershipCards: data.leadershipCards,
          followUpSuggestions: data.followUpSuggestions,
          verificationNote: data.verificationNote,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            'Network error while connecting to the admission assistant. Please check your connection and try again, or contact the Admission Office at 09640 888272.',
          timestamp: formatTime(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages(createInitialMessages());
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenContact={() => setIsContactOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'chat' && (
          <ChatWorkspace
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onResetChat={handleResetChat}
            onOpenContact={() => setIsContactOpen(true)}
          />
        )}

        {activeTab === 'eligibility' && (
          <EligibilityChecker
            requirements={knowledge?.admissionRequirements || []}
            spring2027Programs={knowledge?.spring2027Dataset?.programs || []}
            onAskInChat={handleSendMessage}
          />
        )}

        {activeTab === 'scholarship' && (
          <ScholarshipEstimator
            spring2027Programs={knowledge?.spring2027Dataset?.programs || []}
            onAskInChat={handleSendMessage}
          />
        )}

        {activeTab === 'compare' && (
          <DepartmentComparator
            departments={knowledge?.departments || []}
            spring2027Programs={knowledge?.spring2027Dataset?.programs || []}
            onAskInChat={handleSendMessage}
          />
        )}

        {activeTab === 'leadership' && (
          <LeadershipDirectory
            entries={knowledge?.leadershipDirectory || []}
            onAskInChat={handleSendMessage}
          />
        )}
      </main>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        summary={summary}
      />
    </div>
  );
}
