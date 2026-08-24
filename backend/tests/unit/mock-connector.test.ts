import { describe, it, expect } from 'vitest';
import { createDiscogsConnector } from '../../src/lib/discogs';
import { createMockConnector } from '../../src/lib/discogs/mock-connector';

const connector = createMockConnector();

describe('mock discogs connector', () => {
  it('rejects every non-mock integration mode', () => {
    expect(() => createDiscogsConnector({ mode: 'real' })).toThrow(
      'Only DISCOGS_MODE=mock is supported by this demo',
    );
    expect(() => createDiscogsConnector({ mode: 'api' })).toThrow();
  });

  it('uses mock mode by default', () => {
    expect(createDiscogsConnector().mode).toBe('mock');
  });

  it('reports mock mode', () => {
    expect(connector.mode).toBe('mock');
  });

  it('searches releases by artist or title, case-insensitive', async () => {
    const byArtist = await connector.searchReleases('daft punk');
    expect(byArtist.length).toBeGreaterThanOrEqual(3);

    const byTitle = await connector.searchReleases('Discovery');
    expect(byTitle.map((r) => r.releaseId)).toContain('123456');
  });

  it('finds releases for the two seeded products awaiting association', async () => {
    const orbits = await connector.searchReleases('Lila Nova Orbits');
    const softCollision = await connector.searchReleases('Paper Satellites Soft Collision');

    expect(orbits.map((release) => release.releaseId)).toContain('910004');
    expect(softCollision.map((release) => release.releaseId)).toContain('920004');
  });

  it('returns an empty list for a blank query', async () => {
    expect(await connector.searchReleases('   ')).toEqual([]);
  });

  it('returns the expected reference release', async () => {
    const release = await connector.getRelease('123456');
    expect(release).toMatchObject({
      releaseId: '123456',
      artist: 'Daft Punk',
      title: 'Discovery',
      year: 2001,
      country: 'France',
      format: '2xLP',
      label: 'Virgin',
    });
  });

  it('returns null for an unknown release', async () => {
    expect(await connector.getRelease('999999999')).toBeNull();
  });

  it('derives the listing id from the sku so it stays deterministic', async () => {
    const published = await connector.publishListing({
      sku: 'VIN-000001',
      releaseId: '123456',
      price: 34.99,
      currency: 'EUR',
      mediaCondition: 'near_mint',
    });
    expect(published).toEqual({
      externalListingId: 'discogs-listing-0001',
      externalUrl: 'https://example.invalid/discogs/listings/discogs-listing-0001',
      publishedPrice: 34.99,
      currency: 'EUR',
    });
  });
});
