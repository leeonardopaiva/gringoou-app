'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Briefcase, ShoppingBag, UserRound } from 'lucide-react';
import { knownMentionsFrom, toDisplayText, toStoredText, type KnownMention, type MentionKind } from '@/lib/mentions';

type Suggestion = { kind: MentionKind; ref: string; label: string; subtitle: string; image: string | null };

type MentionInputProps = {
  /** Texto no formato guardado (com `@[Nome](tipo:ref)`). */
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  ariaLabel?: string;
};

const ICONS = { user: UserRound, business: Briefcase, item: ShoppingBag } as const;

/** Campo de comentário que sugere pessoas, negócios e anúncios ao digitar "@". */
export const MentionInput: React.FC<MentionInputProps> = ({ value, onChange, onKeyDown, placeholder, className, maxLength, ariaLabel }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const picked = useRef<KnownMention[]>([]);
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const display = toDisplayText(value);

  useEffect(() => {
    if (!trigger) {
      setSuggestions([]);
      return;
    }
    let ignore = false;
    const timer = window.setTimeout(() => {
      void fetch(`/api/mentions?q=${encodeURIComponent(trigger.query)}`, { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : { results: [] }))
        .then((payload) => {
          if (ignore) return;
          setSuggestions(Array.isArray(payload.results) ? payload.results : []);
          setActive(0);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [trigger]);

  const detectTrigger = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const match = /(^|\s)@([^@\n]{0,30})$/.exec(before);
    setTrigger(match ? { start: caret - match[2].length - 1, query: match[2] } : null);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    const known = [...knownMentionsFrom(value), ...picked.current];
    onChange(toStoredText(text, known));
    detectTrigger(text, event.target.selectionStart ?? text.length);
  };

  const choose = (suggestion: Suggestion) => {
    if (!trigger) return;
    const caret = inputRef.current?.selectionStart ?? display.length;
    const next = `${display.slice(0, trigger.start)}@${suggestion.label} ${display.slice(caret)}`;
    picked.current = [...picked.current.filter((mention) => mention.label !== suggestion.label), { label: suggestion.label, kind: suggestion.kind, ref: suggestion.ref }];
    onChange(toStoredText(next, [...knownMentionsFrom(value), ...picked.current]));
    setTrigger(null);
    setSuggestions([]);
    requestAnimationFrame(() => {
      const position = trigger.start + suggestion.label.length + 2;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  const open = Boolean(trigger) && suggestions.length > 0;

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        type="text"
        value={display}
        onChange={handleChange}
        onKeyDown={(event) => {
          if (open) {
            if (event.key === 'ArrowDown') { event.preventDefault(); setActive((index) => (index + 1) % suggestions.length); return; }
            if (event.key === 'ArrowUp') { event.preventDefault(); setActive((index) => (index - 1 + suggestions.length) % suggestions.length); return; }
            if (event.key === 'Enter' || event.key === 'Tab') { event.preventDefault(); choose(suggestions[active]); return; }
            if (event.key === 'Escape') { event.preventDefault(); setTrigger(null); return; }
          }
          onKeyDown?.(event);
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        className={className ?? 'w-full rounded-full bg-bg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-200'}
      />
      {open ? (
        <ul role="listbox" className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-full min-w-[240px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-lg">
          {suggestions.map((suggestion, index) => {
            const Icon = ICONS[suggestion.kind];
            return (
              <li key={`${suggestion.kind}-${suggestion.ref}`} role="option" aria-selected={index === active}>
                <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => choose(suggestion)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${index === active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                  {suggestion.image ? <img src={suggestion.image} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Icon size={15} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{suggestion.label}</span>
                    <span className="block truncate text-[11px] text-slate-400">{suggestion.subtitle}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

export default MentionInput;
