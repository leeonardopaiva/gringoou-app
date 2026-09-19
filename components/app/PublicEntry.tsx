'use client';

import React from 'react';
import Layout from '@/components/Layout';
import PublicProfile from '@/views/PublicProfile';
import PublicProfessionalProfile from '@/views/PublicProfessionalProfile';
import PublicGroup from '@/views/PublicGroup';
import type { PersonaMode, ProfessionalProfileBusiness, ProfessionalProfileIdentity, User } from '@/types';
import { parseAppRoute } from '@/lib/app-route';

type PublicEntryProps = {
  pathname: string;
  currentUser?: User;
  personaMode?: PersonaMode;
  canUseProfessionalMode?: boolean;
  professionalIdentity?: ProfessionalProfileIdentity | null;
  professionalBusinesses?: ProfessionalProfileBusiness[];
  onProfessionalBusinessChange?: (businessId: string) => void;
  onPersonaModeChange?: (mode: PersonaMode) => void;
  onSignOut?: () => void;
};

const PublicEntry: React.FC<PublicEntryProps> = ({
  pathname,
  currentUser,
  personaMode = 'personal',
  canUseProfessionalMode = false,
  professionalIdentity,
  professionalBusinesses,
  onProfessionalBusinessChange,
  onPersonaModeChange,
  onSignOut,
}) => {
  const { publicProfileUsername, professionalProfileUsername, groupSlug } = parseAppRoute(pathname);

  if (groupSlug && !currentUser) {
    return <PublicGroup slug={groupSlug} />;
  }

  if (professionalProfileUsername && !currentUser) {
    return <PublicProfessionalProfile username={professionalProfileUsername} />;
  }

  if (publicProfileUsername && !currentUser) {
    return <PublicProfile username={publicProfileUsername} />;
  }

  if (!currentUser) {
    return null;
  }

  const isProfessionalTheme = canUseProfessionalMode && personaMode === 'professional';
  const effectivePersonaMode: PersonaMode = isProfessionalTheme ? 'professional' : 'personal';

  if (groupSlug) {
    return (
      <Layout
        user={currentUser}
        personaMode={effectivePersonaMode}
        canUseProfessionalMode={canUseProfessionalMode}
        professionalIdentity={professionalIdentity}
        professionalBusinesses={professionalBusinesses}
        onProfessionalBusinessChange={onProfessionalBusinessChange}
        onPersonaModeChange={onPersonaModeChange}
        onSignOut={onSignOut}
      >
        <PublicGroup slug={groupSlug} viewer={currentUser} embedded />
      </Layout>
    );
  }

  if (professionalProfileUsername) {
    return (
      <Layout
        user={currentUser}
        personaMode={effectivePersonaMode}
        canUseProfessionalMode={canUseProfessionalMode}
        professionalIdentity={professionalIdentity}
        professionalBusinesses={professionalBusinesses}
        onProfessionalBusinessChange={onProfessionalBusinessChange}
        onPersonaModeChange={onPersonaModeChange}
        onSignOut={onSignOut}
      >
        <PublicProfessionalProfile username={professionalProfileUsername} viewer={currentUser} embedded />
      </Layout>
    );
  }

  if (publicProfileUsername) {
    return (
      <Layout
        user={currentUser}
        personaMode={effectivePersonaMode}
        canUseProfessionalMode={canUseProfessionalMode}
        professionalIdentity={professionalIdentity}
        professionalBusinesses={professionalBusinesses}
        onProfessionalBusinessChange={onProfessionalBusinessChange}
        onPersonaModeChange={onPersonaModeChange}
        onSignOut={onSignOut}
      >
        <PublicProfile username={publicProfileUsername} viewer={currentUser} embedded />
      </Layout>
    );
  }

  return null;
};

export default PublicEntry;
