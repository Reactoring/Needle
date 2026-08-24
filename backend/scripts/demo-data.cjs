const { compileStrapi, createStrapi } = require('@strapi/core');

const command = process.argv[2];
if (!['setup', 'reset'].includes(command)) {
  console.error('Usage: node scripts/demo-data.cjs <setup|reset>');
  process.exit(1);
}

process.env.DEMO_AUTO_SEED = 'false';

async function main() {
  const appContext = await compileStrapi();
  const app = createStrapi(appContext);
  await app.load();

  try {
    const service = app.service('api::demo.demo');
    await service[command]();
    console.log(`Demo data ${command} completed.`);
    // Document service events (lifecycles, webhooks) are emitted asynchronously;
    // give them a moment to drain before closing the connection pool.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } finally {
    await app.destroy();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
