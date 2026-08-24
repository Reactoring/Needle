import type { Core } from '@strapi/strapi';
import { resetDemoData, seedDemoData } from '../../../bootstrap/seed';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  setup() {
    return seedDemoData(strapi);
  },

  reset() {
    return resetDemoData(strapi);
  },
});
