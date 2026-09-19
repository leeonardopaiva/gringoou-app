import React, { useEffect, useRef, useState } from 'react';
import { BriefcaseBusiness, ChevronDown, UserRound } from 'lucide-react';
import type { PersonaMode } from '../../types';

type PersonaModeDropdownProps = {
  value: PersonaMode;
  onChange: (mode: PersonaMode) => void;
  personalSubtitle: string;
  professionalSubtitle: string;
  professionalDisabled?: boolean;
  align?: 'center' | 'left' | 'right';
  trigger?: 'label' | 'chevron';
  buttonClassName?: string;
  menuClassName?: string;
  businesses?: Array<{ id: string; name: string; imageUrl?: string | null; status?: string }>;
  selectedBusinessId?: string | null;
  onBusinessChange?: (businessId: string) => void;
};

const PersonaModeDropdown: React.FC<PersonaModeDropdownProps> = ({
  value,
  onChange,
  personalSubtitle,
  professionalSubtitle,
  professionalDisabled = false,
  align = 'center',
  trigger = 'label',
  buttonClassName = '',
  menuClassName = '',
  businesses = [],
  selectedBusinessId,
  onBusinessChange,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isProfessional = value === 'professional';

  useEffect(() => {
    setOpen(false);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const menuPositionClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  const handleChange = (mode: PersonaMode) => {
    onChange(mode);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {trigger === 'chevron' ? (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-brand-100 hover:text-brand-500 ${buttonClassName}`.trim()}
          aria-label="Trocar perfil"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <ChevronDown size={17} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
            isProfessional
              ? 'bg-brand-100 text-brand-600'
              : 'bg-bg text-muted-foreground'
          } ${buttonClassName}`.trim()}
        >
          {isProfessional ? <BriefcaseBusiness size={14} /> : <UserRound size={14} />}
          {isProfessional ? 'Profissional' : 'Pessoal'}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {open ? (
        <div
          role="menu"
          className={`absolute top-[calc(100%+0.35rem)] z-20 w-[220px] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-left shadow-lg ${menuPositionClass} ${menuClassName}`.trim()}
        >
          <PersonaMenuOption
            title="Pessoal"
            subtitle={personalSubtitle}
            active={!isProfessional}
            icon={<UserRound size={16} />}
            onClick={() => handleChange('personal')}
          />
          {businesses.length ? (
            <>
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Negócios</p>
              {businesses.map((business) => (
                <PersonaMenuOption
                  key={business.id}
                  title={business.name}
                  subtitle={business.status === 'PUBLISHED' ? 'Página publicada' : business.status === 'PENDING_REVIEW' ? 'Em análise' : professionalSubtitle}
                  active={isProfessional && selectedBusinessId === business.id}
                  icon={business.imageUrl ? <img src={business.imageUrl} alt="" className="h-5 w-5 rounded-md object-cover" /> : <BriefcaseBusiness size={16} />}
                  onClick={() => {
                    onBusinessChange?.(business.id);
                    handleChange('professional');
                  }}
                />
              ))}
            </>
          ) : (
            <PersonaMenuOption
              title="Profissional"
              subtitle={professionalSubtitle}
              active={isProfessional}
              disabled={professionalDisabled}
              icon={<BriefcaseBusiness size={16} />}
              onClick={() => {
                if (!professionalDisabled) handleChange('professional');
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
};

const PersonaMenuOption: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}> = ({ title, subtitle, icon, active = false, disabled = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
      active
        ? 'bg-brand-100 text-brand-600'
        : disabled
          ? 'cursor-not-allowed text-slate-300'
          : 'text-foreground hover:bg-brand-100'
    }`}
  >
    <span className={active ? 'text-brand-500' : disabled ? 'text-slate-300' : 'text-muted-foreground'}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-semibold leading-tight">{title}</span>
      <span className="mt-0.5 block truncate text-[11px] font-medium text-slate-400">
        {subtitle}
      </span>
    </span>
    {active ? <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> : null}
  </button>
);

export default PersonaModeDropdown;
