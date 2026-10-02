import type { EventRepository } from '@/domain/events/repositories/event.repository';
import type { EventDetailItem } from '@/domain/events/entities/event.entity';

export interface GetEventInput {
  idOrSlug: string;
  viewerId: string | null;
  isAdmin: boolean;
}

export type GetEventOutput = EventDetailItem | null;

export function makeGetEvent(repo: EventRepository) {
  return async (input: GetEventInput): Promise<GetEventOutput> => {
    return repo.getByIdOrSlug(input.idOrSlug, input.viewerId, input.isAdmin);
  };
}

export type GetEvent = ReturnType<typeof makeGetEvent>;