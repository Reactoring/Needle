import type { Core } from '@strapi/strapi';
import { seedDemoData } from './bootstrap/seed';
import { grantPublicReadPermissions } from './bootstrap/public-permissions';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicReadPermissions(strapi);
    await seedDemoData(strapi);
  },
};
