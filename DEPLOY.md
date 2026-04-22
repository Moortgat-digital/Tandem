# Déploiement

## Supabase — déjà provisionné

| Champ | Valeur |
|---|---|
| Projet | `tandem-moortgat` |
| Référence | `foaqurlyckrfgeoimmui` |
| Région | `eu-west-3` (Paris) |
| URL | https://foaqurlyckrfgeoimmui.supabase.co |
| Dashboard | https://supabase.com/dashboard/project/foaqurlyckrfgeoimmui |

Les 7 migrations (001 → 007) sont appliquées. La 007 a renommé `tenants` en `organisations` et les colonnes associées.

À récupérer manuellement dans Supabase Dashboard → Settings → API Keys :
- `SUPABASE_SERVICE_ROLE_KEY` (clé secrète, ne jamais exposer côté client)

## Vercel

### Option A — Git integration (recommandé)
1. https://vercel.com/new → importer le repo `Moortgat-digital/Tandem`
2. Branche : `main`
3. Framework : **Next.js**
4. Renseigner les variables d'environnement (cf. ci-dessous)
5. Deploy

### Option B — CLI
```bash
npm i -g vercel
vercel login
vercel link
vercel env add ...
vercel --prod
```

## Variables d'environnement Vercel

| Clé | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://foaqurlyckrfgeoimmui.supabase.co |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API Keys → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API Keys → `service_role` (secret) |
| `SUPABASE_PROJECT_ID` | `foaqurlyckrfgeoimmui` |
| `BREVO_API_KEY` | Brevo → SMTP & API → API Keys |
| `EMAIL_FROM` | `tandem@moortgat.com` |
| `EMAIL_FROM_NAME` | `Tandem by Moortgat` |
| `NEXT_PUBLIC_APP_URL` | URL Vercel finale (ex. `https://tandem-moortgat.vercel.app`) |
| `ADMIN_EMAIL` | email de l'administrateur racine |

## Compte Admin

Le compte Admin est déjà créé (email : `moortgat.digital@moortgat.com`). Se connecter sur `/login` (sans slug).

Pour recréer un admin depuis zéro :
```sql
WITH new_user AS (
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
    'authenticated', 'authenticated',
    'admin@moortgat.com', crypt('MotDePasse', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
    '', '', '', ''
  )
  RETURNING id, email
)
INSERT INTO public.profiles (id, role, first_name, last_name, email, organisation_id, is_active)
SELECT id, 'admin', 'Prénom', 'Nom', email, NULL, true FROM new_user;
```
