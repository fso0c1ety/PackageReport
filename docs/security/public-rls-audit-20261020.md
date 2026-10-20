# Smart Manage — audit i ekspozimit `public` dhe RLS

Statusi: **audit read-only / pa ndryshime Production**

Ky dokument nuk ekzekuton `GRANT`, `REVOKE`, `ALTER TABLE`, migrime ose SQL në
Production. Katalogu read-only i verifikuar raporton **31 tabela aktive**:
**29 me RLS disabled + 2 me RLS enabled por pa politika**.

## Përfundime të sigurta nga repository

- Migrimi 041 përcakton 11 tabela që kërkojnë kontroll të veçantë të aksesit;
  klasifikimi backend-only/client-accessible bëhet sipas varësisë reale të API-së,
  jo vetëm nga statusi RLS.
  `authenticated` dhe `PUBLIC`.
- Migrimi 042 përcakton 20 tabela të tjera backend-only.
- Të 31 kandidatët e inventarit ekzistojnë në Production.
- `account_activation_tokens` dhe `auth_sessions` kanë RLS enabled, por zero
  politika dhe ende privilegj SELECT për `anon`/`authenticated`. Kjo nuk quhet
  automatikisht ekspozim efektiv Data API pa provë të request-it, por është
  gjetje kritike për ACL/RLS.
- Për 29 tabelat me RLS disabled, privilegjet publike janë rrezik i drejtpërdrejtë
  ose kërkojnë kontroll shtesë sipas përdorimit real; jo të gjitha klasifikohen
  automatikisht backend-only.
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

## Gjendja e konfirmuar e catalogut

| Grup | Numër | RLS | Privilegje API | Status |
|---|---:|---|---|---|
| Tabela me RLS disabled | 29 | DISABLED | SELECT/INSERT/UPDATE/DELETE për `anon` dhe `authenticated` | CRITICAL remediation; klasifikimi sipas API-së |
| `account_activation_tokens`, `auth_sessions` | 2 | ENABLED | SELECT për `anon` dhe `authenticated`; 0 policies | CRITICAL ACL/RLS remediation; Data API exposure EFFECTIVE = UNKNOWN |

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

## Renditja e remediation-it

1. Tokenët/sesionet dhe audit logs: blloko aksesin publik, pastaj testo login,
   reset, verification, refresh, expiry dhe replay.
2. ACL/authorization: testo `workspace A -> B`, record-level denial, owner/admin
   access dhe ndryshimet e roleve.
3. Invoices/subscriptions: testo list/create/update/pdf dhe izolimin financiar.
4. Invitations/portals/marketplace: testo recipient filtering, token scope dhe
   public-link boundaries.
5. Jobs/logistics/files: testo worker/backend role dhe refuzimin e CRUD nga API roles.

Çdo grup kërkon catalog snapshot para/pas në PostgreSQL të izoluar, prova negative
me `SET ROLE`, test Data API me anon/authenticated dhe rollback të migration-it të
veçantë. Nuk ka ndryshim të aplikuar në këtë PR.

## Kufizime dhe rollback

- Pa ndryshim Production, pa SQL Production dhe pa ndryshim të ledger/checksum-eve.
- Ky branch ndryshon vetëm dokumentacionin dhe një checker read-only.
- Rollback i auditit: revert commit-et e dokumentacionit/checker-it; nuk prek skemën.
- Rreziku kryesor i mbetur: pa catalog snapshot zyrtar nuk mund të konfirmohet
  lista reale prej 29 tabelash, privilegjet efektive apo Data API exposure.

Katalogu Production është i konfirmuar. Vetëm ekspozimi efektiv përmes Data API
mbetet **UNKNOWN** dhe kërkon test request-i read-only. Vendimi: **BLOCKED për
zbatim Production; READY për independent security review të auditit read-only.**
