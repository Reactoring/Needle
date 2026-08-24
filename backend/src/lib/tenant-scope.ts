import { errors } from '@strapi/utils';

const { ForbiddenError, ValidationError } = errors;

export function requestedTenantId(ctx: any): string | undefined {
  return (
    ctx.request.query?.tenantId ??
    ctx.request.body?.tenantId ??
    ctx.request.body?.data?.tenant ??
    ctx.request.query?.filters?.tenant?.documentId?.$eq
  );
}

export function requireDemoTenantId(ctx: any): string {
  const tenantId = requestedTenantId(ctx);
  if (!tenantId) {
    throw new ValidationError('A tenant scope is required');
  }
  if (!ctx.state.demoTenantIds?.includes(tenantId)) {
    throw new ForbiddenError('This demo session cannot access the requested tenant');
  }
  return tenantId;
}

export function scopeQueryToTenant(ctx: any, tenantId: string) {
  const requestedFilters = ctx.query?.filters;
  const tenantFilter = { tenant: { documentId: { $eq: tenantId } } };
  ctx.query = {
    ...ctx.query,
    filters: requestedFilters ? { $and: [requestedFilters, tenantFilter] } : tenantFilter,
  };
}

export function relationDocumentId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (!value || typeof value !== 'object') return undefined;

  const relation = value as {
    documentId?: string;
    connect?: Array<string | { documentId?: string }>;
    set?: Array<string | { documentId?: string }>;
  };
  if (relation.documentId) return relation.documentId;

  const candidate = relation.connect?.[0] ?? relation.set?.[0];
  if (typeof candidate === 'string') return candidate;
  return candidate?.documentId;
}
