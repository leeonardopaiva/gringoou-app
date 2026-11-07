import React from 'react';
import { Star } from 'lucide-react';

type StarRatingProps = {
  average: number;
  count: number;
  viewerRating?: number | null;
  interactive?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onRate?: (stars: number) => void;
  /** Quando as estrelas nao sao clicaveis, clicar nelas chama isto (ex.: mostrar aviso). */
  onBlockedClick?: () => void;
};

const StarRating: React.FC<StarRatingProps> = ({
  average,
  count,
  viewerRating = null,
  interactive = false,
  disabled = false,
  compact = false,
  onRate,
  onBlockedClick,
}) => {
  const displayValue = viewerRating ?? average;
  const filledStars = Math.round(displayValue);

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div
        className={`flex items-center gap-1 ${!interactive && onBlockedClick ? 'cursor-pointer' : ''}`}
        {...(!interactive && onBlockedClick
          ? {
              onClick: onBlockedClick,
              role: 'button',
              tabIndex: 0,
              'aria-label': 'Avaliar',
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onBlockedClick();
                }
              },
            }
          : {})}
      >
        {Array.from({ length: 5 }).map((_, index) => {
          const starValue = index + 1;
          const filled = starValue <= filledStars;

          if (interactive) {
            return (
              <button
                key={starValue}
                type="button"
                disabled={disabled}
                onClick={() => onRate?.(starValue)}
                className="rounded-full p-1 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Avaliar com ${starValue} estrela${starValue > 1 ? 's' : ''}`}
              >
                <Star size={compact ? 14 : 18} className="text-amber-400" fill={filled ? 'currentColor' : 'none'} />
              </button>
            );
          }

          return (
            <Star
              key={starValue}
              size={compact ? 14 : 18}
              className="text-amber-400"
              fill={filled ? 'currentColor' : 'none'}
            />
          );
        })}
      </div>
      <p className={`${compact ? 'text-[11px]' : 'text-sm'} font-medium text-slate-500`}>
        {count > 0 ? `${average.toFixed(1)} (${count} ${count === 1 ? 'avaliacao' : 'avaliacoes'})` : 'Sem avaliacoes ainda'}
      </p>
    </div>
  );
};

export default StarRating;
