import type { DiscogsConnector, DiscogsMode } from './types';
import { createMockConnector } from './mock-connector';
import { createRealConnector } from './real-connector';

export * from './types';
export { validateListingPayload } from './validation';
export type {
  CompletenessResult,
  UnitForValidation,
  ProductForValidation,
} from './validation';

export function createDiscogsConnector(env: {
  mode?: string;
  token?: string;
}): DiscogsConnector {
  const mode: DiscogsMode = env.mode === 'real' ? 'real' : 'mock';

  if (mode === 'real') {
    if (!env.token) {
      throw new Error('DISCOGS_MODE=real requires DISCOGS_TOKEN to be set');
    }
    return createRealConnector(env.token);
  }

  return createMockConnector();
}
