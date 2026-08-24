# Vinyl Backoffice — Strapi + Discogs

Backoffice multi-tenant de gestion de vinyles avec publication sur la marketplace Discogs (mode mock par défaut, mode API réel optionnel).

Tranche verticale réalisée dans le cadre du test technique : un type produit (`vinyl`), un canal (`discogs`), séparation fiche catalogue / unité vendable / listing marketplace, logs de synchronisation persistants.

## Stack

- **Backend** : Strapi 5 (TypeScript) + PostgreSQL — dossier [`backend/`](backend/)
- **Base de données** : PostgreSQL 16 (docker-compose fourni)

## Démarrage rapide

Prérequis : Node.js >= 20, Docker (pour PostgreSQL).

```bash
# 1. Base de données
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run develop
```

L'admin Strapi est disponible sur http://localhost:1337/admin (création du premier compte admin au premier lancement).

> Sans Docker : n'importe quel PostgreSQL 16 local fonctionne, il suffit d'aligner les variables `DATABASE_*` du `.env` du backend.

## Documentation

- Variables d'environnement : voir `backend/.env.example`
- Parcours de test complet : section [Parcours de test](#parcours-de-test) ci-dessous

## Parcours de test

_À compléter au fil du développement — voir les sections suivantes._
