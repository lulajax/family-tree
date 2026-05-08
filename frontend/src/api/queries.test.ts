import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  apiClient: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: mocks.useQuery,
}));

vi.mock('./client', () => ({
  apiClient: mocks.apiClient,
}));

import {
  useFamilyActivity,
  useFamilyCollaborationMembers,
  useRelationshipExplanation,
} from './queries';

describe('useRelationshipExplanation', () => {
  beforeEach(() => {
    mocks.useQuery.mockReset();
    mocks.apiClient.mockReset();
  });

  it('queries the person relationship-to endpoint with reference and target ids', async () => {
    mocks.useQuery.mockImplementation((config) => config);

    const config = useRelationshipExplanation('target-1', 'reference-1');

    expect(config.queryKey).toEqual(['relationshipExplanation', 'target-1', 'reference-1']);
    expect(config.enabled).toBe(true);

    await config.queryFn();

    expect(mocks.apiClient).toHaveBeenCalledWith('/persons/target-1/relationship-to?reference=reference-1');
  });

  it('disables the query when either id is missing or both ids are the same', () => {
    mocks.useQuery.mockImplementation((config) => config);

    expect(useRelationshipExplanation(null, 'reference-1').enabled).toBe(false);
    expect(useRelationshipExplanation('target-1', null).enabled).toBe(false);
    expect(useRelationshipExplanation('same-1', 'same-1').enabled).toBe(false);
  });
});

describe('collaboration queries', () => {
  beforeEach(() => {
    mocks.useQuery.mockReset();
    mocks.apiClient.mockReset();
  });

  it('queries family collaboration members by family id', async () => {
    mocks.useQuery.mockImplementation((config) => config);

    const config = useFamilyCollaborationMembers('family-1');

    expect(config.queryKey).toEqual(['collaborationMembers', 'family-1']);
    expect(config.enabled).toBe(true);

    await config.queryFn();

    expect(mocks.apiClient).toHaveBeenCalledWith('/families/family-1/collaboration/members');
  });

  it('queries family activity with a bounded limit', async () => {
    mocks.useQuery.mockImplementation((config) => config);

    const config = useFamilyActivity('family-1', 20);

    expect(config.queryKey).toEqual(['familyActivity', 'family-1', 20]);
    expect(config.enabled).toBe(true);

    await config.queryFn();

    expect(mocks.apiClient).toHaveBeenCalledWith('/families/family-1/activity?limit=20');
  });
});
