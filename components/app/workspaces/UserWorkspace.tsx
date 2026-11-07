'use client';

import React from 'react';
import Community from '@/views/Community';
import GroupsDirectory from '@/views/GroupsDirectory';
import Home from '@/views/Home';
import HousingList from '@/views/HousingList';
import JobList from '@/views/JobList';
import JobDetail from '@/views/JobDetail';
import HousingDetail from '@/views/HousingDetail';
import NewsList from '@/views/NewsList';
import Profile from '@/views/Profile';
import SearchResults from '@/views/SearchResults';
import type { PersonaMode, ProfessionalProfileIdentity, User } from '@/types';
import { parseAppRoute } from '@/lib/app-route';
import { Compass } from 'lucide-react';
import { StatusPage } from '@/components/ui/StatusPage';
import type { CommunityInitialData, HomeInitialData, JobsInitialData, NewsInitialData, ProfileInitialData } from '@/lib/content-contracts';

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
  initialNewsData?: NewsInitialData;
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
  initialNewsData,
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
    case 'search':
      return <SearchResults />;
    case 'news':
      return <NewsList initialData={initialNewsData} />;
    case 'jobs':
      return segments[1] ? <JobDetail jobId={decodeURIComponent(segments[1])} /> : <JobList user={currentUser} initialData={initialJobsData} />;
    case 'housing':
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
    case 'groups':
      return <GroupsDirectory user={currentUser} />;
    case 'home':
    case 'invites':
      return <Home user={currentUser} initialData={initialHomeData} />;
    default:
      return (
        <StatusPage
          icon={<Compass size={30} />}
          code="404"
          title="Página não encontrada"
          description="O endereço que você tentou acessar não existe ou foi movido."
          actions={[
            { label: 'Ir para o início', href: '/home' },
            { label: 'Ver a comunidade', href: '/community', variant: 'secondary' },
          ]}
        />
      );
  }
};

export default UserWorkspace;
