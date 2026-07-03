-- Persist the board document/editor content used by the table autosave API.
ALTER TABLE tables
  ADD COLUMN IF NOT EXISTS doc_content TEXT DEFAULT '';
