'use client';

import React from 'react';
import Marketplace from '@/views/Marketplace';
import type { EventsInitialData } from '@/lib/content-contracts';

type EventsPageProps = {
  initialData?: EventsInitialData;
};

/**
 * Container da página de listagem de eventos.
 * Delega a renderização para o Marketplace (única view de listagem de eventos).
 * Rota: /eventos
 */
const EventsPage: React.FC<EventsPageProps> = ({ initialData }) => {
  return <Marketplace initialData={initialData} />;
};

export default EventsPage;