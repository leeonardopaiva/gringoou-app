export const buildSearchPath = (query: string, params?: URLSearchParams) => {
  const nextParams = new URLSearchParams(params?.toString());
  const normalizedQuery = query.trim().slice(0, 80);

  if (normalizedQuery) {
    nextParams.set('q', normalizedQuery);
  } else {
    nextParams.delete('q');
  }

  const queryString = nextParams.toString();
  return queryString ? `/buscar?${queryString}` : '/buscar';
};
