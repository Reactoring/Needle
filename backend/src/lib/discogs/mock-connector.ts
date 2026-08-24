import type {
  DiscogsConnector,
  DiscogsRelease,
  DiscogsReleaseSummary,
  PublishedListing,
  PublishListingInput,
} from './types';

// Petit catalogue en dur, suffisant pour derouler tout le workflow sans reseau.
const MOCK_RELEASES: DiscogsRelease[] = [
  {
    releaseId: '123456',
    masterId: '3620',
    title: 'Discovery',
    artist: 'Daft Punk',
    year: 2001,
    country: 'France',
    format: '2xLP',
    label: 'Virgin',
    genres: ['Electronic'],
    styles: ['House', 'Disco'],
    thumbUrl: 'https://example.com/mock/discovery-thumb.jpg',
    coverUrl: 'https://example.com/mock/discovery-cover.jpg',
  },
  {
    releaseId: '249504',
    masterId: '3619',
    title: 'Homework',
    artist: 'Daft Punk',
    year: 1997,
    country: 'France',
    format: '2xLP',
    label: 'Virgin',
    genres: ['Electronic'],
    styles: ['House'],
  },
  {
    releaseId: '4570366',
    masterId: '556257',
    title: 'Random Access Memories',
    artist: 'Daft Punk',
    year: 2013,
    country: 'Europe',
    format: '2xLP',
    label: 'Columbia',
    genres: ['Electronic', 'Funk / Soul'],
    styles: ['Disco'],
  },
  {
    releaseId: '1067963',
    masterId: '46402',
    title: 'Moon Safari',
    artist: 'Air',
    year: 1998,
    country: 'France',
    format: 'LP',
    label: 'Source',
    genres: ['Electronic'],
    styles: ['Downtempo'],
  },
];

// L'id de listing est derive du numero de SKU (VIN-000001 -> discogs-listing-0001)
// pour rester deterministe entre deux redemarrages.
function listingIdFromSku(sku: string): string {
  const digits = sku.match(/(\d+)$/)?.[1] ?? '1';
  return `discogs-listing-${String(parseInt(digits, 10)).padStart(4, '0')}`;
}

export function createMockConnector(): DiscogsConnector {
  return {
    mode: 'mock',

    async searchReleases(query: string): Promise<DiscogsReleaseSummary[]> {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return MOCK_RELEASES.filter((release) =>
        `${release.artist} ${release.title}`.toLowerCase().includes(q),
      );
    },

    async getRelease(releaseId: string): Promise<DiscogsRelease | null> {
      return MOCK_RELEASES.find((release) => release.releaseId === releaseId) ?? null;
    },

    async publishListing(input: PublishListingInput): Promise<PublishedListing> {
      const externalListingId = listingIdFromSku(input.sku);
      return {
        externalListingId,
        externalUrl: `https://www.discogs.com/sell/item/${externalListingId}`,
        publishedPrice: input.price,
        currency: input.currency,
      };
    },
  };
}
