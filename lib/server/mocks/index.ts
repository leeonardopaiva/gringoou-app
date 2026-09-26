import 'server-only';

/**
 * Central barrel for local mock mode. Route handlers and lib/server
 * services import only from here (`@/lib/server/mocks`) — never reach into
 * an individual `*.mock.ts` file directly. Each domain's fixtures/logic
 * stay in their own module; this file just re-exports the public surface
 * and the shared `USE_MOCKS` config flag.
 */
export { USE_MOCKS } from './config';
export type { MockViewer } from './shared';
export { getMockCommunityPostsPage, toggleMockPostReaction, addMockPostComment, setMockPostPreference } from './community.mock';
export { getMockGroupsPage, getMockGroupDetail, joinMockGroup, leaveMockGroup } from './groups.mock';
export { getMockBusinessesPage, getMockBusinessDetail, setMockBusinessFavorite, addMockBusinessRating } from './businesses.mock';
export { getMockEventsPage, getMockEventDetail, setMockEventFavorite, addMockEventRating } from './events.mock';
export { getMockJobsResponse, getMockJobDetail, getMockJobComments, addMockJobComment } from './jobs.mock';
export { getMockHousingResponse, getMockHousingDetail, getMockHousingComments, addMockHousingComment } from './housing.mock';
export { getMockPublicProfile, sendMockFriendRequest, decideMockFriendRequest } from './profiles.mock';
