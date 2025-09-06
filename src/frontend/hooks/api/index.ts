// Export all React Query hooks from a single index file
export * from './useResumeQueries';
export * from './useJobQueries';
export * from './useJDMatchingQueries';

// Common query key factory
export const queryKeys = {
  all: ['api'] as const,
  health: () => [...queryKeys.all, 'health'] as const,
};

// Export individual key factories for easier access
export { resumeKeys } from './useResumeQueries';
export { jobKeys } from './useJobQueries';
export { jdMatchingKeys } from './useJDMatchingQueries';