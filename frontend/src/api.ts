import type { Completeness, Listing, Product, Release, SyncEvent, Tenant, Unit } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:1337';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const message = json?.error?.message ?? `${method} ${path} -> HTTP ${response.status}`;
    throw new Error(message);
  }
  return json as T;
}

export const api = {
  async getDemoTenant(): Promise<Tenant | null> {
    const res = await request<{ data: Tenant[] }>(
      'GET',
      '/tenants?filters[slug][$eq]=demo-records',
    );
    return res.data[0] ?? null;
  },

  async getMode(): Promise<string> {
    const res = await request<{ mode: string }>('GET', '/discogs/info');
    return res.mode;
  },

  async getProducts(tenantId: string): Promise<Product[]> {
    const res = await request<{ data: Product[] }>(
      'GET',
      `/products?filters[tenant][documentId][$eq]=${tenantId}&populate=sellableUnits&sort=createdAt:desc&pagination[pageSize]=50`,
    );
    return res.data;
  },

  async createProduct(tenantId: string, title: string, artist: string): Promise<Product> {
    const res = await request<{ data: Product }>('POST', '/products', {
      data: { tenant: tenantId, productType: 'vinyl', title, artist },
    });
    return res.data;
  },

  async searchDiscogs(tenantId: string, q: string): Promise<{ mode: string; results: Release[] }> {
    return request('GET', `/discogs/search?tenantId=${tenantId}&q=${encodeURIComponent(q)}`);
  },

  async attachRelease(tenantId: string, productId: string, releaseId: string) {
    return request<{ product: Product; release: Release }>(
      'POST',
      `/products/${productId}/attach-discogs-release`,
      { tenantId, releaseId },
    );
  },

  async createUnit(
    tenantId: string,
    productId: string,
    input: { price: number; mediaCondition: string; sleeveCondition: string },
  ): Promise<Unit> {
    const res = await request<{ data: Unit }>('POST', '/sellable-units', {
      data: {
        tenant: tenantId,
        product: productId,
        price: input.price,
        currency: 'EUR',
        mediaCondition: input.mediaCondition,
        sleeveCondition: input.sleeveCondition,
        saleStatus: 'available',
        quantity: 1,
      },
    });
    return res.data;
  },

  async checkCompleteness(tenantId: string, unitId: string): Promise<Completeness> {
    return request('POST', `/sellable-units/${unitId}/check-discogs-completeness`, { tenantId });
  },

  async publish(tenantId: string, unitId: string): Promise<{ listing: Listing; mode: string }> {
    return request('POST', `/sellable-units/${unitId}/publish-discogs`, { tenantId });
  },

  async simulateSale(tenantId: string, unitId: string): Promise<{ unit: Unit; listing: Listing }> {
    return request('POST', `/sellable-units/${unitId}/simulate-discogs-sale`, { tenantId });
  },

  async getListings(tenantId: string, status?: string): Promise<Listing[]> {
    const statusParam = status ? `&status=${status}` : '';
    return request('GET', `/discogs/listings?tenantId=${tenantId}${statusParam}`);
  },

  async getEvents(tenantId: string): Promise<SyncEvent[]> {
    const res = await request<{ data: SyncEvent[] }>(
      'GET',
      `/marketplace-sync-events?filters[tenant][documentId][$eq]=${tenantId}&sort=happenedAt:desc&pagination[pageSize]=25`,
    );
    return res.data;
  },
};
