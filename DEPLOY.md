# Déploiement

## Supabase — déjà provisionné

| Champ | Valeur |
|---|---|
| Projet | `tandem-moortgat` |
| Référence | `foaqurlyckrfgeoimmui` |
| Région | `eu-west-3` (Paris) |
| URL | https://foaqurlyckrfgeoimmui.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/foaqurlyckrfgeoimmui |

Les 6 migrations (001 → 006) sont déjà appliquées. Vérifier dans Supabase Dashboard → Database → Migrations.

À récupérer manuellement dans Supabase Dashboard → Settings → API :
- `SUPABASE_SERVICE_ROLE_KEY` (clé secrète, ne jamais exposer côté client)

## Vercel — à finaliser

Le projet n'est pas encore créé côté Vercel. Deux chemins :

### Option A — Git integration (recommandé)
1. https://vercel.com/new → importer le repo `Moortgat-digital/Tandem`
2. Sélectionner la branche `claude/setup-tandem-app-52gir` (ou `main` après merge)
3. Framework auto-détecté : Next.js
4. Renseigner les variables d'environnement (cf. ci-dessous)
5. Deploy → URL fournie par Vercel

### Option B — CLI
```bash
npm i -g vercel
vercel login
vercel link            # crée le projet
vercel env add ...     # pour chaque variable
vercel --prod
```

## Variables d'environnement Vercel

| Clé | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://foaqurlyckrfgeoimmui.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` (secret) |
| `SUPABASE_PROJECT_ID` | `foaqurlyckrfgeoimmui` |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys |
| `EMAIL_FROM` | `tandem@moortgat.com` |
| `EMAIL_FROM_NAME` | `Tandem by Moortgat` |
| `NEXT_PUBLIC_APP_URL` | URL Vercel finale (ex. `https://tandem-moortgat.vercel.app`) |
| `ADMIN_EMAIL` | email de l'administrateur racine |

## Création du compte Admin (à faire avant tout)

Le compte Admin doit être créé manuellement avant de pouvoir utiliser l'app, car aucune page de signup publique n'existe (par design).

1. Supabase Dashboard → Authentication → Users → "Add user" → renseigner email + mot de passe
2. SQL Editor :
```sql
INSERT INTO public.profiles (id, role, first_name, last_name, email, tenant_id)
VALUES (
  '<uuid-de-auth-users>',
  'admin',
  'Prénom',
  'Nom',
  'admin@moortgat.com',
  NULL
);
```
3. Se connecter sur `/login` (sans slug)
