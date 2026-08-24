import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Tenant } from './types';
import { SellerView } from './SellerView';
import { BuyerView } from './BuyerView';

type Tab = 'seller' | 'buyer';

export default function App() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [mode, setMode] = useState<string>('');
  const [tab, setTab] = useState<Tab>('seller');
  const [error, setError] = useState<string | null>(null);
  // Incremente a chaque action pour rafraichir les listes des deux vues.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    Promise.all([api.getDemoTenant(), api.getMode()])
      .then(([t, m]) => {
        setTenant(t);
        setMode(m);
        if (!t) setError('Tenant de démo introuvable — le seed backend a-t-il tourné ?');
      })
      .catch(() =>
        setError('Backend injoignable sur http://localhost:1337 — lancer `npm run develop` dans backend/.')
      );
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-disc" aria-hidden />
          <div>
            <h1>Vinyl Backoffice</h1>
            {tenant && <p className="brand-tenant">Boutique : {tenant.name}</p>}
          </div>
        </div>
        <nav className="tabs">
          <button className={tab === 'seller' ? 'active' : ''} onClick={() => setTab('seller')}>
            Boutique (vendeur)
          </button>
          <button className={tab === 'buyer' ? 'active' : ''} onClick={() => setTab('buyer')}>
            Marketplace — simulation Discogs
          </button>
        </nav>
        {mode && (
          <span className={`mode-pill mode-${mode}`}>
            Discogs : mode {mode === 'mock' ? 'mock (sans réseau)' : 'API réelle'}
          </span>
        )}
      </header>

      {error && <div className="banner-error">{error}</div>}

      {tenant && tab === 'seller' && (
        <SellerView tenant={tenant} refreshKey={refreshKey} onChanged={refresh} />
      )}
      {tenant && tab === 'buyer' && (
        <BuyerView tenant={tenant} refreshKey={refreshKey} onChanged={refresh} />
      )}
    </div>
  );
}
