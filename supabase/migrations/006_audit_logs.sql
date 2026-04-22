-- 006_audit_logs.sql
-- Traçabilité : emails envoyés + interventions admin sur les rapports

CREATE TABLE notification_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
  sent_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,
  subject      TEXT NOT NULL,
  brevo_msg_id TEXT,
  sent_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id);

CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  tandem_pair_id  UUID REFERENCES tandem_pairs(id) ON DELETE SET NULL,
  action          TEXT NOT NULL CHECK (action IN (
    'edit_entry','delete_tandem','change_status','unlock_stage','edit_priority','edit_document'
  )),
  payload_before  JSONB,
  payload_after   JSONB,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_pair ON audit_logs(tandem_pair_id);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- notification_logs : admin voit tout, animateur voit ce qu'il a envoyé,
-- destinataire voit les emails reçus.
CREATE POLICY notification_logs_select_admin ON notification_logs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY notification_logs_select_sender ON notification_logs
  FOR SELECT TO authenticated
  USING (sent_by = auth.uid());

CREATE POLICY notification_logs_select_recipient ON notification_logs
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

-- audit_logs : admin seul (l'API y écrit via service_role).
CREATE POLICY audit_logs_select_admin ON audit_logs
  FOR SELECT TO authenticated
  USING (is_admin());
