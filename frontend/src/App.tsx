import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { Tenant } from './types';
import { SellerView } from './SellerView';
import { BuyerView } from './BuyerView';

type Tab = 'catalog' | 'marketplace';

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [mode, setMode] = useState('');
  const [tab, setTab] = useState<Tab>('catalog');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Incremente a chaque action pour rafraichir les listes des deux vues.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    api
      .startDemoSession()
      .then((session) => {
        setTenants(session.tenants);
        setMode(session.mode);
        const preferred =
          session.tenants.find((candidate) => candidate.slug === 'demo-records') ??
          session.tenants[0];
        if (preferred) {
          setTenantId(preferred.documentId);
        } else {
          setError('Aucune boutique de démonstration disponible. Lancez le seed backend.');
        }
      })
      .catch(() =>
        setError(
          'Le backend est injoignable sur http://localhost:1337. Lancez `npm run develop` dans backend/.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const tenant = useMemo(
    () => tenants.find((candidate) => candidate.documentId === tenantId) ?? null,
    [tenantId, tenants],
  );

  function changeTenant(nextTenantId: string) {
    setTenantId(nextTenantId);
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="Aller au contenu">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>Needle</strong>
            <small>Vinyl operations</small>
          </span>
        </a>

        <nav className="tabs" aria-label="Sections principales">
          <button className={tab === 'catalog' ? 'active' : ''} onClick={() => setTab('catalog')}>
            <span aria-hidden="true">◫</span> Catalogue
          </button>
          <button
            className={tab === 'marketplace' ? 'active' : ''}
            onClick={() => setTab('marketplace')}
          >
            <span aria-hidden="true">◎</span> Marketplace
          </button>
        </nav>

        <div className="topbar-actions">
          <span className="connection-status">
            <i aria-hidden="true" /> Session active
          </span>
          <label className="tenant-picker">
            <span>Boutique active</span>
            <select
              value={tenantId}
              onChange={(event) => changeTenant(event.target.value)}
              disabled={loading || tenants.length === 0}
            >
              {tenants.map((candidate) => (
                <option key={candidate.documentId} value={candidate.documentId}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="demo-notice" role="note">
        <span className="demo-badge">Démo</span>
        <div>
          <strong>Session sans mot de passe</strong>
          <span>
            Données fictives isolées par boutique · actions Discogs entièrement simulées
            {mode ? ` · mode ${mode}` : ''}
          </span>
        </div>
        <span className="demo-tenant-count">{tenants.length || '—'} boutiques</span>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <main id="main-content">
        {loading && <div className="loading-state">Ouverture de la session de démonstration…</div>}
        {tenant && tab === 'catalog' && (
          <SellerView
            key={tenant.documentId}
            tenant={tenant}
            refreshKey={refreshKey}
            onChanged={refresh}
          />
        )}
        {tenant && tab === 'marketplace' && (
          <BuyerView
            key={tenant.documentId}
            tenant={tenant}
            refreshKey={refreshKey}
            onChanged={refresh}
          />
        )}
      </main>
    </div>
  );
}
