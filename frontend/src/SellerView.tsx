import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from './api';
import type { Completeness, Product, Release, SyncEvent, Tenant, Unit } from './types';

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    api.getProducts(tenant.documentId).then((list) => {
      setProducts(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].documentId);
    });
    api.getEvents(tenant.documentId).then(setEvents);
  }, [tenant.documentId, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = products.find((p) => p.documentId === selectedId) ?? null;

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
    <div className="seller-layout">
      <aside className="panel product-list">
        <h2>Fiches catalogue</h2>
        <NewProductForm
          onCreate={(title, artist) =>
            run(async () => {
              const product = await api.createProduct(tenant.documentId, title, artist);
              setSelectedId(product.documentId);
            }, 'Fiche créée.')
          }
        />
        <ul>
          {products.map((product) => (
            <li key={product.documentId}>
              <button
                className={product.documentId === selectedId ? 'selected' : ''}
                onClick={() => setSelectedId(product.documentId)}
              >
                <strong>{product.artist}</strong>
                <span>{product.title}</span>
                {product.discogsReleaseId ? (
                  <span className="tag tag-linked">release {product.discogsReleaseId}</span>
                ) : (
                  <span className="tag">sans release</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="panel product-detail">
        {feedback && <div className="banner-info">{feedback}</div>}
        {selected ? (
          <ProductDetail key={selected.documentId} tenant={tenant} product={selected} run={run} />
        ) : (
          <p className="placeholder">Créez une fiche vinyle pour commencer.</p>
        )}
      </main>

      <aside className="panel timeline">
        <h2>Synchronisation Discogs</h2>
        <ul>
          {events.map((event) => (
            <li key={event.documentId} className={`event event-${event.status}`}>
              <span className="event-action">{event.action}</span>
              <p>{event.message}</p>
              <time>{new Date(event.happenedAt).toLocaleTimeString('fr-FR')}</time>
            </li>
          ))}
          {events.length === 0 && <p className="placeholder">Aucun événement pour l'instant.</p>}
        </ul>
      </aside>
    </div>
  );
}

function NewProductForm({ onCreate }: { onCreate: (title: string, artist: string) => void }) {
  const [artist, setArtist] = useState('');
  const [title, setTitle] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!artist.trim() || !title.trim()) return;
    onCreate(title.trim(), artist.trim());
    setArtist('');
    setTitle('');
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input placeholder="Artiste" value={artist} onChange={(e) => setArtist(e.target.value)} />
      <input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button type="submit">+ Fiche</button>
    </form>
  );
}

function ProductDetail({
  tenant,
  product,
  run,
}: {
  tenant: Tenant;
  product: Product;
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<void>;
}) {
  const [query, setQuery] = useState(`${product.artist} ${product.title}`);
  const [results, setResults] = useState<Release[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function search() {
    setSearching(true);
    try {
      const res = await api.searchDiscogs(tenant.documentId, query);
      setResults(res.results);
    } catch (error) {
      setResults([]);
      console.error(error);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <header className="detail-header">
        <h2>
          {product.artist} — {product.title}
        </h2>
        <p className="muted">
          {[product.label, product.year, product.country, product.format]
            .filter(Boolean)
            .join(' · ') || 'Fiche à compléter via Discogs'}
        </p>
      </header>

      <section>
        <h3>1 · Release Discogs</h3>
        {product.discogsReleaseId ? (
          <p className="linked-release">
            Release associée : <strong>{product.discogsReleaseId}</strong>
          </p>
        ) : (
          <>
            <div className="search-row">
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
              <button onClick={search} disabled={searching}>
                {searching ? 'Recherche…' : 'Chercher sur Discogs'}
              </button>
            </div>
            {results && (
              <ul className="release-results">
                {results.map((release) => (
                  <li key={release.releaseId}>
                    {release.thumbUrl && <img src={release.thumbUrl} alt="" />}
                    <div>
                      <strong>
                        {release.artist} — {release.title}
                      </strong>
                      <span className="muted">
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
                {results.length === 0 && <p className="placeholder">Aucun résultat.</p>}
              </ul>
            )}
          </>
        )}
      </section>

      <section>
        <h3>2 · Exemplaires en vente</h3>
        <NewUnitForm
          onCreate={(input) =>
            run(
              () => api.createUnit(tenant.documentId, product.documentId, input),
              'Exemplaire créé (SKU généré par le backend).',
            )
          }
        />
        <ul className="unit-list">
          {(product.sellableUnits ?? []).map((unit) => (
            <UnitRow key={unit.documentId} tenant={tenant} unit={unit} run={run} />
          ))}
          {(product.sellableUnits ?? []).length === 0 && (
            <p className="placeholder">Aucun exemplaire pour cette fiche.</p>
          )}
        </ul>
      </section>
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

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(price);
    if (Number.isNaN(value)) return;
    onCreate({ price: value, mediaCondition: media, sleeveCondition: sleeve });
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <input
        type="number"
        step="0.01"
        min="0"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        aria-label="Prix en euros"
      />
      <select value={media} onChange={(e) => setMedia(e.target.value)} aria-label="État disque">
        {Object.entries(CONDITION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            Disque : {label}
          </option>
        ))}
      </select>
      <select value={sleeve} onChange={(e) => setSleeve(e.target.value)} aria-label="État pochette">
        {Object.entries(CONDITION_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            Pochette : {label}
          </option>
        ))}
      </select>
      <button type="submit">+ Exemplaire</button>
    </form>
  );
}

function UnitRow({
  tenant,
  unit,
  run,
}: {
  tenant: Tenant;
  unit: Unit;
  run: (action: () => Promise<unknown>, successMessage?: string) => Promise<void>;
}) {
  const [completeness, setCompleteness] = useState<Completeness | null>(null);

  return (
    <li className="unit-row">
      <div className="unit-main">
        <code className="sku">{unit.sku}</code>
        <span>
          {unit.price.toFixed(2)} {unit.currency}
        </span>
        <span className="muted">
          {[
            CONDITION_LABELS[unit.mediaCondition ?? ''],
            CONDITION_LABELS[unit.sleeveCondition ?? ''],
          ]
            .filter(Boolean)
            .join(' / ')}
        </span>
        <span className={`tag status-${unit.saleStatus}`}>
          {STATUS_LABELS[unit.saleStatus] ?? unit.saleStatus}
        </span>
      </div>
      {unit.saleStatus === 'available' && (
        <div className="unit-actions">
          <button
            onClick={async () => {
              const result = await api.checkCompleteness(tenant.documentId, unit.documentId);
              setCompleteness(result);
            }}
          >
            Vérifier complétude
          </button>
          <button
            className="primary"
            onClick={() =>
              run(() => api.publish(tenant.documentId, unit.documentId), 'Publié sur Discogs.')
            }
          >
            Publier sur Discogs
          </button>
        </div>
      )}
      {completeness && (
        <p className={completeness.complete ? 'check-ok' : 'check-ko'}>
          {completeness.complete
            ? 'Prêt à publier sur Discogs.'
            : `Incomplet : ${[...completeness.missing, ...completeness.errors].join(', ')}`}
        </p>
      )}
    </li>
  );
}
