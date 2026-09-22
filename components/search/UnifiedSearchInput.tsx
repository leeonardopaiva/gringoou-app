'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, Search, Sparkles } from 'lucide-react';

type SpeechRecognitionResultEvent = Event & {
  results: ArrayLike<{ 0: { transcript: string } }>;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

type UnifiedSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  onFilterClick?: () => void;
  filterLoading?: boolean;
  animatedTerms?: string[];
  animatedIndex?: number;
  staticPlaceholder?: string;
  className?: string;
};

const UnifiedSearchInput: React.FC<UnifiedSearchInputProps> = ({
  value,
  onChange,
  onSubmit,
  onFilterClick,
  filterLoading = false,
  animatedTerms,
  animatedIndex = 0,
  staticPlaceholder,
  className = '',
}) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    const voiceWindow = window as VoiceWindow;
    setVoiceSupported(Boolean(voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition));

    return () => recognitionRef.current?.stop();
  }, []);

  const handleVoiceSearch = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const voiceWindow = window as VoiceWindow;
    const Recognition = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      onChange(transcript);
      window.setTimeout(() => onFilterClick?.(), 0);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      className={`relative flex items-center rounded-full border border-slate-200 bg-white shadow-sm transition-all theme-outline-ring ${className}`}
    >
      {!value && animatedTerms && animatedTerms.length > 0 ? (
        <div className={`pointer-events-none absolute inset-y-0 left-12 flex items-center text-sm text-slate-400 ${onFilterClick ? (voiceSupported ? 'right-24' : 'right-14') : 'right-4'}`}>
          <span>Busque por&nbsp;</span>
          <span key={animatedTerms[animatedIndex]} className="theme-text animate-in font-bold fade-in duration-300">
            {animatedTerms[animatedIndex]}
          </span>
        </div>
      ) : null}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={!animatedTerms ? staticPlaceholder : ''}
        className={`w-full bg-transparent py-4 pl-12 text-sm text-slate-700 outline-none ${onFilterClick ? (voiceSupported ? 'pr-24' : 'pr-14') : 'pr-4'}`}
      />
      <button
        type="submit"
        aria-label="Executar busca"
        className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
      >
        <Search size={20} aria-hidden="true" />
      </button>
      {onFilterClick ? (
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {voiceSupported ? (
            <button
              type="button"
              onClick={handleVoiceSearch}
              aria-label={listening ? 'Parar pesquisa por voz' : 'Pesquisar por voz com inteligência artificial'}
              title={listening ? 'Ouvindo...' : 'Pesquisa por voz'}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${listening ? 'animate-pulse bg-red-50 text-red-500' : 'text-slate-400 hover:bg-slate-100 hover:text-brand-500'}`}
            >
              <Mic size={16} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onFilterClick}
            disabled={filterLoading}
            aria-label="Abrir busca inteligente"
            title="Busca com inteligência artificial"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-white transition hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
          >
            <Sparkles size={16} aria-hidden="true" className={filterLoading ? 'animate-pulse' : ''} />
          </button>
        </div>
      ) : null}
    </form>
  );
};

export default UnifiedSearchInput;
