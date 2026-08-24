export interface Tenant {
  documentId: string;
  name: string;
  slug: string;
  active: boolean;
}

export interface Unit {
  documentId: string;
  sku: string;
  price: number;
  currency: string;
  mediaCondition?: string | null;
  sleeveCondition?: string | null;
  saleStatus: 'available' | 'reserved' | 'sold' | 'out_of_stock' | 'archived';
  quantity: number;
}

export interface Product {
  documentId: string;
  title: string;
  artist: string;
  coverKey?: string | null;
  label?: string | null;
  year?: number | null;
  country?: string | null;
  format?: string | null;
  discogsReleaseId?: string | null;
  sellableUnits?: Unit[];
}

export interface Release {
  releaseId: string;
  title: string;
  artist: string;
  year?: number;
  country?: string;
  format?: string;
  label?: string;
  thumbUrl?: string;
  coverUrl?: string;
}

export interface Listing {
  documentId: string;
  channel: string;
  status: string;
  externalListingId?: string | null;
  externalUrl?: string | null;
  publishedPrice?: number | null;
  lastSyncedAt?: string | null;
  sellableUnit?: (Unit & { product?: Product }) | null;
}

export interface SyncEvent {
  documentId: string;
  channel: string;
  action: string;
  status: 'success' | 'error';
  message: string;
  happenedAt: string;
}

export interface Completeness {
  complete: boolean;
  missing: string[];
  errors: string[];
}
