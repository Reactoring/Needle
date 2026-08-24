import type { Product } from './types';

export const DEMO_COVER_KEYS = [
  'night-transit',
  'static-bloom',
  'orbits',
  'concrete-seasons',
  'cold-signals',
  'sunday-lines',
  'soft-collision',
  'glass-district',
  'afterglow-index',
  'velvet-current',
  'tidal-memory',
  'pale-machines',
] as const;

function stableIndex(value: string) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % DEMO_COVER_KEYS.length;
}

export function coverForProduct(product: Pick<Product, 'coverKey' | 'documentId' | 'title'>) {
  const requestedKey = product.coverKey;
  const coverKey =
    requestedKey && DEMO_COVER_KEYS.some((key) => key === requestedKey)
      ? requestedKey
      : DEMO_COVER_KEYS[stableIndex(`${product.documentId}:${product.title}`)];

  return `/demo-covers/${coverKey}.webp`;
}
