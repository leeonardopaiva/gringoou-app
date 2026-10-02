import 'server-only';

import { createMockListingCommentStore, type MockViewer } from './shared';

const jobCommentStore = createMockListingCommentStore();

type MockJobRecord = {
  id: string;
  title: string;
  company: string;
  description: string;
  employmentType: string;
  locationLabel: string;
  countryCode: string;
  regionKey: string;
  salary: string | null;
  contactUrl: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  createdByName: string;
  createdByUsername: string;
};

export const MOCK_JOBS: MockJobRecord[] = [
  {
    id: 'mock-job-1',
    title: 'Auxiliar de cozinha',
    company: 'Minas Grill',
    description: 'Vaga para auxiliar de cozinha em restaurante brasileiro, experiência não obrigatória. Horário flexível e vale-transporte.',
    employmentType: 'Tempo integral',
    locationLabel: 'Boston, MA',
    countryCode: 'US',
    regionKey: 'boston-ma',
    salary: '$18/hora',
    contactUrl: 'https://wa.me/16175550102',
    imageUrl: 'https://picsum.photos/seed/mock-job-1/600/400',
    galleryUrls: [],
    createdByName: 'Minas Grill',
    createdByUsername: 'minas.grill',
  },
  {
    id: 'mock-job-2',
    title: 'Diarista',
    company: 'Limpeza Brasil Express',
    description: 'Diaristas para atendimento residencial na região de Cambridge e Somerville, contratação imediata.',
    employmentType: 'Freelancer',
    locationLabel: 'Cambridge, MA',
    countryCode: 'US',
    regionKey: 'boston-ma',
    salary: '$25/hora',
    contactUrl: 'https://wa.me/16175550103',
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Limpeza Brasil Express',
    createdByUsername: 'limpeza.brasil',
  },
  {
    id: 'mock-job-3',
    title: 'Motorista de entregas',
    company: 'Sabor Brasil Mercado',
    description: 'Entregas locais de segunda a sexta, veículo próprio necessário, ajuda de combustível inclusa.',
    employmentType: 'Meio periodo',
    locationLabel: 'Somerville, MA',
    countryCode: 'US',
    regionKey: 'boston-ma',
    salary: '$22/hora',
    contactUrl: null,
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Sabor Brasil Mercado',
    createdByUsername: 'sabor.brasil',
  },
  {
    id: 'mock-job-4',
    title: 'Atendente de loja',
    company: 'Padaria Danbury',
    description: 'Atendimento ao público em padaria brasileira, experiência desejável. Treinamento incluso.',
    employmentType: 'Tempo integral',
    locationLabel: 'Danbury, CT',
    countryCode: 'US',
    regionKey: 'danbury-ct',
    salary: '$17/hora',
    contactUrl: 'https://wa.me/12035550104',
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Padaria Danbury',
    createdByUsername: 'padaria.danbury',
  },
  {
    id: 'mock-job-5',
    title: 'Auxiliar de limpeza',
    company: 'Clean Danbury',
    description: 'Limpeza residencial e comercial na região de Danbury, horário flexível.',
    employmentType: 'Freelancer',
    locationLabel: 'Danbury, CT',
    countryCode: 'US',
    regionKey: 'danbury-ct',
    salary: '$20/hora',
    contactUrl: null,
    imageUrl: null,
    galleryUrls: [],
    createdByName: 'Clean Danbury',
    createdByUsername: 'clean.danbury',
  },
];

const findMockJob = (id: string) => MOCK_JOBS.find((job) => job.id === id) ?? MOCK_JOBS[0];

export function getMockJobsResponse(page: number, pageSize: number, regionKey?: string | null) {
  const scoped = regionKey ? MOCK_JOBS.filter((job) => job.regionKey === regionKey) : MOCK_JOBS;
  const jobs = scoped.map(({ createdByName: _createdByName, createdByUsername: _createdByUsername, countryCode: _countryCode, regionKey: _regionKey, contactUrl: _contactUrl, ...job }) => job);
  return { jobs, pagination: { page, pageSize, total: jobs.length, totalPages: 1 } };
}

export function getMockJobDetail(id: string) {
  const job = findMockJob(id);
  const now = new Date().toISOString();

  return {
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      employmentType: job.employmentType,
      locationLabel: job.locationLabel,
      countryCode: job.countryCode,
      salary: job.salary,
      contactUrl: job.contactUrl,
      imageUrl: job.imageUrl,
      galleryUrls: job.galleryUrls,
      businessId: null,
      isActive: true,
      createdById: `mock-author-${job.createdByUsername}`,
      createdAt: now,
      updatedAt: now,
      createdBy: { id: `mock-author-${job.createdByUsername}`, name: job.createdByName, username: job.createdByUsername },
      canEdit: false,
    },
  };
}

export function getMockJobComments() {
  return jobCommentStore.getComments();
}

export function addMockJobComment(content: string, parentId: string | null, viewer: MockViewer) {
  return jobCommentStore.addComment(content, parentId, viewer);
}
