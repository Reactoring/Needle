import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { DEMO_TENANT_SLUGS } from '../bootstrap/seed';
import { isDemoUser } from '../lib/demo-session';
import { requestedTenantId } from '../lib/tenant-scope';

const { ForbiddenError, ValidationError } = errors;

export default async (
  policyContext: any,
  config: { tenantOptional?: boolean },
  { strapi }: { strapi: Core.Strapi },
) => {
  if (!isDemoUser(policyContext.state.user)) {
    throw new ForbiddenError('A valid demo session is required');
  }

  const tenants = await strapi.documents('api::tenant.tenant').findMany({
    filters: { slug: { $in: [...DEMO_TENANT_SLUGS] }, active: { $eq: true } },
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
