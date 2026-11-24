import React from 'react';
import type { PersonaMode } from '../../types';

type PersonaModeSwitchProps = {
  value: PersonaMode;
  onChange: (mode: PersonaMode) => void;
  className?: string;
};

const PersonaModeSwitch: React.FC<PersonaModeSwitchProps> = ({ value, onChange, className = '' }) => (
  <div className={`inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 ${className}`.trim()}>
    <button
      type="button"
      onClick={() => onChange('personal')}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
        value === 'personal' ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-500'
      }`}
    >
      Pessoal
    </button>
    <button
      type="button"
      onClick={() => onChange('professional')}
      className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
        value === 'professional' ? 'theme-bg text-white shadow-sm' : 'text-slate-500'
      }`}
    >
      Profissional
    </button>
  </div>
);

export default PersonaModeSwitch;
