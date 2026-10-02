import type {
  EventDetailItem,
  EventListItem,
  EventsPage,
} from '../entities/event.entity';

/** Filtros para listagem de eventos */
export interface EventListFilters {
  regionKey?: string | null;
  category?: string | null;
  viewerId: string;
  isAdmin: boolean;
}

/** Contrato do repositório de Eventos — a camada de domínio depende apenas desta interface. */
export interface EventRepository {
  /** Lista eventos visíveis para o usuário */
  list(filters: EventListFilters): Promise<EventsPage>;

  /** Obtém detalhe de um evento pelo slug ou ID */
  getByIdOrSlug(
    idOrSlug: string,
    viewerId: string | null,
    isAdmin: boolean,
  ): Promise<EventDetailItem | null>;
}