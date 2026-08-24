import { describe, it, expect } from 'vitest';
import { nextSku, parseSkuNumber } from '../../src/lib/sku';

describe('nextSku', () => {
  it('starts the sequence at VIN-000001 when no sku exists yet', () => {
    expect(nextSku(null)).toBe('VIN-000001');
    expect(nextSku(undefined)).toBe('VIN-000001');
  });

  it('increments the last known sku', () => {
    expect(nextSku('VIN-000001')).toBe('VIN-000002');
    expect(nextSku('VIN-000041')).toBe('VIN-000042');
  });

  it('keeps the 6-digit padding', () => {
    expect(nextSku('VIN-000009')).toBe('VIN-000010');
    expect(nextSku('VIN-099999')).toBe('VIN-100000');
  });

  it('grows past 6 digits instead of overflowing', () => {
    expect(nextSku('VIN-999999')).toBe('VIN-1000000');
  });

  it('restarts from 1 when the stored value is not a valid sku', () => {
    expect(nextSku('garbage')).toBe('VIN-000001');
    expect(nextSku('VIN-')).toBe('VIN-000001');
  });
});

describe('parseSkuNumber', () => {
  it('extracts the numeric part', () => {
    expect(parseSkuNumber('VIN-000123')).toBe(123);
  });

  it('returns 0 for empty or malformed values', () => {
    expect(parseSkuNumber(null)).toBe(0);
    expect(parseSkuNumber('')).toBe(0);
    expect(parseSkuNumber('SKU-1')).toBe(0);
  });
});
