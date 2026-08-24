import type { Core } from '@strapi/strapi';

// Acces public sur les modeles metier pour derouler le parcours de test sans
// token API (lecture partout, creation limitee aux fiches et unites).
// Choix assume pour la demo : en production ces routes seraient derriere une
// vraie gestion de roles.
const PUBLIC_READ_ACTIONS = [
  'api::tenant.tenant.find',
  'api::tenant.tenant.findOne',
  'api::product.product.find',
  'api::product.product.findOne',
  'api::sellable-unit.sellable-unit.find',
  'api::sellable-unit.sellable-unit.findOne',
  'api::channel-listing.channel-listing.find',
  'api::channel-listing.channel-listing.findOne',
  'api::marketplace-sync-event.marketplace-sync-event.find',
  'api::marketplace-sync-event.marketplace-sync-event.findOne',
  'api::product.product.create',
  'api::sellable-unit.sellable-unit.create',
];

export async function grantPublicReadPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  for (const action of PUBLIC_READ_ACTIONS) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: publicRole.id } });
    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: publicRole.id } });
    }
  }
}
