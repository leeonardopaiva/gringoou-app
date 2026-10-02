'use client';

import React from 'react';

/**
 * Active region shared by the authenticated shell. The Layout owns the value
 * and updates it immediately when the user switches region, so every listing
 * can react to the change without waiting for a session round-trip.
 */
const ActiveRegionContext = React.createContext<string | null>(null);

export const ActiveRegionProvider = ActiveRegionContext.Provider;

export const useActiveRegion = () => React.useContext(ActiveRegionContext);
