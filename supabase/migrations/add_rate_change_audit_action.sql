-- Allow RATE_CHANGE as a valid action in audit_logs
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_check
  CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'SESSION_UPDATE', 'SETTLE', 'UNSETTLE', 'PAYMENT_CHECK', 'PAYMENT_UNCHECK', 'RATE_CHANGE'));
