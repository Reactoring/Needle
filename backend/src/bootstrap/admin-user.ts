import type { Core } from '@strapi/strapi';

// Optionally creates the first admin account from environment variables.
// This is intended for deployment: without ADMIN_EMAIL / ADMIN_PASSWORD, the
// standard "create the first administrator" screen remains available for a
// local installation. Existing administrators are never modified.
export async function ensureAdminUser(strapi: Core.Strapi) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const adminCount = await strapi.db.query('admin::user').count();
  if (adminCount > 0) return;

  const superAdminRole = await strapi.service('admin::role').getSuperAdmin();
  if (!superAdminRole) return;

  await strapi.service('admin::user').create({
    email,
    firstname: 'Admin',
    lastname: 'Demo',
    password,
    isActive: true,
    registrationToken: null,
    roles: [superAdminRole.id],
  });

  strapi.log.info(`[bootstrap] Super admin ${email} created from environment`);
}
