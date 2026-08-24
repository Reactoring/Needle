import type { Core } from '@strapi/strapi';

export const DEMO_ROLE_TYPE = 'demo';
export const DEMO_USER_EMAIL = 'demo-session@vinyl.local';

const DEMO_ACTIONS = [
  'api::tenant.tenant.find',
  'api::product.product.find',
  'api::product.product.create',
  'api::sellable-unit.sellable-unit.find',
  'api::sellable-unit.sellable-unit.create',
  'api::channel-listing.channel-listing.find',
  'api::marketplace-sync-event.marketplace-sync-event.find',
];

async function revokePublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  await strapi.db
    .query('plugin::users-permissions.permission')
    .deleteMany({ where: { role: publicRole.id } });
}

async function ensureDemoRole(strapi: Core.Strapi) {
  const roleQuery = strapi.db.query('plugin::users-permissions.role');
  const existing = await roleQuery.findOne({ where: { type: DEMO_ROLE_TYPE } });
  if (existing) return existing;

  return roleQuery.create({
    data: {
      name: 'Demo visitor',
      description: 'Passwordless visitor restricted to the two demo workspaces.',
      type: DEMO_ROLE_TYPE,
    },
  });
}

async function ensureDemoPermissions(strapi: Core.Strapi, roleId: number) {
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  for (const action of DEMO_ACTIONS) {
    const existing = await permissionQuery.findOne({ where: { action, role: roleId } });
    if (!existing) {
      await permissionQuery.create({ data: { action, role: roleId } });
    }
  }
}

async function ensureDemoUser(strapi: Core.Strapi, roleId: number) {
  const userQuery = strapi.db.query('plugin::users-permissions.user');
  const existing = await userQuery.findOne({ where: { email: DEMO_USER_EMAIL } });
  if (existing) return existing;

  return userQuery.create({
    data: {
      username: 'demo-visitor',
      email: DEMO_USER_EMAIL,
      provider: 'demo-session',
      confirmed: true,
      blocked: false,
      role: roleId,
    },
  });
}

export async function configureDemoAccess(strapi: Core.Strapi) {
  await revokePublicPermissions(strapi);
  const demoRole = await ensureDemoRole(strapi);
  await ensureDemoPermissions(strapi, demoRole.id);
  await ensureDemoUser(strapi, demoRole.id);
}
