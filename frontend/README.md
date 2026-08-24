# Frontend React — Needle

Interface de démonstration du backoffice vinyle : deux boutiques isolées, catalogue illustré,
workflow vendeur en trois étapes et Marketplace simulée.

La documentation complète est disponible dans le
[`README.md` racine](../README.md).

## Commandes

```bash
npm install
npm run dev
npm run lint
npm run build
```

Copier [`.env.example`](.env.example) vers `.env` si l’API Strapi n’est pas disponible sur
`http://localhost:1337`.

Au chargement, l’application appelle `POST /api/demo/session`. Le backend place un cookie
HTTP-only puis authentifie toutes les requêtes métier. Le sélecteur **Boutique active**
permet de passer entre `Demo Records` et `Second Groove`.
