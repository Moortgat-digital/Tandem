-- 007_rename_tenants_to_organisations.sql
-- Renommage : tenant → organisation (terme plus neutre et sans ambiguïté avec
-- un "client" HTTP/navigateur dans le code).

-- Policies avec "tenant" dans le nom
ALTER POLICY tenants_select_own ON tenants RENAME TO organisations_select_own;
ALTER POLICY profiles_select_same_tenant ON profiles RENAME TO profiles_select_same_organisation;

-- Helper function
ALTER FUNCTION public.current_profile_tenant_id() RENAME TO current_profile_organisation_id;

-- CHECK constraint
ALTER TABLE profiles RENAME CONSTRAINT root_roles_have_no_tenant TO root_roles_have_no_organisation;

-- FK constraints
ALTER TABLE profiles RENAME CONSTRAINT profiles_tenant_id_fkey TO profiles_organisation_id_fkey;
ALTER TABLE sessions RENAME CONSTRAINT sessions_tenant_id_fkey TO sessions_organisation_id_fkey;
ALTER TABLE notification_logs RENAME CONSTRAINT notification_logs_tenant_id_fkey TO notification_logs_organisation_id_fkey;

-- Indexes
ALTER INDEX idx_tenants_slug RENAME TO idx_organisations_slug;
ALTER INDEX idx_profiles_tenant RENAME TO idx_profiles_organisation;
ALTER INDEX idx_sessions_tenant RENAME TO idx_sessions_organisation;
ALTER INDEX idx_notification_logs_tenant RENAME TO idx_notification_logs_organisation;

-- Columns
ALTER TABLE profiles RENAME COLUMN tenant_id TO organisation_id;
ALTER TABLE sessions RENAME COLUMN tenant_id TO organisation_id;
ALTER TABLE notification_logs RENAME COLUMN tenant_id TO organisation_id;

-- Table (last, so the renames above still use the old name)
ALTER TABLE tenants RENAME TO organisations;
