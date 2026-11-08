/**
 * Isolamento por região: quem está logado só enxerga conteúdo e pessoas da própria região.
 * O parâmetro `region` enviado pelo navegador só vale para administração/moderação e para visitantes sem conta.
 */
type SessionLike = { user?: { id?: string | null; role?: string | null; regionKey?: string | null } | null } | null | undefined;

export type RegionScope = {
  /** Região efetiva da consulta (pode ser nula). */
  regionKey: string | null;
  /** Verdadeiro quando a região vem da conta e não pode ser trocada pelo cliente. */
  enforced: boolean;
};

export function resolveRegionScope(session: SessionLike, requested?: string | null): RegionScope {
  const user = session?.user;
  const privileged = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  // Visitantes sem conta nunca escolhem região: não há ambiente aberto fora do login.
  if (!user?.id) return { regionKey: null, enforced: true };
  if (!privileged) return { regionKey: user.regionKey || null, enforced: true };
  return { regionKey: requested || user.regionKey || null, enforced: false };
}

/** Filtro Prisma de região: com escopo imposto, quem não tem região não vê nada de nenhuma região. */
export function regionWhereFor(scope: RegionScope, requested?: string | null): { regionKey?: string } {
  if (scope.enforced) return { regionKey: scope.regionKey ?? '__sem_regiao__' };
  return requested ? { regionKey: requested } : {};
}

/** Verdadeiro quando quem está logado tenta abrir algo de outra região (o próprio dono sempre pode). */
export function isOutsideViewerRegion(session: SessionLike, target: { regionKey?: string | null; ownerId?: string | null }): boolean {
  const scope = resolveRegionScope(session, null);
  if (!scope.enforced) return false;
  if (target.ownerId && target.ownerId === session?.user?.id) return false;
  return Boolean(target.regionKey) && target.regionKey !== scope.regionKey;
}
