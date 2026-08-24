import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
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

const EVENT_LABELS: Record<string, string> = {
  search_release: 'Recherche de release',
  attach_release: 'Release associée',
  check_completeness: 'Complétude vérifiée',
  publish_listing: 'Annonce publiée',
  simulate_sale: 'Vente simulée',
  mark_out_of_stock: 'Stock mis à jour',
};

const euro = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

type CatalogFilter = 'all' | 'incomplete' | 'available' | 'published' | 'sold';
type CatalogSort = 'recent' | 'title' | 'price';

interface Props {
  tenant: Tenant;
  refreshKey: number;
  onChanged: () => void;
}

interface ProductOverview {
  units: Unit[];
  available: number;
  sold: number;
  published: number;
  price: number | null;
  incomplete: boolean;
}

interface Feedback {
  message: string;
  tone: 'success' | 'error';
}

type RunAction = (action: () => Promise<unknown>, successMessage: string) => Promise<boolean>;

function productOverview(product: Product, listingByUnit: Map<string, Listing>): ProductOverview {
  const units = product.sellableUnits ?? [];
  const prices = units.map((unit) => unit.price);
  return {
    units,
    available: units.filter((unit) => unit.saleStatus === 'available').length,
    sold: units.filter((unit) => unit.saleStatus === 'sold').length,
    published: units.filter((unit) => listingByUnit.get(unit.documentId)?.status === 'published')
      .length,
    price: prices.length > 0 ? Math.min(...prices) : null,
    incomplete: !product.discogsReleaseId || units.length === 0,
  };
}

export function SellerView({ tenant, refreshKey, onChanged }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<SyncEvent[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [sort, setSort] = useState<CatalogSort>('recent');
  const [createOpen, setCreateOpen] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
      })
      .catch((error) => {
        if (active) {
          setFeedback({
            message: `Chargement impossible : ${(error as Error).message}`,
            tone: 'error',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenant.documentId, refreshKey]);

  const listingByUnit = useMemo(
    () =>
      new Map(
        listings
          .filter((listing) => listing.sellableUnit)
          .map((listing) => [listing.sellableUnit!.documentId, listing]),
      ),
    [listings],
  );

  const counts = useMemo(() => {
    const overviews = products.map((product) => productOverview(product, listingByUnit));
    return {
      available: overviews.reduce((total, item) => total + item.available, 0),
      published: overviews.reduce((total, item) => total + item.published, 0),
      sold: overviews.reduce((total, item) => total + item.sold, 0),
      incomplete: overviews.filter((item) => item.incomplete).length,
    };
  }, [products, listingByUnit]);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr-FR');
    const filtered = products.filter((product) => {
      const overview = productOverview(product, listingByUnit);
      const matchesQuery = `${product.artist} ${product.title} ${product.label ?? ''}`
        .toLocaleLowerCase('fr-FR')
        .includes(normalizedQuery);
      if (!matchesQuery) return false;

      if (filter === 'incomplete') return overview.incomplete;
      if (filter === 'available') return overview.available > 0;
      if (filter === 'published') return overview.published > 0;
      if (filter === 'sold') return overview.sold > 0;
      return true;
    });

    if (sort === 'title') {
      return [...filtered].sort((a, b) =>
        `${a.artist} ${a.title}`.localeCompare(`${b.artist} ${b.title}`, 'fr'),
      );
    }
    if (sort === 'price') {
      return [...filtered].sort(
        (a, b) =>
          (productOverview(a, listingByUnit).price ?? Number.MAX_VALUE) -
          (productOverview(b, listingByUnit).price ?? Number.MAX_VALUE),
      );
    }
    return filtered;
  }, [filter, listingByUnit, products, query, sort]);

  const selected = products.find((product) => product.documentId === selectedId) ?? null;

  const run: RunAction = async (action, successMessage) => {
    setFeedback(null);
    try {
      await action();
      setFeedback({ message: successMessage, tone: 'success' });
      onChanged();
      return true;
    } catch (error) {
      setFeedback({ message: `Erreur : ${(error as Error).message}`, tone: 'error' });
      return false;
    }
  };

  async function createProduct(title: string, artist: string): Promise<boolean> {
    setFeedback(null);
    try {
      const product = await api.createProduct(tenant.documentId, title, artist);
      setSelectedId(product.documentId);
      setCreateOpen(false);
      setFeedback({
        message: 'La nouvelle fiche a été ajoutée au catalogue.',
        tone: 'success',
      });
      onChanged();
      return true;
    } catch (error) {
      setFeedback({ message: `Erreur : ${(error as Error).message}`, tone: 'error' });
      return false;
    }
  }

  return (
    <div className="seller-dashboard">
      {feedback && (
        <div className={`dashboard-toast ${feedback.tone}`} role="status">
          <span aria-hidden="true">{feedback.tone === 'success' ? '✓' : '!'}</span>
          <p>{feedback.message}</p>
          <button onClick={() => setFeedback(null)} aria-label="Fermer le message">
            ×
          </button>
        </div>
      )}

      <header className="seller-dashboard-header">
        <div>
          <p className="seller-breadcrumb">Pilotage / {tenant.name}</p>
          <h1>Catalogue vendeur</h1>
          <p>Suivez votre stock et vos annonces depuis une seule vue.</p>
        </div>
        <button className="seller-primary-button" onClick={() => setCreateOpen(true)}>
          <span aria-hidden="true">＋</span> Ajouter un vinyle
        </button>
      </header>

      <section className="seller-kpi-grid" aria-label="Indicateurs de la boutique">
        <DashboardMetric
          label="Fiches catalogue"
          value={products.length}
          detail={`${counts.incomplete} à compléter`}
          icon="▤"
          tone="blue"
        />
        <DashboardMetric
          label="Disponibles"
          value={counts.available}
          detail="exemplaires en stock"
          icon="◫"
          tone="green"
        />
        <DashboardMetric
          label="Annonces publiées"
          value={counts.published}
          detail="sur la marketplace mock"
          icon="↗"
          tone="violet"
        />
        <DashboardMetric
          label="Ventes simulées"
          value={counts.sold}
          detail="exemplaires vendus"
          icon="✓"
          tone="orange"
        />
      </section>

      <div className="seller-dashboard-layout">
        <section className="seller-catalog-card">
          <header className="seller-card-header">
            <div>
              <h2>Produits</h2>
              <p>{visibleProducts.length} fiche(s) affichée(s)</p>
            </div>
            <label className="seller-sort">
              <span>Trier par</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}>
                <option value="recent">Plus récents</option>
                <option value="title">Artiste et titre</option>
                <option value="price">Prix croissant</option>
              </select>
            </label>
          </header>

          <div className="seller-catalog-tools">
            <label className="seller-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Rechercher un artiste, un titre ou un label"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="seller-filter-tabs" role="group" aria-label="Filtrer le catalogue">
              <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
                Tous <span>{products.length}</span>
              </FilterButton>
              <FilterButton
                active={filter === 'incomplete'}
                onClick={() => setFilter('incomplete')}
              >
                À compléter <span>{counts.incomplete}</span>
              </FilterButton>
              <FilterButton active={filter === 'available'} onClick={() => setFilter('available')}>
                Disponibles
              </FilterButton>
              <FilterButton active={filter === 'published'} onClick={() => setFilter('published')}>
                Publiés
              </FilterButton>
              <FilterButton active={filter === 'sold'} onClick={() => setFilter('sold')}>
                Vendus
              </FilterButton>
            </div>
          </div>

          <div className="seller-table-wrap">
            <table className="seller-product-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Release</th>
                  <th>Stock</th>
                  <th>Prix</th>
                  <th>Marketplace</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const overview = productOverview(product, listingByUnit);
                  const marketplaceStatus = overview.published
                    ? 'Publié'
                    : overview.sold
                      ? 'Retiré'
                      : 'Non publié';
                  return (
                    <tr key={product.documentId}>
                      <td>
                        <div className="seller-product-cell">
                          <img src={coverForProduct(product)} alt="" />
                          <span>
                            <strong>{product.title}</strong>
                            <span>{product.artist}</span>
                            <small>
                              {[product.label, product.year].filter(Boolean).join(' · ') ||
                                'Métadonnées à compléter'}
                            </small>
                          </span>
                        </div>
                      </td>
                      <td data-label="Release">
                        <BackofficeBadge tone={product.discogsReleaseId ? 'success' : 'warning'}>
                          {product.discogsReleaseId ? 'Associée' : 'À associer'}
                        </BackofficeBadge>
                      </td>
                      <td data-label="Stock">
                        <strong className="seller-stock-value">{overview.available}</strong>
                        <span className="seller-cell-caption">
                          disponible{overview.available > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td data-label="Prix">
                        <strong className="seller-price">
                          {overview.price === null ? '—' : euro.format(overview.price)}
                        </strong>
                      </td>
                      <td data-label="Marketplace">
                        <BackofficeBadge
                          tone={
                            marketplaceStatus === 'Publié'
                              ? 'info'
                              : marketplaceStatus === 'Retiré'
                                ? 'neutral'
                                : 'default'
                          }
                        >
                          {marketplaceStatus}
                        </BackofficeBadge>
                      </td>
                      <td>
                        <button
                          className="seller-manage-button"
                          onClick={() => setSelectedId(product.documentId)}
                        >
                          Gérer <span aria-hidden="true">›</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!loading && visibleProducts.length === 0 && (
              <div className="seller-empty-state">
                <span aria-hidden="true">⌕</span>
                <h3>Aucun produit trouvé</h3>
                <p>Modifiez les filtres ou ajoutez une nouvelle fiche.</p>
              </div>
            )}
          </div>

          <footer className="seller-table-footer">
            <span>
              {visibleProducts.length} sur {products.length} produits
            </span>
            <span>Données de {tenant.name}</span>
          </footer>
        </section>

        <aside className="seller-activity-card">
          <header>
            <div>
              <h2>Activité récente</h2>
              <p>Marketplace simulée</p>
            </div>
            <span className="seller-live-status">
              <i aria-hidden="true" /> Live
            </span>
          </header>

          <ul className="seller-activity-list">
            {events.slice(0, showAllEvents ? 20 : 6).map((event) => (
              <li key={event.documentId}>
                <span className={`seller-event-icon ${event.status}`} aria-hidden="true">
                  {event.status === 'success' ? '✓' : '!'}
                </span>
                <div>
                  <strong>{EVENT_LABELS[event.action] ?? event.action.replaceAll('_', ' ')}</strong>
                  <p>{event.message}</p>
                  <time>
                    {new Date(event.happenedAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </div>
              </li>
            ))}
            {events.length === 0 && <li className="seller-activity-empty">Aucune activité.</li>}
          </ul>

          {events.length > 6 && (
            <button
              className="seller-activity-more"
              onClick={() => setShowAllEvents((current) => !current)}
            >
              {showAllEvents ? 'Réduire l’historique' : 'Voir tout l’historique'}
            </button>
          )}

          <div className="seller-demo-health">
            <span className="seller-health-icon" aria-hidden="true">
              ◈
            </span>
            <div>
              <strong>Environnement sécurisé</strong>
              <p>Session démo · mock sans réseau · tenant isolé</p>
            </div>
          </div>
        </aside>
      </div>

      {selected && (
        <ProductDrawer
          tenant={tenant}
          product={selected}
          listingByUnit={listingByUnit}
          run={run}
          onClose={() => setSelectedId(null)}
        />
      )}

      {createOpen && (
        <CreateProductDrawer onClose={() => setCreateOpen(false)} onCreate={createProduct} />
      )}
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: string;
  tone: string;
}) {
  return (
    <article className="seller-kpi-card">
      <span className={`seller-kpi-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {children}
    </button>
  );
}

function BackofficeBadge({
  tone,
  children,
}: {
  tone: 'success' | 'warning' | 'info' | 'neutral' | 'default';
  children: ReactNode;
}) {
  return <span className={`backoffice-badge ${tone}`}>{children}</span>;
}

function DrawerShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="seller-drawer-layer">
      <button className="seller-drawer-backdrop" onClick={onClose} aria-label="Fermer le panneau" />
      <aside className="seller-drawer" aria-label={title}>
        <header className="seller-drawer-topbar">
          <div>
            <span>{eyebrow}</span>
            <strong>{title}</strong>
          </div>
          <button onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

function CreateProductDrawer({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, artist: string) => Promise<boolean>;
}) {
  return (
    <DrawerShell title="Ajouter un vinyle" eyebrow="Nouvelle fiche" onClose={onClose}>
      <div className="seller-drawer-content">
        <div className="seller-drawer-intro">
          <span aria-hidden="true">＋</span>
          <h2>Créer une fiche catalogue</h2>
          <p>
            Commencez avec l’artiste et le titre. La release et les exemplaires seront ajoutés
            ensuite.
          </p>
        </div>
        <NewProductForm onCreate={onCreate} onCancel={onClose} />
      </div>
    </DrawerShell>
  );
}

function NewProductForm({
  onCreate,
  onCancel,
}: {
  onCreate: (title: string, artist: string) => Promise<boolean>;
  onCancel: () => void;
}) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!artist.trim() || !title.trim()) return;
    setPending(true);
    try {
      await onCreate(title.trim(), artist.trim());
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="seller-form" onSubmit={submit}>
      <label>
        Artiste
        <input
          value={artist}
          onChange={(event) => setArtist(event.target.value)}
          placeholder="Ex. Neon Meridian"
          required
          autoFocus
        />
      </label>
      <label>
        Titre
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ex. Night Transit"
          required
        />
      </label>
      <div className="seller-form-actions">
        <button type="button" onClick={onCancel}>
          Annuler
        </button>
        <button className="seller-primary-button" type="submit" disabled={pending}>
          {pending ? 'Création…' : 'Créer la fiche'}
        </button>
      </div>
    </form>
  );
}

function ProductDrawer({
  tenant,
  product,
  listingByUnit,
  run,
  onClose,
}: {
  tenant: Tenant;
  product: Product;
  listingByUnit: Map<string, Listing>;
  run: RunAction;
  onClose: () => void;
}) {
  const [releaseQuery, setReleaseQuery] = useState(`${product.artist} ${product.title}`);
  const [results, setResults] = useState<Release[] | null>(null);
  const [searching, setSearching] = useState(false);
  const units = product.sellableUnits ?? [];

  async function searchRelease() {
    setSearching(true);
    try {
      const response = await api.searchDiscogs(tenant.documentId, releaseQuery);
      setResults(response.results);
    } finally {
      setSearching(false);
    }
  }

  return (
    <DrawerShell title={product.title} eyebrow="Gestion du produit" onClose={onClose}>
      <div className="seller-drawer-content">
        <section className="seller-drawer-product">
          <img src={coverForProduct(product)} alt={`Pochette fictive de ${product.title}`} />
          <div>
            <h2>{product.title}</h2>
            <p>{product.artist}</p>
            <span>
              {[product.label, product.year, product.format].filter(Boolean).join(' · ') ||
                'Fiche récemment créée'}
            </span>
          </div>
        </section>

        <DrawerSection
          number="1"
          title="Release"
          description="Associer les métadonnées du catalogue mock"
          complete={Boolean(product.discogsReleaseId)}
        >
          {product.discogsReleaseId ? (
            <div className="seller-linked-release">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>Release #{product.discogsReleaseId}</strong>
                <p>Les métadonnées sont associées à cette fiche.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="seller-release-search">
                <input
                  value={releaseQuery}
                  onChange={(event) => setReleaseQuery(event.target.value)}
                  aria-label="Recherche de release"
                />
                <button onClick={searchRelease} disabled={searching || !releaseQuery.trim()}>
                  {searching ? 'Recherche…' : 'Rechercher'}
                </button>
              </div>
              {results && (
                <ul className="seller-release-results">
                  {results.map((release) => (
                    <li key={release.releaseId}>
                      <span className="seller-release-disc" aria-hidden="true">
                        ◎
                      </span>
                      <div>
                        <strong>
                          {release.artist} — {release.title}
                        </strong>
                        <p>
                          {[release.year, release.country, release.format, release.label]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
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
                  {results.length === 0 && <li className="seller-drawer-empty">Aucun résultat.</li>}
                </ul>
              )}
            </>
          )}
        </DrawerSection>

        <DrawerSection
          number="2"
          title="Exemplaires"
          description="Prix, grading et disponibilité du stock"
          complete={units.length > 0}
        >
          <NewUnitForm
            onCreate={(input) =>
              run(
                () => api.createUnit(tenant.documentId, product.documentId, input),
                'Exemplaire créé avec un SKU unique.',
              )
            }
          />
          <ul className="seller-drawer-units">
            {units.map((unit) => (
              <UnitCard
                key={unit.documentId}
                tenant={tenant}
                unit={unit}
                listing={listingByUnit.get(unit.documentId)}
                run={run}
              />
            ))}
            {units.length === 0 && (
              <li className="seller-drawer-empty">
                Aucun exemplaire. Ajoutez le premier pour préparer une annonce.
              </li>
            )}
          </ul>
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}

function DrawerSection({
  number,
  title,
  description,
  complete,
  children,
}: {
  number: string;
  title: string;
  description: string;
  complete: boolean;
  children: ReactNode;
}) {
  return (
    <section className="seller-drawer-section">
      <header>
        <span className={complete ? 'complete' : ''}>{complete ? '✓' : number}</span>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <BackofficeBadge tone={complete ? 'success' : 'warning'}>
          {complete ? 'Terminé' : 'À faire'}
        </BackofficeBadge>
      </header>
      <div className="seller-drawer-section-body">{children}</div>
    </section>
  );
}

function NewUnitForm({
  onCreate,
}: {
  onCreate: (input: {
    price: number;
    mediaCondition: string;
    sleeveCondition: string;
  }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState('34.99');
  const [media, setMedia] = useState('near_mint');
  const [sleeve, setSleeve] = useState('very_good_plus');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number.parseFloat(price);
    if (Number.isNaN(value)) return;
    setPending(true);
    try {
      const created = await onCreate({
        price: value,
        mediaCondition: media,
        sleeveCondition: sleeve,
      });
      if (created) setOpen(false);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button className="seller-add-unit-button" onClick={() => setOpen(true)}>
        ＋ Ajouter un exemplaire
      </button>
    );
  }

  return (
    <form className="seller-unit-form" onSubmit={submit}>
      <label>
        Prix
        <input
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
        />
      </label>
      <label>
        Disque
        <select value={media} onChange={(event) => setMedia(event.target.value)}>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Pochette
        <select value={sleeve} onChange={(event) => setSleeve(event.target.value)}>
          {Object.entries(CONDITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="seller-unit-form-actions">
        <button type="button" onClick={() => setOpen(false)}>
          Annuler
        </button>
        <button className="seller-primary-button" type="submit" disabled={pending}>
          {pending ? 'Ajout…' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}

function UnitCard({
  tenant,
  unit,
  listing,
  run,
}: {
  tenant: Tenant;
  unit: Unit;
  listing?: Listing;
  run: RunAction;
}) {
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [checking, setChecking] = useState(false);
  const isAvailable = unit.saleStatus === 'available';
  const isPublished = listing?.status === 'published';

  async function checkCompleteness() {
    setChecking(true);
    try {
      setCompleteness(await api.checkCompleteness(tenant.documentId, unit.documentId));
    } catch (error) {
      setCompleteness({
        complete: false,
        missing: [],
        errors: [(error as Error).message],
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <li className="seller-unit-card">
      <header>
        <div>
          <code>{unit.sku}</code>
          <strong>{euro.format(unit.price)}</strong>
        </div>
        <BackofficeBadge
          tone={
            unit.saleStatus === 'available'
              ? 'success'
              : unit.saleStatus === 'reserved'
                ? 'warning'
                : 'neutral'
          }
        >
          {STATUS_LABELS[unit.saleStatus] ?? unit.saleStatus}
        </BackofficeBadge>
      </header>
      <div className="seller-unit-details">
        <span>
          Disque <strong>{CONDITION_LABELS[unit.mediaCondition ?? ''] ?? '—'}</strong>
        </span>
        <span>
          Pochette <strong>{CONDITION_LABELS[unit.sleeveCondition ?? ''] ?? '—'}</strong>
        </span>
        <span>
          Annonce <strong>{isPublished ? 'Publiée' : listing ? 'Retirée' : 'Absente'}</strong>
        </span>
      </div>
      {isAvailable && (
        <div className="seller-unit-actions">
          <button onClick={checkCompleteness} disabled={checking}>
            {checking ? 'Vérification…' : 'Vérifier'}
          </button>
          <button
            className="seller-primary-button"
            onClick={() =>
              run(
                () => api.publish(tenant.documentId, unit.documentId),
                isPublished
                  ? 'Annonce resynchronisée.'
                  : 'Annonce publiée sur la marketplace mock.',
              )
            }
          >
            {isPublished ? 'Resynchroniser' : 'Publier'}
          </button>
        </div>
      )}
      {completeness && (
        <p
          className={
            completeness.complete ? 'seller-check-result success' : 'seller-check-result error'
          }
        >
          {completeness.complete
            ? '✓ Prêt à publier'
            : `À compléter : ${[...completeness.missing, ...completeness.errors].join(', ')}`}
        </p>
      )}
    </li>
  );
}
