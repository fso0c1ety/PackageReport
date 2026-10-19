# Përmirësimi i provave, jo aprovim Production

BASE i pandryshueshëm: f21e6d34c9301397f6930406797d2bca4f5b4719.
HEAD është SHA i checkout-it CI. Të dy variantet përdorin të njëjtën databazë lokale dhe migration state; fixture-t janë sintetike. Runtime DDL benchmark mat vetëm schema prerequisites, jo HTTP route latency. Ai përfshin metadata cold lookup në HEAD dhe raporton p50/p95.

Row visibility ka fixtures pozitive dhe negative për team/department/company, pa rule.field të gabuar; faqja e parë duhet të ketë rezultate pozitive për çdo scope. Provat API dhe izolimi mbeten në integration-readiness.mjs dhe suite-t ekzistuese.

Notifications: 20 warmup, 100 requests për tenant, dy tenantë, tri përsëritje me procese/build-e të rinj. Ruhen mostrat individuale pa payload/identifikues. CI refuzon prova që mungojnë ose kanë madhësi të pamjaftueshme. BASE ekzekutohet para HEAD; GC/pool/concurrency nuk izolohen shkakësisht, ndaj përfundimi statistikor mbetet INCONCLUSIVE. Kjo nuk është provë reduktimi e faturimit Supabase.

Rollback: kthim vetëm i skripteve/workflow-ve të benchmark-ut. Nuk ndryshon autorizimin, skemën ose migrimet. Ky PR varet nga integration branch i përkohshëm dhe nuk duhet bashkuar verbërisht në main; korrigjimet duhet ndarë/bartur në PR-të burimore pas review.
