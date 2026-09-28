'use client';

import React from 'react';
import Community from '@/views/Community';
import GroupsDirectory from '@/views/GroupsDirectory';
import Home from '@/views/Home';
import HousingList from '@/views/HousingList';
import JobList from '@/views/JobList';
import JobDetail from '@/views/JobDetail';
import HousingDetail from '@/views/HousingDetail';
import Profile from '@/views/Profile';
import SearchResults from '@/views/SearchResults';
import type { PersonaMode, ProfessionalProfileIdentity, User } from '@/types';
import { parseAppRoute } from '@/lib/app-route';
import type { CommunityInitialData, HomeInitialData, JobsInitialData, ProfileInitialData } from '@/lib/content-contracts';

type UserWorkspaceProps = {
  currentUser: User;
  pathname: string;
  personaMode: PersonaMode;
  effectivePersonaMode: PersonaMode;
  professionalIdentity: ProfessionalProfileIdentity | null;
  canUseProfessionalMode: boolean;
  onPersonaModeChange: (mode: PersonaMode) => void;
  initialHomeData?: HomeInitialData;
  initialCommunityData?: CommunityInitialData;
  initialJobsData?: JobsInitialData;
  initialProfileData?: ProfileInitialData;
};

const UserWorkspace: React.FC<UserWorkspaceProps> = ({
  currentUser,
  pathname,
  personaMode,
  effectivePersonaMode,
  professionalIdentity,
  canUseProfessionalMode,
  onPersonaModeChange,
  initialHomeData,
  initialCommunityData,
  initialJobsData,
  initialProfileData,
}) => {
  const { segments, rootSegment } = parseAppRoute(pathname);

  if (segments.length === 0) {
    return <Home user={currentUser} initialData={initialHomeData} />;
  }

  switch (rootSegment) {
    case 'community':
      return (
        <Community
          user={currentUser}
          personaMode={effectivePersonaMode}
          professionalIdentity={professionalIdentity}
          initialData={initialCommunityData}
        />
      );
    case 'buscar':
      return <SearchResults />;
    case 'vagas':
      return segments[1] ? <JobDetail jobId={decodeURIComponent(segments[1])} /> : <JobList user={currentUser} initialData={initialJobsData} />;
    case 'moradia':
      return segments[1] ? <HousingDetail housingId={decodeURIComponent(segments[1])} /> : <HousingList user={currentUser} />;
    case 'profile':
      return (
        <Profile
          user={currentUser}
          personaMode={personaMode}
          canUseProfessionalMode={canUseProfessionalMode}
          onPersonaModeChange={onPersonaModeChange}
          initialData={initialProfileData}
        />
      );
    case 'grupos':
      return <GroupsDirectory user={currentUser} />;
    default:
      return <Home user={currentUser} initialData={initialHomeData} />;
  }
};

export default UserWorkspace;
