import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { DEMO_TENANT_SLUGS } from '../bootstrap/seed';
import { isDemoUser } from '../lib/demo-session';

const { ForbiddenError, ValidationError } = errors;

function requestedTenantId(ctx: any): string | undefined {
  return (
    ctx.request.query?.tenantId ??
    ctx.request.body?.tenantId ??
    ctx.request.body?.data?.tenant ??
    ctx.request.query?.filters?.tenant?.documentId?.$eq
  );
}

export default async (
  policyContext: any,
  config: { tenantOptional?: boolean },
  { strapi }: { strapi: Core.Strapi },
) => {
  if (!isDemoUser(policyContext.state.user)) {
    throw new ForbiddenError('A valid demo session is required');
  }

  const tenants = await strapi.documents('api::tenant.tenant').findMany({
    filters: { slug: { $in: [...DEMO_TENANT_SLUGS] } },
    pagination: { pageSize: DEMO_TENANT_SLUGS.length },
  });
  const allowedTenantIds = tenants.map((tenant) => tenant.documentId);
  policyContext.state.demoTenantIds = allowedTenantIds;

  const tenantId = requestedTenantId(policyContext);
  if (!tenantId && !config.tenantOptional) {
    throw new ValidationError('A tenant scope is required');
  }
  if (tenantId && !allowedTenantIds.includes(tenantId)) {
    throw new ForbiddenError('This demo session cannot access the requested tenant');
  }

  return true;
};
