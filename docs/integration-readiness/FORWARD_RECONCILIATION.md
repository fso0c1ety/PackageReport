# Faza forward e varur — Draft, jo autorizim Production

Plani v1 043 → 041 → 042 mbetet i pandryshuar. Plani v2 lejon vetëm 044 → 045 → 046 pasi ledger-i përmban të tri varësitë me checksums të sakta; nuk supozon aplikim në Production dhe nuk plotëson NULL-et historike. Nëntë NULL kërkohen dhe ruhen. Replay, schema/ledger/plan drift dhe approval i skaduar refuzohen.

Kërkohen SHA i aprovuar dhe i checkout-it, identiteti i projektit në URL/config, manifest hash, schema hash, ledger hash, plan hash, aprovim eksplicit forward dhe maintenance window maksimum dy orë. Backup digest në manifest është referencë ndaj provës së review-uar, JO test automatik restore. Reviewer duhet të verifikojë backup-in, rikthimin dhe maintenance real përpara dhënies së approval. Ky kod nuk provon që write freeze është aktiv.

Ekzekutimi përdor transaksionin ekzistues të manual-migrations; ledger entries shtohen vetëm pasi SQL real përfundon. Dështimi kthen të gjitha migrimet e kësaj faze. Pas commit nuk ripërdoret approval-i; rollback i skemës kërkon plan të ri dhe ruajtje/rakordim eksplicit të historikut. 044 additive nuk duhet kthyer duke fshirë tabela ose të dhëna. Për 046 rikrijohen indekset e hequra para kthimit të 045.

Workflow ekzistues Production nuk ndryshohet dhe nuk niset. Testi PostgreSQL përdor vetëm databazë CI të shkatërrueshme; ndryshimet sintetike në ledger nuk kryhen mbi restored customer copy. Restored-copy validation mbetet e papërfunduar dhe kërkon ambient të disponueshëm. Pa merge/deploy/Production SQL.
