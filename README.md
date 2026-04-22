# Tandem by Moortgat

Application web SaaS multi-organisation de suivi collaboratif de formation.

Un collaborateur (N) et son manager (N+1) remplissent ensemble un document de suivi structuré à trois moments clés d'un parcours de formation.

## Stack

- **Framework** : Next.js 14 (App Router) + TypeScript strict
- **Backend / BDD** : Supabase (PostgreSQL + Auth + Realtime + RLS) — région `eu-west-3`
- **UI** : shadcn/ui + Tailwind CSS
- **Emails** : Brevo
- **Hébergement** : Vercel

## Démarrage

```bash
npm install
cp .env.example .env.local  # puis remplir les valeurs
npm run dev
```

## Structure

```
app/
  (root)/             # Admin + Animateur (sans slug)
  [organisation]/     # Espace organisation cliente (slug URL)
  api/
components/
  ui/                 # shadcn/ui
  tandem/             # Formulaire Tandem (grille 4×5, cellules, verrouillage)
  dashboard/          # Dashboards par rôle
  admin/              # Espace admin
  layout/             # Providers + Navbar + RoleGuard
lib/
  supabase/           # Clients browser + server
  brevo.ts            # Emails transactionnels
  organisation.ts     # Résolution organisation depuis slug
  tandem-workflow.ts  # Transitions d'état
  realtime-collab.ts  # Verrouillage par bloc Realtime
types/
  database.ts         # Types générés via `supabase gen types typescript`
  tandem.ts           # Types métier
supabase/migrations/  # Migrations SQL
middleware.ts         # Auth guard + résolution organisation
```

## Rôles

- **Administrateur** (racine) — gère organisations, sessions, utilisateurs, binômes
- **Animateur** (racine) — consulte, relance par email
- **Participant / N** (organisation) — remplit sa partie du formulaire
- **Manager / N+1** (organisation) — remplit sa partie, valide les étapes
- **Double-rôle N / N+1** — détecté dynamiquement via `/api/me/contexts`

## Règles absolues

- TypeScript strict, aucun `any`
- RLS obligatoire sur toutes les tables
- Pas d'email automatique à la validation d'une étape Tandem
- Verrouillage exclusif par cellule (pas "last write wins")
- Données hébergées en Europe

## Workflow Tandem

```
NOT_STARTED
  → IN_PROGRESS_RDV_INITIAL → VALIDATED_1
  → IN_PROGRESS_RDV_INTER   → VALIDATED_INTER (répétable)
  → IN_PROGRESS_RDV_FINAL   → COMPLETED
```

Aucun déclencheur automatique : les étapes avancent uniquement sur clic "Valider ce compte rendu".
