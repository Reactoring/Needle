import type { Core } from '@strapi/strapi';

// Creation optionnelle du premier compte admin via l'environnement.
// Pensee pour le deploiement : sans ADMIN_EMAIL / ADMIN_PASSWORD, on ne fait
// rien et l'ecran classique "creer le premier administrateur" reste disponible
// (cas de l'installation locale). Ne touche jamais a un admin existant.
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
