# Locking — plan që kërkon aprovim, jo ekzekutim Production

CI mat 045 dhe 046 me dy lidhje reale PostgreSQL: një bllokues të kontrolluar, timeout/abort dhe më pas aplikim pa contention. Dataset 10,000 uploaded_files nuk parashikon kohën në Production. Madhësia dhe lock wait real mbeten UNKNOWN deri te diagnostika e aprovuar.

045 CREATE INDEX kërkon SHARE lock: lejon SELECT por ndalon writes në tabelë gjatë ndërtimit. 046 merr ACCESS EXCLUSIVE mbi rows/tables/uploaded_files për të stabilizuar validimin e katalogut; kjo bllokon edhe reads. lock_timeout 3s është për pritjen e secilit lock, jo deadline global. statement_timeout 60s është për statement, jo kohëzgjatja totale e fazës.

Para Production: recovery point dhe restore të verifikuar, dritare mirëmbajtjeje e aprovuar, inspektim read-only i transaksioneve të gjata/lock waits/madhësive, approved plan/ledger/schema hashes. Në 55P03/57014 ndalo, rollback transaksionin; mos bëj retry automatik ose terminate të sesioneve të klientit. Kontrollo katalogun dhe ledger-in pas dështimit përpara një aprovimi të ri.

Alternativë me lock më të vogël: CREATE INDEX CONCURRENTLY për 045 dhe DROP INDEX CONCURRENTLY për duplicate të lejuara vetëm në plan jo-transaksional të veçantë. CONCURRENTLY nuk lejohet brenda transaksionit aktual, mund të lërë indeks INVALID në dështim dhe kërkon handling për dependencies/partitioned indexes dhe ledger. Nuk mjafton zëvendësim tekstual. Heqja e lock-ut global 046 pa provë ndaj catalog drift krijon garë, ndaj nuk implementohet këtu.

Rollback: rikrijo indekset e 046, pastaj kthe 045 vetëm pas review të lock budget. Ruaj rreshtat dhe historikun e ledger-it. Nuk ka ndryshime SQL të migrimeve në këtë PR; shtohen vetëm prova dhe dokumentim.
