import 'server-only';

import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { getMockJobsResponse, USE_MOCKS } from '@/lib/server/mocks';
import type { JobsInitialData } from '@/lib/content-contracts';

export async function getJobsPage(): Promise<JobsInitialData> {
  if (USE_MOCKS) {
    return getMockJobsResponse(1, 8);
  }

  const pageSize = 8;
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where: { isActive: true },
      skip: 0,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true, username: true } } },
    }),
    prisma.job.count({ where: { isActive: true } }),
  ]);

  return {
    jobs,
    pagination: { page: 1, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
