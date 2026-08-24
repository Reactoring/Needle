import { useEffect, useState } from 'react';
import { api } from './api';
import { coverForProduct } from './demoCovers';
import type { Listing, Tenant } from './types';

interface Props {
  tenant: Tenant;
  refreshKey: number;
  onChanged: () => void;
}

// Buyer view: represents the simulated Discogs marketplace in the demo.
// The purchase button triggers the backend sale simulation.
export function BuyerView({ tenant, refreshKey, onChanged }: Props) {
  const [published, setPublished] = useState<Listing[]>([]);
  const [removed, setRemoved] = useState<Listing[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getListings(tenant.documentId, 'published'),
      api.getListings(tenant.documentId, 'removed'),
    ]).then(([publishedList, removedList]) => {
      if (!active) return;
      setPublished(publishedList);
      setRemoved(removedList);
    });
    return () => {
      active = false;
    };
  }, [tenant.documentId, refreshKey]);

  async function buy(listing: Listing) {
    if (!listing.sellableUnit) return;
    setMessage(null);
    setBusyId(listing.documentId);
    try {
      await api.simulateSale(tenant.documentId, listing.sellableUnit.documentId);
      setMessage(
        `Vente simulée : ${listing.sellableUnit.product?.artist} — ${listing.sellableUnit.product?.title}. Le stock et l’annonce ont été mis à jour atomiquement.`,
      );
      onChanged();
    } catch (error) {
      setMessage(`Erreur : ${(error as Error).message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="buyer-layout">
      <section className="marketplace-heading">
        <div>
          <p className="eyebrow">Vue acheteur simulée · {tenant.name}</p>
          <h1>Marketplace de démonstration</h1>
          <p>
            Testez le parcours de vente sans paiement, sans réseau et sans créer d’annonce réelle.
          </p>
        </div>
        <div className="market-stats">
          <span>
            <strong>{published.length}</strong> en vente
          </span>
          <span>
            <strong>{removed.length}</strong> vendues
          </span>
          <span className="mock-network">
            <i aria-hidden="true" /> Réseau désactivé
          </span>
        </div>
      </section>

      {message && (
        <div className="banner-info marketplace-feedback" role="status">
          <span aria-hidden="true">✓</span>
          {message}
        </div>
      )}

      <section className="market-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inventaire publié</p>
            <h2>Annonces disponibles</h2>
          </div>
          <span>{published.length} résultat(s)</span>
        </div>

        <div className="listing-grid">
          {published.map((listing) => {
            const unit = listing.sellableUnit;
            const product = unit?.product;
            return (
              <article key={listing.documentId} className="listing-card">
                <div className="listing-cover">
                  {product ? (
                    <img src={coverForProduct(product)} alt={`Pochette de ${product.title}`} />
                  ) : (
                    <span aria-hidden="true">◎</span>
                  )}
                  <span className="listing-channel">Mock Discogs</span>
                </div>
                <div className="listing-body">
                  <div className="listing-title">
                    <div>
                      <h3>{product?.title ?? 'Titre indisponible'}</h3>
                      <p>{product?.artist ?? 'Artiste indisponible'}</p>
                    </div>
                    <strong className="listing-price">
                      {listing.publishedPrice?.toFixed(2) ?? unit?.price.toFixed(2)}{' '}
                      <small>{unit?.currency ?? 'EUR'}</small>
                    </strong>
                  </div>
                  <p className="listing-meta">
                    {[product?.year, product?.country, product?.format, product?.label]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="listing-identifiers">
                    <span>SKU {unit?.sku ?? '—'}</span>
                    <span>{listing.externalListingId ?? 'Annonce locale'}</span>
                  </div>
                  <div className="listing-status-row">
                    <span className="status-chip stock status-available">Stock : disponible</span>
                    <span className="status-chip marketplace linked">Annonce : publiée</span>
                  </div>
                  <button
                    className="primary buy-button"
                    onClick={() => buy(listing)}
                    disabled={busyId === listing.documentId}
                  >
                    {busyId === listing.documentId ? 'Simulation en cours…' : 'Simuler l’achat'}
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })}
          {published.length === 0 && (
            <div className="market-empty">
              <span aria-hidden="true">◎</span>
              <h3>Aucune annonce publiée</h3>
              <p>Revenez au catalogue et publiez un exemplaire disponible.</p>
            </div>
          )}
        </div>
      </section>

      {removed.length > 0 && (
        <section className="market-section sold-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Historique local</p>
              <h2>Ventes simulées</h2>
            </div>
          </div>
          <ul className="sold-list">
            {removed.map((listing) => {
              const product = listing.sellableUnit?.product;
              return (
                <li key={listing.documentId}>
                  {product && <img src={coverForProduct(product)} alt="" />}
                  <span className="sold-copy">
                    <strong>{product?.title ?? 'Titre indisponible'}</strong>
                    <span>{product?.artist ?? 'Artiste indisponible'}</span>
                  </span>
                  <span className="sold-reference">
                    {listing.sellableUnit?.sku} · {listing.externalListingId}
                  </span>
                  <span className="status-chip status-sold">Stock : vendu</span>
                  <span className="status-chip marketplace">Annonce : retirée</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
