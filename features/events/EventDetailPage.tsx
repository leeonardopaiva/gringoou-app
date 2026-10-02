'use client';

import React, { useEffect, useState } from 'react';
import EventDetail from '@/views/EventDetail';
import type { User } from '@/types';
import type { EventDetailItem } from '@/domain/events/entities/event.entity';

type EventDetailPageProps = {
  eventId: string;
  user: User;
  initialEvent?: EventDetailItem | null;
};

/**
 * Container da página de detalhe de evento.
 * Se `initialEvent` for fornecido, o EventDetail já terá os dados básicos
 * sem precisar da chamada de API inicial.
 * Rota: /eventos/[id]
 */
const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  user,
  initialEvent,
}) => {
  return <EventDetail eventId={eventId} user={user} initialEvent={initialEvent} />;
};

export default EventDetailPage;