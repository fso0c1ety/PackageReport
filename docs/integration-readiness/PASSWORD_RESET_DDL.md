# Password reset — scope i kufizuar

DDL e helper-it dublikon migrimin ekzistues 004. Nuk nevojitet migrim i ri dhe nuk ndryshohet checksum historik. Hiqet vetëm provisioning nga request-i; export-i kompatibil mbetet për caller-at ekzistues. Instalimet legacy duhet të kenë migrimin 004 realisht të ekzekutuar përpara përdorimit; në mungesë skeme request-i dështon, nuk vetëriparon skemën. Nuk preken token semantics, user ID TEXT, grants, RLS ose të dhënat.

Rollback: revert i helper-it vetëm pas review; rikthimi i runtime DDL nuk rekomandohet si zgjidhje normale. Asnjë down migration/destruksion nuk nevojitet. Clean install dhe suite-t API ekzekutohen në CI izoluar. Testi i ri kontrollon zero SQL/metadata nga compatibility helper, jo një password-reset email end-to-end.

Inventari është listë statike kandidatësh me file/line, jo provë e numrit të ekzekutimeve. Grupet e tjera mbeten të papërfunduara dhe duhen Draft PR të tjera të kufizuara pas krahasimit me migrimet ekzistuese. Nuk deklarohet eliminim i plotë runtime DDL.
