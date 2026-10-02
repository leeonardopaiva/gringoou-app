import 'server-only';

import { prisma } from '@/lib/prisma';
import { makePrismaEventRepository } from '@/infrastructure/repositories/prisma-event.repository';
import { createEventsUseCases } from '@/application/events';

const repo = makePrismaEventRepository(prisma);
const useCases = createEventsUseCases(repo);

/** Instância compartilhada dos casos de uso de Eventos (server-side). */
export const eventsUseCases = useCases;