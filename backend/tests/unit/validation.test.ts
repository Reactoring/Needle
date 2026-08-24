import { describe, it, expect } from 'vitest';
import { validateListingPayload } from '../../src/lib/discogs/validation';

const completeUnit = {
  sku: 'VIN-000001',
  price: 34.99,
  currency: 'EUR',
  mediaCondition: 'near_mint',
  sleeveCondition: 'very_good_plus',
  saleStatus: 'available',
  quantity: 1,
};

const completeProduct = {
  title: 'Discovery',
  artist: 'Daft Punk',
  discogsReleaseId: '123456',
};

describe('validateListingPayload', () => {
  it('accepts a complete unit linked to a product with a release', () => {
    const result = validateListingPayload(completeUnit, completeProduct);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it('rejects a unit without a linked product', () => {
    const result = validateListingPayload(completeUnit, null);
    expect(result.complete).toBe(false);
    expect(result.errors).toContain('Unit is not linked to a product');
  });

  it('lists every missing field', () => {
    const result = validateListingPayload(
      { ...completeUnit, mediaCondition: null, sleeveCondition: null },
      { ...completeProduct, discogsReleaseId: null },
    );
    expect(result.complete).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining(['product.discogsReleaseId', 'mediaCondition', 'sleeveCondition']),
    );
  });

  it('rejects a price of zero', () => {
    const result = validateListingPayload({ ...completeUnit, price: 0 }, completeProduct);
    expect(result.complete).toBe(false);
    expect(result.errors).toContain('price must be greater than 0');
  });

  it('rejects a unit that is not available for sale', () => {
    const result = validateListingPayload({ ...completeUnit, saleStatus: 'sold' }, completeProduct);
    expect(result.complete).toBe(false);
    expect(result.errors.some((e) => e.includes('not available for sale'))).toBe(true);
  });

  it('rejects a unit with no stock', () => {
    const result = validateListingPayload({ ...completeUnit, quantity: 0 }, completeProduct);
    expect(result.complete).toBe(false);
    expect(result.errors).toContain('quantity must be at least 1');
  });
});
