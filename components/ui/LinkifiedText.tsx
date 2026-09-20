import React from 'react';

const externalUrlPattern = /(https?:\/\/[^\s]+)/g;

export function LinkifiedText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap ${className}`.trim()}>
      {text.split(externalUrlPattern).map((part, index) =>
        /^https?:\/\//i.test(part) ? (
          <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer" className="font-semibold text-brand-600 underline underline-offset-2 hover:text-brand-700">
            {part}
          </a>
        ) : part,
      )}
    </p>
  );
}
