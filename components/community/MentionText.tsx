import React from 'react';
import Link from 'next/link';
import { parseMentions } from '@/lib/mentions';

/** Mostra o texto de um comentário com as menções (@) como links. */
export const MentionText: React.FC<{ text: string }> = ({ text }) => (
  <>
    {parseMentions(text).map((part, index) =>
      part.type === 'text' ? (
        <React.Fragment key={index}>{part.text}</React.Fragment>
      ) : (
        <Link key={index} href={part.href} className="font-semibold text-brand-600 hover:underline">
          @{part.label}
        </Link>
      ),
    )}
  </>
);

export default MentionText;
