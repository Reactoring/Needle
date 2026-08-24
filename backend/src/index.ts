import type { Core } from '@strapi/strapi';
import { seedDemoData } from './bootstrap/seed';
import { configureDemoAccess } from './bootstrap/demo-access';
import { ensureAdminUser } from './bootstrap/admin-user';
import { ensureDbConstraints } from './bootstrap/db-constraints';

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureDbConstraints(strapi);
    await ensureAdminUser(strapi);
    await configureDemoAccess(strapi);
    if (process.env.NODE_ENV !== 'production' && process.env.DEMO_AUTO_SEED !== 'false') {
      await seedDemoData(strapi);
    }
  },
};
