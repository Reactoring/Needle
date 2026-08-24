// Rejoue le parcours complet contre un backend demarre (npm run develop) :
// recherche Discogs -> association release -> creation unite -> completude
// -> publication -> vente simulee -> verification des logs.
//
// Usage : node scripts/e2e-workflow.mjs [baseUrl]

const BASE = process.argv[2] ?? 'http://localhost:1337';

let step = 0;
function check(label, condition, details) {
  step += 1;
  if (!condition) {
    console.error(`  KO  ${step}. ${label}`);
    if (details !== undefined) console.error(JSON.stringify(details, null, 2));
    process.exit(1);
  }
  console.log(`  ok  ${step}. ${label}`);
}

async function api(method, path, body) {
  const response = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json };
}

console.log(`E2E workflow against ${BASE}\n`);

// 1. Tenant de demo (cree par le seed au demarrage)
const tenants = await api('GET', '/tenants?filters[slug][$eq]=demo-records');
const tenant = tenants.json?.data?.[0];
check('demo tenant exists', tenants.status === 200 && tenant, tenants);
const tenantId = tenant.documentId;

// 2. Nouvelle fiche vinyle
const productRes = await api('POST', '/products', {
  data: {
    tenant: tenantId,
    productType: 'vinyl',
    title: 'Homework',
    artist: 'Daft Punk',
  },
});
const product = productRes.json?.data;
check(
  'product created',
  productRes.status >= 200 && productRes.status < 300 && product,
  productRes,
);

// 3. Recherche de release
const search = await api('GET', `/discogs/search?tenantId=${tenantId}&q=homework`);
const release = search.json?.results?.[0];
check('discogs search returns a release', search.status === 200 && release, search);

// 4. Association de la release a la fiche
const attach = await api('POST', `/products/${product.documentId}/attach-discogs-release`, {
  tenantId,
  releaseId: release.releaseId,
});
check(
  'release attached to product',
  attach.status === 200 && attach.json?.product?.discogsReleaseId === release.releaseId,
  attach,
);

// 5. Creation de l'unite vendable (le SKU doit venir du backend)
const unitRes = await api('POST', '/sellable-units', {
  data: {
    tenant: tenantId,
    product: product.documentId,
    price: 29.9,
    currency: 'EUR',
    mediaCondition: 'very_good_plus',
    sleeveCondition: 'very_good',
    saleStatus: 'available',
    quantity: 1,
  },
});
const unit = unitRes.json?.data;
check('sellable unit created', unitRes.status >= 200 && unitRes.status < 300 && unit, unitRes);
check(`sku auto-generated (${unit?.sku})`, /^VIN-\d{6,}$/.test(unit?.sku ?? ''), unit);

// 6. Verification de completude
const completeness = await api(
  'POST',
  `/sellable-units/${unit.documentId}/check-discogs-completeness`,
  { tenantId },
);
check(
  'unit is complete for discogs',
  completeness.status === 200 && completeness.json?.complete,
  completeness,
);

// 7. Publication
const publish = await api('POST', `/sellable-units/${unit.documentId}/publish-discogs`, {
  tenantId,
});
const listing = publish.json?.listing;
check(
  'listing published with an external id',
  publish.status === 200 && listing?.status === 'published' && !!listing?.externalListingId,
  publish,
);

// 8. Le listing est visible cote "marketplace"
const listings = await api('GET', `/discogs/listings?tenantId=${tenantId}&status=published`);
check(
  'published listing is listed',
  listings.status === 200 &&
    listings.json?.some?.((l) => l.externalListingId === listing.externalListingId),
  listings,
);

// 9. Vente simulee
const sale = await api('POST', `/sellable-units/${unit.documentId}/simulate-discogs-sale`, {
  tenantId,
});
check(
  'unit sold and listing removed',
  sale.status === 200 &&
    sale.json?.unit?.saleStatus === 'sold' &&
    sale.json?.unit?.quantity === 0 &&
    sale.json?.listing?.status === 'removed',
  sale,
);

// 10. Les evenements de synchro ont ete journalises
const events = await api(
  'GET',
  `/marketplace-sync-events?filters[sellableUnit][documentId][$eq]=${unit.documentId}&pagination[pageSize]=50`,
);
const actions = (events.json?.data ?? []).map((e) => e.action);
for (const expected of [
  'check_completeness',
  'publish_listing',
  'simulate_sale',
  'mark_out_of_stock',
]) {
  check(`sync event "${expected}" logged`, actions.includes(expected), actions);
}

console.log('\nAll workflow steps passed.');
