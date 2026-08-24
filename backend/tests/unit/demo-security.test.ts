import { describe, expect, it, vi } from 'vitest';
import { DEMO_ROLE_TYPE, DEMO_USER_EMAIL } from '../../src/bootstrap/demo-access';
import { isDemoUser } from '../../src/lib/demo-session';
import {
  relationDocumentId,
  requestedTenantId,
  requireDemoTenantId,
  scopeQueryToTenant,
} from '../../src/lib/tenant-scope';
import demoSessionCookie from '../../src/middlewares/demo-session-cookie';
import demoTenantPolicy from '../../src/policies/demo-tenant';

const demoUser = {
  email: DEMO_USER_EMAIL,
  role: { type: DEMO_ROLE_TYPE },
};

describe('demo session identity', () => {
  it('accepts only the provisioned demo identity and role', () => {
    expect(isDemoUser(demoUser)).toBe(true);
    expect(isDemoUser({ ...demoUser, email: 'another@example.test' })).toBe(false);
    expect(isDemoUser({ ...demoUser, role: { type: 'authenticated' } })).toBe(false);
    expect(isDemoUser(null)).toBe(false);
  });

  it('maps the HTTP-only demo cookie to bearer authentication', async () => {
    const next = vi.fn(async () => undefined);
    const middleware = demoSessionCookie({}, {} as never);
    const ctx = {
      cookies: { get: vi.fn(() => 'signed-demo-token') },
      request: { headers: {} as Record<string, string> },
    };

    await middleware(ctx, next);

    expect(ctx.request.headers.authorization).toBe('Bearer signed-demo-token');
    expect(next).toHaveBeenCalledOnce();
  });

  it('does not replace an explicit authorization header', async () => {
    const middleware = demoSessionCookie({}, {} as never);
    const ctx = {
      cookies: { get: vi.fn(() => 'cookie-token') },
      request: { headers: { authorization: 'Bearer explicit-token' } },
    };

    await middleware(ctx, async () => undefined);

    expect(ctx.request.headers.authorization).toBe('Bearer explicit-token');
  });
});

describe('tenant scope helpers', () => {
  it('extracts a tenant from every supported request shape', () => {
    expect(requestedTenantId({ request: { query: { tenantId: 'query' }, body: {} } })).toBe(
      'query',
    );
    expect(requestedTenantId({ request: { query: {}, body: { tenantId: 'body' } } })).toBe('body');
    expect(requestedTenantId({ request: { query: {}, body: { data: { tenant: 'data' } } } })).toBe(
      'data',
    );
    expect(
      requestedTenantId({
        request: {
          query: { filters: { tenant: { documentId: { $eq: 'filter' } } } },
          body: {},
        },
      }),
    ).toBe('filter');
  });

  it('requires an allowed demo tenant', () => {
    expect(
      requireDemoTenantId({
        request: { query: { tenantId: 'tenant-a' }, body: {} },
        state: { demoTenantIds: ['tenant-a', 'tenant-b'] },
      }),
    ).toBe('tenant-a');

    expect(() =>
      requireDemoTenantId({
        request: { query: { tenantId: 'tenant-c' }, body: {} },
        state: { demoTenantIds: ['tenant-a', 'tenant-b'] },
      }),
    ).toThrow('This demo session cannot access the requested tenant');
  });

  it('combines caller filters with the enforced tenant filter', () => {
    const ctx = { query: { filters: { saleStatus: { $eq: 'available' } }, sort: 'sku:asc' } };
    scopeQueryToTenant(ctx, 'tenant-a');
    expect(ctx.query).toEqual({
      sort: 'sku:asc',
      filters: {
        $and: [
          { saleStatus: { $eq: 'available' } },
          { tenant: { documentId: { $eq: 'tenant-a' } } },
        ],
      },
    });
  });

  it('normalizes relation document identifiers', () => {
    expect(relationDocumentId('direct')).toBe('direct');
    expect(relationDocumentId({ documentId: 'document' })).toBe('document');
    expect(relationDocumentId({ connect: [{ documentId: 'connected' }] })).toBe('connected');
    expect(relationDocumentId({ set: ['set-value'] })).toBe('set-value');
    expect(relationDocumentId(null)).toBeUndefined();
  });
});

describe('demo tenant policy', () => {
  const strapi = {
    documents: vi.fn(() => ({
      findMany: vi.fn(async () => [
        { documentId: 'tenant-a', slug: 'demo-records' },
        { documentId: 'tenant-b', slug: 'second-groove' },
      ]),
    })),
  } as never;

  it('accepts an authenticated demo user in either seeded tenant', async () => {
    const ctx = {
      state: { user: demoUser } as Record<string, unknown>,
      request: { query: { tenantId: 'tenant-b' }, body: {} },
    };

    await expect(demoTenantPolicy(ctx, {}, { strapi })).resolves.toBe(true);
    expect(ctx.state.demoTenantIds).toEqual(['tenant-a', 'tenant-b']);
  });

  it('rejects another authenticated role', async () => {
    const ctx = {
      state: { user: { ...demoUser, role: { type: 'authenticated' } } },
      request: { query: { tenantId: 'tenant-a' }, body: {} },
    };

    await expect(demoTenantPolicy(ctx, {}, { strapi })).rejects.toThrow(
      'A valid demo session is required',
    );
  });

  it('rejects a tenant outside the two seeded workspaces', async () => {
    const ctx = {
      state: { user: demoUser },
      request: { query: { tenantId: 'tenant-c' }, body: {} },
    };

    await expect(demoTenantPolicy(ctx, {}, { strapi })).rejects.toThrow(
      'This demo session cannot access the requested tenant',
    );
  });
});
