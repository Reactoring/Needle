import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from './api';
import { coverForProduct } from './demoCovers';
import type { Completeness, Listing, Product, Release, SyncEvent, Tenant, Unit } from './types';

const CONDITION_LABELS: Record<string, string> = {
  mint: 'Mint',
  near_mint: 'Near Mint',
  very_good_plus: 'VG+',
  very_good: 'VG',
  good_plus: 'G+',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  reserved: 'Réservé',
  sold: 'Vendu',
  out_of_stock: 'Hors stock',
  archived: 'Archivé',
};

interface Props {
  tenant: Tenant;
  refreshKey: number;
  onChanged: () => void;
}

export function SellerView({ tenant, refreshKey, onChanged }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getProducts(tenant.documentId),
      api.getEvents(tenant.documentId),
      api.getListings(tenant.documentId),
    ])
      .then(([productList, eventList, listingList]) => {
        if (!active) return;
        setProducts(productList);
        setEvents(eventList);
        setListings(listingList);
        setSelectedId((current) =>
          productList.some((product) => product.documentId === current)
            ? current
            : (productList[0]?.documentId ?? null),
        );
      })
      .catch((error) => {
        if (active) setFeedback(`Erreur de chargement : ${(error as Error).message}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tenant.documentId, refreshKey]);

  const selected = products.find((product) => product.documentId === selectedId) ?? null;
  const normalizedFilter = filter.trim().toLocaleLowerCase('fr-FR');
  const filteredProducts = products.filter((product) =>
    `${product.artist} ${product.title} ${product.label ?? ''}`
      .toLocaleLowerCase('fr-FR')
      .includes(normalizedFilter),
  );
  const unitCount = products.reduce(
    (total, product) => total + (product.sellableUnits?.length ?? 0),
    0,
  );
  const publishedCount = listings.filter((listing) => listing.status === 'published').length;

  async function run(action: () => Promise<unknown>, successMessage?: string) {
    setFeedback(null);
    try {
      await action();
      if (successMessage) setFeedback(successMessage);
      onChanged();
    } catch (error) {
      setFeedback(`Erreur : ${(error as Error).message}`);
    }
  }

  return (
    <>
      <section className="workspace-heading">
        <div>
          <p className="eyebrow">Espace vendeur · {tenant.name}</p>
          <h1>Pilotez le catalogue, du disque à l’annonce.</h1>
          <p>
            Sélectionnez une fiche puis suivez les trois étapes. Chaque action reste confinée à la
            boutique active.
          </p>
        </div>
        <div className="metric-row" aria-label="Résumé du catalogue">
          <Metric value={products.length} label="Fiches" />
          <Metric value={unitCount} label="Exemplaires" />
          <Metric
            value={products.filter((product) => product.discogsReleaseId).length}
            label="Releases liées"
          />
          <Metric value={publishedCount} label="En ligne" accent />
        </div>
      </section>

      <div className="seller-layout">
        <aside className="catalog-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Collection</p>
              <h2>Catalogue</h2>
            </div>
            <span className="count-pill">{products.length}</span>
          </div>

          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Rechercher un artiste, un titre…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          </label>

          <NewProductForm
            onCreate={(title, artist) =>
              run(async () => {
                const product = await api.createProduct(tenant.documentId, title, artist);
                setSelectedId(product.documentId);
              }, 'La fiche a été créée dans cette boutique.')
            }
          />

          <ul className="catalog-list">
            {filteredProducts.map((product) => (
              <li key={product.documentId}>
                <button
                  className={product.documentId === selectedId ? 'selected' : ''}
                  onClick={() => setSelectedId(product.documentId)}
                >
                  <img src={coverForProduct(product)} alt="" />
                  <span className="catalog-copy">
                    <strong>{product.title}</strong>
                    <span>{product.artist}</span>
                    <small>
                      {product.discogsReleaseId ? 'Release associée' : 'Release à associer'} ·{' '}
                      {product.sellableUnits?.length ?? 0} ex.
                    </small>
                  </span>
                  <i
                    className={product.discogsReleaseId ? 'catalog-state ready' : 'catalog-state'}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
            {!loading && filteredProducts.length === 0 && (
              <li className="empty-state">Aucune fiche ne correspond à votre recherche.</li>
            )}
          </ul>
        </aside>

        <main className="product-workspace">
          {feedback && (
            <div className="banner-info" role="status">
              {feedback}
            </div>
          )}
          {selected ? (
            <ProductDetail
              key={selected.documentId}
              tenant={tenant}
              product={selected}
              listings={listings}
              run={run}
            />
          ) : (
            <div className="empty-workspace">
              <span aria-hidden="true">◎</span>
              <h2>Sélectionnez une fiche</h2>
              <p>Le détail du workflow apparaîtra ici.</p>
            </div>
          )}
        </main>

        <aside className="activity-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">Journal mock</p>
              <h2>Activité Marketplace</h2>
            </div>
            <span className="live-dot" title="Synchronisé" />
          </div>
          <p className="panel-intro">
            Historique des publications et ventes simulées pour cette boutique uniquement.
          </p>
          <ul className="event-list">
            {events.map((event) => (
              <li key={event.documentId} className={`event event-${event.status}`}>
                <span className="event-icon" aria-hidden="true">
                  {event.status === 'success' ? '✓' : '!'}
                </span>
                <div>
                  <span className="event-action">{event.action.replaceAll('_', ' ')}</span>
                  <p>{event.message}</p>
                  <time>{new Date(event.happenedAt).toLocaleString('fr-FR')}</time>
                </div>
              </li>
            ))}
            {events.length === 0 && (
              <li className="empty-state">Les prochaines opérations apparaîtront ici.</li>
            )}
          </ul>
        </aside>
      </div>
    </>
  );
}

function Metric({
  value,
  label,
  accent = false,
}: {
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className={accent ? 'metric accent' : 'metric'}>
      <strong>{value.toString().padStart(2, '0')}</strong>
      <span>{label}</span>
    </div>
  );
}

function NewProductForm({ onCreate }: { onCreate: (title: string, artist: string) => void }) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!artist.trim() || !title.trim()) return;
    onCreate(title.trim(), artist.trim());
    setArtist('');
    setTitle('');
  }

  return (
    <details className="new-product">
      <summary>＋ Ajouter une fiche</summary>
      <form onSubmit={submit}>
        <label>
          Artiste
          <input value={artist} onChange={(event) => setArtist(event.target.value)} required />
        </label>
        <label>
          Titre
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <button className="primary" type="submit">
          Créer la fiche
        </button>
      </form>
    </details>
  );
}

function ProductDetail({
  tenant,
  product,
  listings,
  run,
}: {
  tenant: Tenant;
  product: Product;
  listings: Listing[];
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<void>;
}) {
  const [query, setQuery] = useState(`${product.artist} ${product.title}`);
  const [results, setResults] = useState<Release[] | null>(null);
  const [searching, setSearching] = useState(false);
  const units = product.sellableUnits ?? [];
  const productListings = useMemo(
    () =>
      new Map(
        listings
          .filter((listing) => listing.sellableUnit)
          .map((listing) => [listing.sellableUnit!.documentId, listing]),
      ),
    [listings],
  );

  async function search() {
    setSearching(true);
    try {
      const response = await api.searchDiscogs(tenant.documentId, query);
      setResults(response.results);
    } catch (error) {
      setResults([]);
      console.error(error);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <header className="product-hero">
        <div className="cover-frame">
          <img src={coverForProduct(product)} alt={`Pochette fictive de ${product.title}`} />
          <span aria-hidden="true" />
        </div>
        <div className="product-identity">
          <p className="eyebrow">Fiche catalogue</p>
          <h2>{product.title}</h2>
          <p className="artist-name">{product.artist}</p>
          <p className="metadata">
            {[product.label, product.year, product.country, product.format]
              .filter(Boolean)
              .join(' · ') || 'Métadonnées à enrichir via la release simulée'}
          </p>
          <div className="hero-statuses">
            <span className={product.discogsReleaseId ? 'status-chip linked' : 'status-chip'}>
              <i aria-hidden="true" />
              {product.discogsReleaseId
                ? `Release ${product.discogsReleaseId}`
                : 'Release non associée'}
            </span>
            <span className="status-chip neutral">{units.length} exemplaire(s)</span>
          </div>
        </div>
      </header>

      <div className="workflow-progress" aria-label="Progression du workflow">
        <WorkflowStep number="1" label="Release" complete={Boolean(product.discogsReleaseId)} />
        <span className="workflow-line" />
        <WorkflowStep number="2" label="Exemplaire" complete={units.length > 0} />
        <span className="workflow-line" />
        <WorkflowStep
          number="3"
          label="Publication"
          complete={units.some(
            (unit) => productListings.get(unit.documentId)?.status === 'published',
          )}
        />
      </div>

      <section className="workflow-card">
        <header>
          <span className="step-number">01</span>
          <div>
            <h3>Associer la release</h3>
            <p>Les résultats proviennent du connecteur local, sans aucun appel réseau.</p>
          </div>
          {product.discogsReleaseId && <span className="done-label">✓ Terminé</span>}
        </header>

        {product.discogsReleaseId ? (
          <div className="release-linked">
            <span className="release-symbol" aria-hidden="true">
              ◎
            </span>
            <div>
              <strong>Release mock #{product.discogsReleaseId}</strong>
              <span>Métadonnées catalogue synchronisées</span>
            </div>
          </div>
        ) : (
          <>
            <div className="search-row">
              <label>
                Recherche dans le catalogue simulé
                <input value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <button onClick={search} disabled={searching || !query.trim()}>
                {searching ? 'Recherche…' : 'Rechercher'}
              </button>
            </div>
            {results && (
              <ul className="release-results">
                {results.map((release) => (
                  <li key={release.releaseId}>
                    {release.thumbUrl ? (
                      <img src={release.thumbUrl} alt="" />
                    ) : (
                      <span className="release-placeholder" aria-hidden="true">
                        ◎
                      </span>
                    )}
                    <div>
                      <strong>
                        {release.artist} — {release.title}
                      </strong>
                      <span>
                        {[release.year, release.country, release.format, release.label]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        run(
                          () =>
                            api.attachRelease(
                              tenant.documentId,
                              product.documentId,
                              release.releaseId,
                            ),
                          `Release ${release.releaseId} associée.`,
                        )
                      }
                    >
                      Associer
                    </button>
                  </li>
                ))}
                {results.length === 0 && (
                  <li className="empty-state">Aucune release fictive ne correspond.</li>
                )}
              </ul>
            )}
          </>
        )}
      </section>

      <section className="workflow-card">
        <header>
          <span className="step-number">02</span>
          <div>
            <h3>Gérer les exemplaires</h3>
            <p>Le SKU est attribué par le backend et reste unique, même en concurrence.</p>
          </div>
          {units.length > 0 && <span className="done-label">✓ {units.length} en stock</span>}
        </header>

        <NewUnitForm
          onCreate={(input) =>
            run(
              () => api.createUnit(tenant.documentId, product.documentId, input),
              'Exemplaire créé avec un SKU unique.',
            )
          }
        />

        <ul className="unit-list">
          {units.map((unit) => (
            <UnitRow
              key={unit.documentId}
              tenant={tenant}
              unit={unit}
              listing={productListings.get(unit.documentId)}
              run={run}
            />
          ))}
          {units.length === 0 && (
            <li className="empty-state">Ajoutez un exemplaire pour préparer une annonce.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function WorkflowStep({
  number,
  label,
  complete,
}: {
  number: string;
  label: string;
  complete: boolean;
}) {
  return (
    <div className={complete ? 'workflow-step complete' : 'workflow-step'}>
      <span>{complete ? '✓' : number}</span>
      <strong>{label}</strong>
    </div>
  );
}

function NewUnitForm({
  onCreate,
}: {
  onCreate: (input: { price: number; mediaCondition: string; sleeveCondition: string }) => void;
}) {
  const [price, setPrice] = useState('34.99');
  const [media, setMedia] = useState('near_mint');
  const [sleeve, setSleeve] = useState('very_good_plus');

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number.parseFloat(price);
    if (Number.isNaN(value)) return;
    onCreate({ price: value, mediaCondition: media, sleeveCondition: sleeve });
  }

  return (
    <details className="unit-creator">
      <summary>＋ Ajouter un exemplaire</summary>
      <form onSubmit={submit}>
        <label>
          Prix TTC
          <span className="price-input">
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <span>€</span>
          </span>
        </label>
        <label>
          État du disque
          <select value={media} onChange={(event) => setMedia(event.target.value)}>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          État de la pochette
          <select value={sleeve} onChange={(event) => setSleeve(event.target.value)}>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary" type="submit">
          Créer l’exemplaire
        </button>
      </form>
    </details>
  );
}

function UnitRow({
  tenant,
  unit,
  listing,
  run,
}: {
  tenant: Tenant;
  unit: Unit;
  listing?: Listing;
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<void>;
}) {
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const isAvailable = unit.saleStatus === 'available';
  const isPublished = listing?.status === 'published';

  return (
    <li className="unit-card">
      <div className="unit-summary">
        <div>
          <span className="sku">{unit.sku}</span>
          <strong>
            {unit.price.toFixed(2)} <small>{unit.currency}</small>
          </strong>
        </div>
        <div className="condition-pair">
          <span>
            Disque <strong>{CONDITION_LABELS[unit.mediaCondition ?? ''] ?? '—'}</strong>
          </span>
          <span>
            Pochette <strong>{CONDITION_LABELS[unit.sleeveCondition ?? ''] ?? '—'}</strong>
          </span>
        </div>
        <div className="unit-state-group">
          <span className={`status-chip stock status-${unit.saleStatus}`}>
            Stock : {STATUS_LABELS[unit.saleStatus] ?? unit.saleStatus}
          </span>
          <span
            className={isPublished ? 'status-chip marketplace linked' : 'status-chip marketplace'}
          >
            Marketplace :{' '}
            {isPublished ? 'Publiée' : listing?.status === 'removed' ? 'Retirée' : 'Non publiée'}
          </span>
        </div>
      </div>

      {isAvailable && (
        <div className="unit-actions">
          <button
            onClick={async () => {
              try {
                const result = await api.checkCompleteness(tenant.documentId, unit.documentId);
                setCompleteness(result);
              } catch (error) {
                setCompleteness({
                  complete: false,
                  missing: [],
                  errors: [(error as Error).message],
                });
              }
            }}
          >
            Vérifier
          </button>
          <button
            className="primary"
            onClick={() =>
              run(
                () => api.publish(tenant.documentId, unit.documentId),
                isPublished ? 'Annonce synchronisée.' : 'Annonce publiée dans le mock.',
              )
            }
          >
            {isPublished ? 'Resynchroniser' : 'Publier l’annonce'} <span aria-hidden="true">→</span>
          </button>
        </div>
      )}

      {completeness && (
        <p className={completeness.complete ? 'check-result ok' : 'check-result error'}>
          {completeness.complete
            ? '✓ Cet exemplaire est prêt à être publié.'
            : `À compléter : ${[...completeness.missing, ...completeness.errors].join(', ')}`}
        </p>
      )}
    </li>
  );
}
