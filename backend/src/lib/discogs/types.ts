export type DiscogsMode = 'mock' | 'real';

export interface DiscogsReleaseSummary {
  releaseId: string;
  masterId?: string;
  title: string;
  artist: string;
  year?: number;
  country?: string;
  format?: string;
  label?: string;
  thumbUrl?: string;
  coverUrl?: string;
}

export interface DiscogsRelease extends DiscogsReleaseSummary {
  genres?: string[];
  styles?: string[];
}

export interface PublishListingInput {
  sku: string;
  releaseId: string;
  price: number;
  currency: string;
  mediaCondition: string;
  sleeveCondition?: string;
  comment?: string;
}

export interface PublishedListing {
  externalListingId: string;
  externalUrl: string;
  publishedPrice: number;
  currency: string;
}

export interface DiscogsConnector {
  readonly mode: DiscogsMode;
  searchReleases(query: string): Promise<DiscogsReleaseSummary[]>;
  getRelease(releaseId: string): Promise<DiscogsRelease | null>;
  publishListing(input: PublishListingInput): Promise<PublishedListing>;
}
