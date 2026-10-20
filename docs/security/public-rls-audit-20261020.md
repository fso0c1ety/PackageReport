# Smart Manage — audit i ekspozimit `public` dhe RLS

Statusi: **audit read-only / pa ndryshime Production**

Ky dokument nuk ekzekuton `GRANT`, `REVOKE`, `ALTER TABLE`, migrime ose SQL në
Production. Ai ndan inventarin e kandidatë-ve nga tabelat e konfirmuara në
catalog. Lista e Production me 29 tabela duhet të konfirmohet me snapshot
catalogu të marrë veçmas nga Supabase Dashboard/MCP.

## Përfundime të sigurta nga repository

- Migrimi 041 përcakton 11 tabela backend-only që duhet të mbrohen nga `anon`,
  `authenticated` dhe `PUBLIC`.
- Migrimi 042 përcakton 20 tabela të tjera backend-only.
- Këto janë 31 kandidatë repository; disa mund të mungojnë në një instalim të
  vjetër. Prandaj nuk supozohet se të gjitha 31 ekzistojnë në Production.
- Production ledger i raportuar deri në 035 do të thotë se 041/042 nuk trajtohen
  si të aplikuara. Ky audit nuk i aplikon ato.

## Prioriteti i rrezikut

| Rreziku | Tabela/fusha | Arsye | Veprimi i sigurt |
|---|---|---|---|
| Kritik | `password_reset_tokens`, `email_verification_tokens`, `account_activation_tokens`, `auth_sessions` | tokenë dhe sesione | backend-only; RLS + revoke vetëm pas reconciliation/backup |
| Kritik | `authentication_audit_events` | metadata e autentikimit/IP | backend-only; mos ekspozo në Data API |
| Lartë | `invoices`, `invoice_sequences`, `subscriptions` | financa dhe numërim | API server-only; ruaj transaksionet e invoice |
| Lartë | `professional_invitations`, `workspace_job_roles`, `board_member_access` | membership/ACL | backend-only; teste A↔B negative |
| Lartë | `platform_staff_roles`, `enterprise_audit_logs`, `file_audit_log` | privilegje administrative/audit | backend-only; pa grant publik |
| Mesëm | `portal_comments`, `portal_definitions`, `workspace_portal_overrides`, `workspace_modules` | portale dhe konfigurim tenant | server/API; verifiko vetëm endpoint-et e autorizuara |
| Mesëm | `marketplace_templates`, `marketplace_reviews`, `marketplace_reports` | marketplace | vendim sipas Data API; jo blanket grant |
| Mesëm | `calendar_events`, `trip_status_history`, `scheduler_locks`, `background_job_audit` | kalendar/jobs/logs | backend-only për jobs; calendar varet nga API contract |

## Varësitë e aplikacionit

- Login/reset: `src/app/api/reset-password`, `forgot-password`, `_lib/passwordReset.js`,
  `_lib/accountTokens.js`.
- Invoices: `src/app/api/invoices/**`, `_lib/invoiceRegistry.js`.
- Invitations/permissions: `professional-portal`, `portal-context`, table permission
  routes, `server/services/permissions.js`.
- Automations/jobs: `src/app/api/automation/**`, `server/jobs/scheduledAutomations.js`,
  `server/services/automation*`.
- Audit/notifications/portals: `src/app/api/audit`, `notifications`, `portal*`.

## Plani i sigurt i zbatimit

1. Merr catalog snapshot read-only për tabelat reale: `relrowsecurity`, owner,
   grants të `PUBLIC`/`anon`/`authenticated`, policies dhe ekspozimin Data API.
2. Krahaso snapshot-in me `docs/security/public-rls-audit-20261020.csv`.
3. Për backend-only: planifiko `ENABLE ROW LEVEL SECURITY`, `REVOKE ALL` nga
   rolet publike dhe ruaj vetëm rolin backend të autorizuar.
4. Për çdo tabelë client-accessible: policy specifike tenant/record, jo vetëm
   `TO authenticated`; për `UPDATE` kërkohen `USING` dhe `WITH CHECK`.
5. Testo anon/authenticated me SELECT/INSERT/UPDATE/DELETE dhe A↔B isolation në
   PostgreSQL të izoluar.
6. Vetëm pas reconciliation, backup dhe approval të veçantë mund të përgatitet
   migration additive. Ky branch nuk përmban migration SQL.

## Kufizime dhe rollback

- Pa ndryshim Production, pa SQL Production dhe pa ndryshim të ledger/checksum-eve.
- Ky branch ndryshon vetëm dokumentacionin dhe një checker read-only.
- Rollback i auditit: revert commit-et e dokumentacionit/checker-it; nuk prek skemën.
- Rreziku kryesor i mbetur: pa catalog snapshot zyrtar nuk mund të konfirmohet
  lista reale prej 29 tabelash, privilegjet efektive apo Data API exposure.

Vendimi: **BLOCKED për zbatim Production; READY për independent security review të
auditit read-only.**
