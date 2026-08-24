import { useEffect, useState } from 'react';
import { api } from './api';
import type { Listing, Tenant } from './types';

interface Props {
  tenant: Tenant;
  refreshKey: number;
  onChanged: () => void;
}

// Vue "acheteur" : joue le role de la marketplace Discogs dans la demo.
// Le bouton Acheter declenche la simulation de vente cote backend.
export function BuyerView({ tenant, refreshKey, onChanged }: Props) {
  const [published, setPublished] = useState<Listing[]>([]);
  const [removed, setRemoved] = useState<Listing[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api.getListings(tenant.documentId, 'published').then(setPublished);
    api.getListings(tenant.documentId, 'removed').then(setRemoved);
  }, [tenant.documentId, refreshKey]);

  async function buy(listing: Listing) {
    if (!listing.sellableUnit) return;
    setMessage(null);
    try {
      await api.simulateSale(tenant.documentId, listing.sellableUnit.documentId);
      setMessage(
        `Vente simulée : ${listing.sellableUnit.product?.artist} — ${listing.sellableUnit.product?.title} (${listing.externalListingId})`
      );
      onChanged();
    } catch (error) {
      setMessage(`Erreur : ${(error as Error).message}`);
    }
  }

  return (
    <div className="buyer-layout">
      <div className="marketplace-banner">
        Environnement de démonstration — aucune vraie annonce Discogs n'est créée ni vendue.
      </div>

      {message && <div className="banner-info">{message}</div>}

      <h2>Annonces en vente ({published.length})</h2>
      <div className="listing-grid">
        {published.map((listing) => {
          const unit = listing.sellableUnit;
          const product = unit?.product;
          return (
            <article key={listing.documentId} className="listing-card">
              <div className="cover" aria-hidden>
                <span className="disc" />
              </div>
              <h3>
                {product?.artist} — {product?.title}
              </h3>
              <p className="muted">
                {[product?.year, product?.country, product?.format, product?.label]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="muted">
                SKU {unit?.sku} · annonce {listing.externalListingId}
              </p>
              <div className="listing-footer">
                <strong>
                  {listing.publishedPrice?.toFixed(2)} {unit?.currency ?? 'EUR'}
                </strong>
                <button className="primary" onClick={() => buy(listing)}>
                  Acheter
                </button>
              </div>
            </article>
          );
        })}
        {published.length === 0 && (
          <p className="placeholder">
            Aucune annonce publiée. Publiez un exemplaire depuis la vue vendeur.
          </p>
        )}
      </div>

      {removed.length > 0 && (
        <>
          <h2>Vendus récemment</h2>
          <ul className="sold-list">
            {removed.map((listing) => (
              <li key={listing.documentId}>
                <span>
                  {listing.sellableUnit?.product?.artist} — {listing.sellableUnit?.product?.title}
                </span>
                <span className="muted">{listing.externalListingId}</span>
                <span className="tag status-sold">Vendu</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
