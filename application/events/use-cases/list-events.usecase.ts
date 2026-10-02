import type { EventRepository } from '@/domain/events/repositories/event.repository';
import type { EventsPage } from '@/domain/events/entities/event.entity';

export interface ListEventsInput {
  viewerId: string;
  isAdmin: boolean;
  regionKey?: string | null;
  category?: string | null;
}

export type ListEventsOutput = EventsPage;

export function makeListEvents(repo: EventRepository) {
  return async (input: ListEventsInput): Promise<ListEventsOutput> => {
    const { viewerId, isAdmin, regionKey, category } = input;

    return repo.list({
      viewerId,
      isAdmin,
      regionKey,
      category,
    });
  };
}

export type ListEvents = ReturnType<typeof makeListEvents>;