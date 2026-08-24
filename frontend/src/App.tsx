import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { api } from './api';
import type { Tenant } from './types';
import { SellerView } from './SellerView';
import { BuyerView } from './BuyerView';

type Tab = 'catalog' | 'marketplace';

const TAB_PATHS: Record<Tab, string> = {
  catalog: '/catalogue',
  marketplace: '/marketplace',
};

function tabFromPath(pathname: string): Tab {
  return pathname.replace(/\/+$/, '') === TAB_PATHS.marketplace ? 'marketplace' : 'catalog';
}

export default function App() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState('');
  const [mode, setMode] = useState('');
  const [tab, setTab] = useState<Tab>(() => tabFromPath(window.location.pathname));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Incremented after each action to refresh the lists in both views.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

  useEffect(() => {
    const syncTabWithHistory = () => setTab(tabFromPath(window.location.pathname));
    window.addEventListener('popstate', syncTabWithHistory);
    return () => window.removeEventListener('popstate', syncTabWithHistory);
  }, []);

  useEffect(() => {
    document.title = tab === 'catalog' ? 'Needle — Catalogue vendeur' : 'Needle — Marketplace';
  }, [tab]);

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
          setError(
            'Aucune boutique de démonstration disponible. Provisionnez les données avec `npm run demo:setup` dans backend/.',
          );
        }
      })
      .catch(() =>
        setError(
          import.meta.env.DEV
            ? 'Le backend est injoignable sur http://localhost:1337. Lancez `npm run develop` dans backend/.'
            : 'Le backend de démonstration est indisponible pour le moment. Réessayez dans quelques instants.',
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

  function navigate(event: MouseEvent<HTMLAnchorElement>, nextTab: Tab) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    const path = TAB_PATHS[nextTab];
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setTab(nextTab);
  }

  return (
    <div className={`app-shell theme-${tab}`}>
      <a className="skip-link" href="#main-content">
        Aller au contenu
      </a>
      <header className="topbar">
        <a
          className="brand"
          href={TAB_PATHS.catalog}
          aria-label="Needle — ouvrir le catalogue vendeur"
          onClick={(event) => navigate(event, 'catalog')}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>Needle</strong>
            <small>Vinyl operations</small>
          </span>
        </a>

        <nav className="tabs" aria-label="Sections principales">
          <a
            className={tab === 'catalog' ? 'active' : ''}
            href={TAB_PATHS.catalog}
            aria-current={tab === 'catalog' ? 'page' : undefined}
            onClick={(event) => navigate(event, 'catalog')}
          >
            <span aria-hidden="true">◫</span> Catalogue
          </a>
          <a
            className={tab === 'marketplace' ? 'active' : ''}
            href={TAB_PATHS.marketplace}
            aria-current={tab === 'marketplace' ? 'page' : undefined}
            onClick={(event) => navigate(event, 'marketplace')}
          >
            <span aria-hidden="true">◎</span> Marketplace
          </a>
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

      <main id="main-content" tabIndex={-1}>
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
