import type { EventRepository } from '@/domain/events/repositories/event.repository';
import { makeListEvents, type ListEvents } from './use-cases/list-events.usecase';
import { makeGetEvent, type GetEvent } from './use-cases/get-event.usecase';

export interface EventsUseCases {
  listEvents: ListEvents;
  getEvent: GetEvent;
}

export function createEventsUseCases(repo: EventRepository): EventsUseCases {
  return {
    listEvents: makeListEvents(repo),
    getEvent: makeGetEvent(repo),
  };
}

// Re-export types
export type { ListEventsInput, ListEventsOutput } from './use-cases/list-events.usecase';
export type { GetEventInput, GetEventOutput } from './use-cases/get-event.usecase';
export { makeListEvents, makeGetEvent };