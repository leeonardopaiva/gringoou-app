import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Avatar } from '@/components/ui/Avatar';
import type { Publisher } from '@/lib/publisher';

type PublisherSignatureProps = {
  publisher: Publisher | null | undefined;
  /** Texto antes do nome. Use "" para mostrar só o nome. */
  prefix?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
};

/**
 * Assinatura de quem publicou (avatar + nome). Avatar e nome levam à página pública
 * de quem publicou: perfil da pessoa ou página do negócio.
 */
export const PublisherSignature: React.FC<PublisherSignatureProps> = ({
  publisher,
  prefix = 'Publicado por',
  size = 'sm',
  className,
}) => {
  if (!publisher) return null;

  const content = (
    <>
      <Avatar src={publisher.image} name={publisher.name} size={size} />
      <span className="min-w-0 truncate text-xs text-slate-500">
        {prefix ? `${prefix} ` : ''}
        <span className="font-semibold text-slate-700">{publisher.name}</span>
      </span>
    </>
  );

  if (!publisher.href) {
    return <div className={cn('inline-flex max-w-full items-center gap-2', className)}>{content}</div>;
  }

  return (
    <Link
      href={publisher.href}
      aria-label={`Ver página de ${publisher.name}`}
      className={cn('inline-flex max-w-full items-center gap-2 rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200', className)}
    >
      {content}
    </Link>
  );
};

export default PublisherSignature;
