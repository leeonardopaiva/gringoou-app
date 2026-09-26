'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type VoiceWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type UseVoiceRecognitionOptions = {
  onResult: (transcript: string) => void;
  onError?: (message: string) => void;
  lang?: string;
};

/**
 * Single shared speech-recognition implementation used by both the
 * conventional search input and the Gringoo AI assistant input, so voice
 * capture logic never forks into two independent mechanisms.
 */
export function useVoiceRecognition({ onResult, onError, lang = 'pt-BR' }: UseVoiceRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const voiceWindow = window as VoiceWindow;
    setSupported(Boolean(voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition));
    return () => recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const voiceWindow = window as VoiceWindow;
    const Recognition = voiceWindow.SpeechRecognition || voiceWindow.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (event) => {
      setListening(false);
      const message = event.error === 'not-allowed' || event.error === 'service-not-allowed'
        ? 'Permita o acesso ao microfone para usar a pesquisa por voz.'
        : event.error === 'no-speech'
          ? 'Não conseguimos ouvir sua pergunta. Tente novamente.'
          : 'A pesquisa por voz não está disponível agora.';
      onErrorRef.current?.(message);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;
      onResultRef.current(transcript);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      onErrorRef.current?.('Não foi possível iniciar o microfone. Tente novamente.');
    }
  }, [lang, listening]);

  return { supported, listening, toggle };
}
