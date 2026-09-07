# Chicken Crash

**Chicken Crash** est un prototype de jeu de type *crash* (façon Aviator) : un multiplicateur démarre à 1,00x et grimpe jusqu'à ce qu'il s'écrase. Le tout en **français**, avec un portefeuille en **F CFA** et un **pilote automatique** qui joue à votre place.

> Démo uniquement — aucun argent réel, aucun backend, aucun dépôt/retrait.

## Pages du site

| URL | Contenu |
|---|---|
| `/` | Landing page : hero, CTA vers le jeu, sections features |
| `/game` | Le jeu : courbe du multiplicateur, portefeuille F CFA, pilote auto |
| `/how-to-play` | Comment jouer, en trois gestes |
| `/fairness` | Le modèle d'équité (graine serveur + client, HMAC-SHA256) |
| `/history` | Journal des manches et statistiques |

## Le pilote automatique

Les manches se jouent **toutes seules**, sans aucune API d'IA externe — toute la logique est locale (TypeScript) :

1. Le pilote mise automatiquement le montant configuré (par défaut 500 F CFA).
2. Il se fixe une cible de sortie tirée au hasard, **jusqu'à 20x**.
3. Si la courbe atteint sa cible avant le crash, il encaisse ; sinon il perd la mise.

### Plafonds de crash par mode

| Mode | Plafond | Comportement |
|---|---|---|
| Standard | 20x | Distribution exponentielle classique, plafonnée |
| Portefeuille **Démo** | 7x | Les vols plafonnent à 7x |
| Mode **Argent réel** (simulé) | crash instantané | Chaque vol s'écrase au décollage (1,01x) — la mise est perdue |

## Stack technique

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS 4** + composants shadcn/Radix, icônes **lucide-react** (SVG)
- **wouter** pour le routage multi-pages
- Moteur de crash maison (`client/src/game/crashEngine.ts`) : formule inverse-uniforme `(1 - houseEdge) / (1 - u)`, échantillonnage par rejet pour respecter les plafonds
- Serveur Express minimal pour servir le build en production

## Démarrage

```bash
pnpm install
pnpm dev      # serveur de dev sur http://localhost:3000
pnpm check    # vérification TypeScript (tsc --noEmit)
pnpm build    # build client (dist/public) + bundle serveur (dist/index.js)
```

## Déploiement GitHub Pages

Le déploiement est automatisé via `.github/workflows/deploy.yml` : chaque push sur `main` construit le site (base `/chiken_dash/`) et le publie sur **https://brou01.github.io/chiken_dash/**. Un `404.html` (copie de `index.html`) permet au routeur client de gérer toutes les URLs.

## Équité

Le panneau « Équité vérifiable » présente le modèle d'interaction : graine serveur engagée avant la manche, graine client, résultat combiné via HMAC-SHA256. Dans ce prototype, le point de crash est tiré côté client — en production, la vérification s'effectuerait contre une manche signée côté serveur.

## Licence

MIT
