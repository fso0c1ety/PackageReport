# Portal Readiness & Feature Gating

`src/portal-engine/readiness.ts` është burimi qendror për statusin e çdo `portalType`.

## Statuset

- `READY`: ka konfigurim registry, API reale, autorizim/scopes, actions dhe acceptance coverage.
- `PARTIAL`: funksionaliteti ekziston, por ka kufizim të dokumentuar (aktualisht Driver deri në verifikimin e PR #114 në Windows).
- `SHELL`: ekzistojnë role/routes ose navigation presets, por mungon implementimi i plotë API/konfigurim/acceptance.
- `DISABLED`: tipi nuk është i regjistruar ose është mbyllur me qëllim.

## Sjellja

Readiness nuk ndryshon `PORTAL_TYPES`, role, memberships, workspace permissions ose record scopes. `portal-context` i kthen membership-in dhe readiness metadata. `professional-portal` lejon vetëm `READY` dhe `PARTIAL`; për `SHELL`/`DISABLED` kthen `409 PORTAL_NOT_READY` me `safeRoute`, pa query ose write.

URL-të direkte në portal shell shfaqin mesazh të kuptueshëm dhe kthim te `/home`. Sidebar dhe mobile navigation nuk reklamojnë seksione të portalit SHELL.

## Kalimi SHELL -> READY

Për çdo portal kërkohen:

1. `PortalConfig` në registry me template/job-role të përcaktuar.
2. API read me workspace, board, row dhe file authorization server-side.
3. Visible/hidden fields dhe record scopes të dokumentuara.
4. Write actions allowlisted, të validuara dhe të audituara.
5. Realtime/notification behavior ose vendim i dokumentuar që nuk nevojitet.
6. Seed demo i izoluar, pa production credentials/data.
7. Unit/integration tests dhe E2E A/B për login, navigation, read/write, files dhe unauthorized URL/API attempts.
8. Acceptance në Web dhe platformat native që deklarohen të mbështetura.
9. Përditësim i readiness entry vetëm pas evidence të mësipërme dhe review të veçantë.

Gating është fail-closed dhe nuk zëvendëson autorizimin backend.
