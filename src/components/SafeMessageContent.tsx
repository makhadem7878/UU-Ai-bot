import React from 'react';

interface SafeMessageContentProps {
  text: string;
  isUser?: boolean;
}

const URL_OR_BOLD_REGEX = /(https?:\/\/[^\s)]+|\*\*[^*]+\*\*)/g;

function renderInlineSegments(line: string, isUser: boolean): React.ReactNode[] {
  const parts = line.split(URL_OR_BOLD_REGEX);
  return parts.map((part, idx) => {
    if (!part) return null;
    if (part.startsWith('http://') || part.startsWith('https://')) {
      const cleanUrl = part.replace(/[.,;!?]+$/, '');
      const trailing = part.slice(cleanUrl.length);
      return (
        <React.Fragment key={idx}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`underline underline-offset-2 break-all transition-colors ${
              isUser
                ? 'text-blue-100 hover:text-white'
                : 'text-blue-700 hover:text-blue-900'
            }`}
          >
            {cleanUrl}
          </a>
          {trailing}
        </React.Fragment>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const SafeMessageContent: React.FC<SafeMessageContentProps> = ({ text, isUser = false }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-[15px] leading-relaxed break-words">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1.5" aria-hidden="true" />;
        }

        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span
                className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                  isUser ? 'bg-blue-200' : 'bg-blue-600'
                }`}
                aria-hidden="true"
              />
              <span className="flex-1">{renderInlineSegments(bulletMatch[1], isUser)}</span>
            </div>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pl-0.5">
              <span className="font-mono text-xs font-semibold mt-1 shrink-0 tabular-nums opacity-80">
                {numberedMatch[1]}
              </span>
              <span className="flex-1">{renderInlineSegments(numberedMatch[2], isUser)}</span>
            </div>
          );
        }

        return <p key={index}>{renderInlineSegments(line, isUser)}</p>;
      })}
    </div>
  );
};
