// Runs the complete workflow against a started backend (npm run develop):
// anonymous denial -> demo session -> tenant isolation -> concurrent SKU allocation
// -> release matching -> idempotent publication -> idempotent simulated sale -> event audit.
//
// Usage: node scripts/e2e-workflow.mjs [baseUrl]

const BASE = process.argv[2] ?? 'http://localhost:1337';
const CONCURRENCY = 8;

let step = 0;
let sessionCookie = '';

function check(label, condition, details) {
  step += 1;
  if (!condition) {
    console.error(`  KO  ${step}. ${label}`);
    if (details !== undefined) console.error(JSON.stringify(details, null, 2));
    process.exit(1);
  }
  console.log(`  ok  ${step}. ${label}`);
}

async function api(method, path, body, authenticated = true) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authenticated && sessionCookie ? { Cookie: sessionCookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json, headers: response.headers };
}

console.log(`E2E security and workflow against ${BASE}\n`);

// 1. Business routes are never public.
const anonymousTenants = await api('GET', '/tenants', undefined, false);
check('anonymous business request is denied', anonymousTenants.status === 401, anonymousTenants);

// 2. The public bootstrap creates a cookie-backed demo session for exactly two tenants.
const session = await api('POST', '/demo/session', undefined, false);
const setCookie = session.headers.getSetCookie?.()[0] ?? session.headers.get('set-cookie') ?? '';
sessionCookie = setCookie.split(';')[0];
const tenants = session.json?.tenants ?? [];
check(
  'passwordless demo session returns an HTTP-only cookie',
  session.status === 200 &&
    sessionCookie.startsWith('vinyl_demo_session=') &&
    /httponly/i.test(setCookie),
  { status: session.status, setCookie },
);
check(
  'session is restricted to the two seeded tenants',
  tenants.length === 2 &&
    new Set(tenants.map((tenant) => tenant.slug)).size === 2 &&
    tenants.every((tenant) => ['demo-records', 'second-groove'].includes(tenant.slug)),
  tenants,
);
check(
  'session response exposes no bearer token',
  !session.json?.token && !session.json?.jwt,
  session,
);

const tenant = tenants.find((candidate) => candidate.slug === 'demo-records');
const otherTenant = tenants.find((candidate) => candidate.slug === 'second-groove');
check('both target tenants are available', tenant && otherTenant, tenants);
const tenantId = tenant.documentId;

// 3. Create a fictional catalog record in the first tenant.
const productRes = await api('POST', '/products', {
  data: {
    tenant: tenantId,
    productType: 'vinyl',
    title: 'Night Transit — Integration Copy',
    artist: 'Neon Meridian',
  },
});
const product = productRes.json?.data;
check(
  'product is created in the selected tenant',
  productRes.status >= 200 && productRes.status < 300 && product,
  productRes,
);

// 4. A unit cannot connect a product from one tenant to the other.
const crossTenantUnit = await api('POST', '/sellable-units', {
  data: {
    tenant: otherTenant.documentId,
    product: product.documentId,
    price: 29.9,
    currency: 'EUR',
    mediaCondition: 'very_good_plus',
    sleeveCondition: 'very_good',
    saleStatus: 'available',
    quantity: 1,
  },
});
check('cross-tenant product relation is rejected', crossTenantUnit.status === 400, crossTenantUnit);

// 5. Search and attach a release through the local connector only.
const search = await api('GET', `/discogs/search?tenantId=${tenantId}&q=night%20transit`);
const release = search.json?.results?.find((candidate) => candidate.releaseId === '910001');
check(
  'mock release search returns the fictional fixture',
  search.status === 200 && search.json?.mode === 'mock' && release,
  search,
);

const attach = await api('POST', `/products/${product.documentId}/attach-discogs-release`, {
  tenantId,
  releaseId: release.releaseId,
});
check(
  'release is attached to the tenant product',
  attach.status === 200 && attach.json?.product?.discogsReleaseId === release.releaseId,
  attach,
);

// 6. Concurrent creation must always allocate unique SKUs.
const unitRequests = Array.from({ length: CONCURRENCY }, (_, index) =>
  api('POST', '/sellable-units', {
    data: {
      tenant: tenantId,
      product: product.documentId,
      price: 29.9 + index,
      currency: 'EUR',
      mediaCondition: 'very_good_plus',
      sleeveCondition: 'very_good',
      saleStatus: 'available',
      quantity: 1,
    },
  }),
);
const unitResponses = await Promise.all(unitRequests);
const units = unitResponses.map((response) => response.json?.data).filter(Boolean);
const skus = units.map((unit) => unit.sku);
check(
  `${CONCURRENCY} concurrent units are created`,
  unitResponses.every((response) => response.status >= 200 && response.status < 300) &&
    units.length === CONCURRENCY,
  unitResponses,
);
check(
  'concurrent SKU allocation stays unique and formatted',
  new Set(skus).size === CONCURRENCY && skus.every((sku) => /^VIN-\d{6,}$/.test(sku)),
  skus,
);

const unit = units[0];
const completeness = await api(
  'POST',
  `/sellable-units/${unit.documentId}/check-discogs-completeness`,
  { tenantId },
);
check(
  'unit is complete for the simulated marketplace',
  completeness.status === 200 && completeness.json?.complete,
  completeness,
);

// 7. Concurrent publication converges on one listing and one audit event.
const publishResponses = await Promise.all(
  Array.from({ length: CONCURRENCY }, () =>
    api('POST', `/sellable-units/${unit.documentId}/publish-discogs`, { tenantId }),
  ),
);
const listingIds = publishResponses.map((response) => response.json?.listing?.externalListingId);
check(
  'concurrent publication requests are idempotent',
  publishResponses.every(
    (response) => response.status === 200 && response.json?.listing?.status === 'published',
  ) && new Set(listingIds).size === 1,
  publishResponses,
);

const publishedListings = await api(
  'GET',
  `/discogs/listings?tenantId=${tenantId}&status=published`,
);
const listingsForUnit = (publishedListings.json ?? []).filter(
  (listing) => listing.sellableUnit?.documentId === unit.documentId,
);
check('exactly one listing exists for the unit', listingsForUnit.length === 1, listingsForUnit);

// 8. Concurrent sales converge on one stock/listing transition.
const saleResponses = await Promise.all(
  Array.from({ length: CONCURRENCY }, () =>
    api('POST', `/sellable-units/${unit.documentId}/simulate-discogs-sale`, { tenantId }),
  ),
);
check(
  'concurrent simulated sales are idempotent',
  saleResponses.every(
    (response) =>
      response.status === 200 &&
      response.json?.unit?.saleStatus === 'sold' &&
      response.json?.unit?.quantity === 0 &&
      response.json?.listing?.status === 'removed',
  ),
  saleResponses,
);

// 9. The audit contains one event for each atomic transition.
const events = await api(
  'GET',
  `/marketplace-sync-events?filters[tenant][documentId][$eq]=${tenantId}&filters[sellableUnit][documentId][$eq]=${unit.documentId}&pagination[pageSize]=50`,
);
const actions = (events.json?.data ?? []).map((event) => event.action);
for (const expected of [
  'check_completeness',
  'publish_listing',
  'simulate_sale',
  'mark_out_of_stock',
]) {
  check(
    `sync event "${expected}" is logged once`,
    actions.filter((action) => action === expected).length === 1,
    actions,
  );
}

console.log('\nAll security and workflow invariants passed.');
