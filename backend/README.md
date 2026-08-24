# Backend Strapi — Needle

API Strapi 5 de la démo vinyle multi-tenant. La documentation complète, notamment la session
sans mot de passe et les règles de seed local/production, se trouve dans le
[`README.md` racine](../README.md).

## Commandes

```bash
npm install
npm run develop       # serveur local avec auto-reload
npm run demo:setup    # crée les deux tenants sans duplication
npm run demo:reset    # restaure les deux tenants de démo
npm test              # tests unitaires
npm run e2e           # scénario contre un backend démarré
npm run lint
npx tsc --noEmit
```

Le backend requiert PostgreSQL. Copier [`.env.example`](.env.example) vers `.env` et
remplacer tous les secrets avant un déploiement.

En développement, le seed est automatique sauf avec `DEMO_AUTO_SEED=false`. En production,
il ne se lance jamais automatiquement ; utiliser explicitement `npm run demo:setup`.

Le connecteur Marketplace accepte uniquement `DISCOGS_MODE=mock` et n’effectue aucun appel
réseau vers Discogs.
