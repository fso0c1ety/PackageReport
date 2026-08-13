CREATE TABLE IF NOT EXISTS invoice_sequences (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, invoice_year)
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  client_id TEXT,
  client_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total NUMERIC(18,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SENT','PAID','OVERDUE','CANCELLED')),
  notes TEXT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  pdf_file_id TEXT REFERENCES uploaded_files(id) ON DELETE SET NULL,
  created_by TEXT NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS invoices_workspace_created_idx ON invoices(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS invoices_workspace_status_idx ON invoices(workspace_id, status);
CREATE INDEX IF NOT EXISTS invoices_workspace_client_idx ON invoices(workspace_id, client_id);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices(workspace_id, due_date) WHERE status IN ('DRAFT','SENT');
