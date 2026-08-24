import type { Core } from '@strapi/strapi';
import { seedDemoData } from './bootstrap/seed';
import { grantPublicReadPermissions } from './bootstrap/public-permissions';
import { ensureAdminUser } from './bootstrap/admin-user';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureAdminUser(strapi);
    await grantPublicReadPermissions(strapi);
    if (process.env.NODE_ENV !== 'production' && process.env.DEMO_AUTO_SEED !== 'false') {
      await seedDemoData(strapi);
    }
  },
};
