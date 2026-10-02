export class EventNotFoundError extends Error {
  constructor(eventId: string) {
    super(`Evento não encontrado: ${eventId}`);
    this.name = 'EventNotFoundError';
  }
}

export class EventNotVisibleError extends Error {
  constructor(eventId: string) {
    super(`Evento não visível: ${eventId}`);
    this.name = 'EventNotVisibleError';
  }
}