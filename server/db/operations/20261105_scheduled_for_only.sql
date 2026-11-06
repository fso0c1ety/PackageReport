-- PROPOSED ONLY. Requires verified recovery, live backend compatibility,
-- independent review, catalog-drift checks and explicit Production approval.
-- Existing Production has the other inspected 044 columns already.
-- No historical migration ledger entries are inserted by this operation.
ALTER TABLE public.automation_runs ADD COLUMN scheduled_for TIMESTAMPTZ;
