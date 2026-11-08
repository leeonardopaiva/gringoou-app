'use client';

import React from 'react';
import { cn } from '@/lib/cn';

type DateTimeFieldProps = {
  label: string;
  /** Valor no formato local `YYYY-MM-DDTHH:mm` (ou vazio). */
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  invalid?: boolean;
  /** Menor data aceita (`YYYY-MM-DD`). */
  min?: string;
};

const inputClass =
  'theme-outline-ring block h-12 w-full min-w-0 appearance-none rounded-2xl border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 outline-none';

const split = (value: string): [string, string] => {
  const [date = '', time = ''] = value.split('T');
  return [date, time.slice(0, 5)];
};

/**
 * Data e hora em dois campos lado a lado (um sobre o outro em telas muito estreitas).
 * `appearance-none` + largura mínima zero evitam o estouro dos campos nativos no iOS/Android.
 */
export const DateTimeField: React.FC<DateTimeFieldProps> = ({ label, value, onChange, required, invalid, min }) => {
  const [date, time] = split(value);
  const update = (nextDate: string, nextTime: string) => onChange(nextDate ? `${nextDate}T${nextTime || '00:00'}` : '');

  return (
    <div className="min-w-0">
      <p className="mb-1.5 px-1 text-xs font-bold text-slate-500">{label}</p>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <input
          type="date"
          required={required}
          min={min}
          value={date}
          onChange={(event) => update(event.target.value, time)}
          aria-label={`${label}: data`}
          aria-invalid={invalid || undefined}
          className={cn(inputClass, invalid && 'border-red-300')}
        />
        <input
          type="time"
          required={required}
          value={time}
          onChange={(event) => update(date, event.target.value)}
          aria-label={`${label}: hora`}
          aria-invalid={invalid || undefined}
          className={cn(inputClass, invalid && 'border-red-300')}
        />
      </div>
    </div>
  );
};

export default DateTimeField;
