# Plan i veçant: default privileges në `public`

Ky dokument është vetëm plan review-je. Nuk është migration dhe nuk është ekzekutuar në Production.

## Evidenca read-only

Më 2026-10-22 katalogu Production raportoi default ACL për `postgres` dhe `supabase_admin` në `public`, me privilegje për `anon` dhe `authenticated` mbi tabela, funksione dhe sekuenca. Kjo nuk provon vetë ekspozim efektiv të çdo objekti ekzistues; duhet ndarë nga `relrowsecurity`, ACL e objektit dhe ekspozimi Data API.

## Plan i kufizuar për review të pavarur

1. Inventarizo owner-in e çdo objekti të ri dhe përdorimet reale nga Data API, backend-i dhe job-et.
2. Përcakto objektet backend-only kundrejt atyre browser-accessible; mos përdor wildcard dhe mos ndrysho tabelat ekzistuese në këtë plan.
3. Për secilin owner, përgatit `ALTER DEFAULT PRIVILEGES FOR ROLE <owner> IN SCHEMA public` vetëm pasi të jetë aprovuar matrica e privilegjeve minimale.
4. Testo krijimin e një tabele/procedure sintetike në PostgreSQL të izoluar me `anon`, `authenticated`, `service_role` dhe rolin real të aplikacionit.
5. Verifiko negative access, tenant isolation, grants të pritshme dhe vazhdimësinë e login/reset, billing, invitations, portals dhe jobs.
6. Apliko vetëm në një maintenance window të miratuar, me backup/recovery point të verifikuar dhe abort nëse owner-i ose objektet nuk përputhen.

## Rollback dhe kufizime

Rollback-u duhet të jetë SQL i versionuar dhe i review-uar për të njëjtët owner-a/objekte; nuk lejohet `GRANT ALL` si rikuperim. Ky plan nuk autorizon SQL Production, ndryshim RLS/ACL, ndryshim Data API ose shënim migrimesh si applied.
