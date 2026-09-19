'use client';

import React from 'react';
import BusinessDetail from '@/views/BusinessDetail';
import BusinessList from '@/views/BusinessList';
import EventDetail from '@/views/EventDetail';
import Marketplace from '@/views/Marketplace';
import type { PersonaMode, ProfessionalProfileIdentity, User } from '@/types';
import { parseAppRoute } from '@/lib/app-route';
import type { BusinessesInitialData, EventsInitialData } from '@/lib/content-contracts';

type BusinessWorkspaceProps = {
  currentUser: User;
  pathname: string;
  effectivePersonaMode: PersonaMode;
  professionalIdentity: ProfessionalProfileIdentity | null;
  initialBusinessesData?: BusinessesInitialData;
  initialEventsData?: EventsInitialData;
};

const BusinessWorkspace: React.FC<BusinessWorkspaceProps> = ({
  currentUser,
  pathname,
  effectivePersonaMode,
  professionalIdentity,
  initialBusinessesData,
  initialEventsData,
}) => {
  const { segments, rootSegment } = parseAppRoute(pathname);

  if (rootSegment === 'negocios' && segments.length === 1) {
    return <BusinessList personaMode={effectivePersonaMode} professionalIdentity={professionalIdentity} initialData={initialBusinessesData} />;
  }

  if (rootSegment === 'negocios' && segments.length === 2) {
    return <BusinessDetail businessId={decodeURIComponent(segments[1])} user={currentUser} />;
  }

  if (rootSegment === 'negocios' && segments.length === 3 && segments[2] === 'gerenciar') {
    return <BusinessDetail businessId={decodeURIComponent(segments[1])} user={currentUser} managementMode />;
  }

  if ((rootSegment === 'eventos' || rootSegment === 'marketplace') && segments.length === 2) {
    return <EventDetail eventId={decodeURIComponent(segments[1])} user={currentUser} />;
  }

  return <Marketplace personaMode={effectivePersonaMode} professionalIdentity={professionalIdentity} initialData={initialEventsData} />;
};

export default BusinessWorkspace;
