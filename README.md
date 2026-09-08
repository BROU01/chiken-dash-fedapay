# Chicken Crash

**Chicken Crash** est un jeu de type *crash* (façon Aviator) en **F CFA**, avec dépôt et retrait **Mobile Money** via **FedaPay**. Le résultat de chaque manche est calculé côté serveur selon un schéma provably-fair (commit-reveal HMAC-SHA256), pas simulé côté client.

> Jeu d'argent réel — réservé aux personnes majeures (18 ans et plus). L'exploitant est seul responsable d'obtenir les autorisations réglementaires nécessaires (licence de jeux d'argent en ligne) dans les pays où le service est proposé.

## Pages du site

| URL | Contenu |
|---|---|
| `/` | Landing page |
| `/register`, `/login` | Création de compte / connexion |
| `/game` | Le jeu : mise manuelle, encaissement manuel ou automatique |
| `/wallet` | Dépôt et retrait Mobile Money (FedaPay) |
| `/how-to-play` | Comment jouer |
| `/fairness` | Le modèle d'équité (graine serveur + HMAC-SHA256) |
| `/history` | Historique réel des mises du compte connecté |

## Architecture

- **Frontend** : React 19 + TypeScript + Vite 7, Tailwind CSS 4, `wouter` pour le routage.
- **Backend** : Express, monté à la fois comme process Node classique (`server/index.ts`, pour un hébergement type Railway/Fly/VPS) et comme fonction serverless Vercel (`api/[...path].ts`, même code applicatif).
- **Base de données** : Postgres (Neon recommandé) via Drizzle ORM (`db/schema.ts`) — le driver reste `pg` standard (compatible Neon, Supabase, Vercel Postgres ou toute instance Postgres classique) ; aucun runtime edge de ce projet ne parle directement à la base, donc pas besoin du driver HTTP/WebSocket `@neondatabase/serverless`. Migrations générées et versionnées via `drizzle-kit` (`db/migrations/`), inspectables avec Drizzle Studio (`pnpm db:studio`).
- **Paiement** : FedaPay (Mobile Money Afrique) pour les dépôts (Transactions API) et les retraits (Payouts API).
- **Jeu** : moteur "crash" server-authoritative (`server/game.ts`). Une seule manche partagée à la fois ; son état est recalculé à partir d'horodatages (pas de minuteur en mémoire), ce qui le rend compatible avec des fonctions serverless sans état. Le point de crash est dérivé de `HMAC-SHA256(graine_serveur, nonce)`, avec la graine engagée (son empreinte SHA-256) publiée avant l'ouverture des mises et révélée après le crash — vérifiable indépendamment.

### Limite connue

L'état de la manche est **interrogé par sondage** (polling HTTP toutes les 250 ms) plutôt que poussé en temps réel par WebSocket, pour rester compatible avec les fonctions serverless Vercel (sans connexion persistante). C'est fonctionnellement correct et suffisant pour un lancement, mais moins fluide qu'un flux WebSocket. Migrer vers un flux temps réel nécessiterait un petit service à état (ex. sur Fly.io/Railway) dédié au diffusion de l'état de la manche.

## Démarrage local

```bash
pnpm install
cp .env.example .env        # renseigner DATABASE_URL (Neon...), JWT_SECRET, FEDAPAY_*
pnpm db:migrate              # applique les migrations Drizzle à la base indiquée par DATABASE_URL
pnpm dev                     # Vite (port 3000) + API Express (port 8787, proxée par Vite)
pnpm db:studio               # explorer/éditer les données via Drizzle Studio
pnpm check                   # vérification TypeScript (tsc --noEmit)
pnpm build                   # build client (dist/public) + bundle serveur (dist/index.js)
```

Après une modification de `db/schema.ts`, régénérer une migration avec `pnpm db:generate` avant de rejouer `pnpm db:migrate`.

## Déploiement sur Vercel

1. Créer une base Postgres managée (Neon, Supabase, ou Vercel Postgres) et copier son `DATABASE_URL`.
2. Sur le projet Vercel, renseigner dans **Settings → Environment Variables** toutes les clés listées dans `.env.example` : `DATABASE_URL`, `JWT_SECRET`, `APP_BASE_URL` (l'URL Vercel du projet), `FEDAPAY_SECRET_KEY`, `FEDAPAY_ENVIRONMENT`, `FEDAPAY_WEBHOOK_SECRET`, `WITHDRAWAL_AUTO_APPROVE`.
3. Lancer `pnpm db:migrate` une fois (en local, avec `DATABASE_URL` pointé vers la base de production) pour créer les tables avant le premier déploiement.
4. Déployer (`vercel.json` définit déjà `buildCommand`, `outputDirectory` et la réécriture SPA). Les routes `/api/*` sont servies par `api/[...path].ts`, le reste par les fichiers statiques du build.
5. Dans le tableau de bord FedaPay, configurer le **webhook** vers `https://<votre-domaine>/api/wallet/webhooks/fedapay` et copier son secret de signature dans `FEDAPAY_WEBHOOK_SECRET`.

## FedaPay — ce qui est câblé, et ce qu'il faut vérifier avant le mode réel

- `server/fedapay.ts` implémente la création de transaction Mobile Money (dépôt), la génération du lien de paiement, la création de payout (retrait), et la vérification de signature de webhook (`X-FEDAPAY-SIGNATURE`, HMAC-SHA256).
- Cet environnement de développement n'a pas d'accès réseau sortant vers `docs.fedapay.com` ni vers l'API FedaPay elle-même : l'intégration a été écrite à partir de la documentation publique connue (endpoints, forme des requêtes) mais **n'a pas pu être testée contre un vrai compte FedaPay**. Avant le passage en `FEDAPAY_ENVIRONMENT=live` :
  - Testez le dépôt et le retrait en `sandbox` avec un vrai compte FedaPay.
  - Vérifiez le nom exact du header de signature et l'algorithme dans votre tableau de bord FedaPay / la documentation à jour, et ajustez `verifyWebhookSignature` si besoin.
  - Vérifiez les noms de champs (`customer`, `phone_number`, `mode`, etc.) contre une requête réelle réussie.
- **Retraits** : par défaut (`WITHDRAWAL_AUTO_APPROVE=false`), une demande de retrait débite immédiatement le portefeuille (fonds réservés) et reste en statut `pending` — l'appel réel à l'API Payouts FedaPay n'est déclenché qu'après validation manuelle (à construire côté opérateur : une interface d'administration, ou un script), ce qui est la pratique recommandée le temps de mettre en place un contrôle anti-blanchiment. Passez à `true` seulement une fois ce contrôle en place.

## Jeu responsable

- Inscription réservée aux 18 ans et plus (vérifié à l'inscription à partir de la date de naissance).
- La page `/wallet` est le point d'entrée prévu pour une limite de dépôt et une auto-exclusion (le champ `deposit_limit_daily` et `self_excluded_until` existent déjà dans le schéma ; l'UI de configuration est à compléter selon votre politique produit).
- Aucune fonctionnalité de mise automatique illimitée : l'encaissement automatique optionnel cible un seul multiplicateur par manche, pas une série de manches enchaînées sans intervention.

## Équité vérifiable

Pour chaque manche : une graine serveur est générée, son empreinte SHA-256 publiée avant l'ouverture des mises, puis le point de crash est dérivé par `HMAC-SHA256(graine, nonce)`. Une fois la manche terminée, la graine en clair est publiée : n'importe qui peut recalculer `sha256(graine)` pour vérifier l'engagement, et le HMAC pour vérifier le point de crash. Voir `/fairness` et `server/game.ts`.

## Stack technique

- React 19, TypeScript, Vite 7, Tailwind CSS 4, composants shadcn/Radix, icônes lucide-react.
- Express 5, Postgres (Neon) + Drizzle ORM, JWT (`jsonwebtoken`) + `bcryptjs` pour l'authentification.
- FedaPay pour les paiements Mobile Money.

## Licence

MIT
