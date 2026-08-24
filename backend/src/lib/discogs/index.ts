import type { DiscogsConnector } from './types';
import { createMockConnector } from './mock-connector';

export * from './types';
export { validateListingPayload } from './validation';
export type { CompletenessResult, UnitForValidation, ProductForValidation } from './validation';

export function createDiscogsConnector(env: { mode?: string } = {}): DiscogsConnector {
  if (env.mode && env.mode !== 'mock') {
    throw new Error('Only DISCOGS_MODE=mock is supported by this demo');
  }

  return createMockConnector();
}
