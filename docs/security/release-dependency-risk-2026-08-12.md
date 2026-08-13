# Production dependency risk — 2026-08-12

`npm audit --omit=dev` reports 0 critical, 0 high, and 9 moderate findings. All nine findings are the same `uuid` advisory reached through transitive dependencies.

| Dependency path | Classification | Production reachability and relevance | Decision |
| --- | --- | --- | --- |
| `exceljs@4.4.0 > uuid@8.3.2` | Runtime reachable, advisory operation not reachable from user input | Smart Manage uses ExcelJS for XLSX parsing. The affected `uuid` behavior requires direct use of namespace UUID APIs with a caller-supplied undersized output buffer; the import path does not expose or call that operation. Upload validation, authorization, demo isolation acceptance, and real XLSX acceptance remain in place. | Accept temporarily. The audit-proposed ExcelJS downgrade is not a safe remediation. Track an upstream ExcelJS update. |
| `firebase-admin@13.10.0 > @google-cloud/firestore > google-gax > uuid@9.0.1` | Transitive runtime dependency, affected operation not exposed | Provider-internal identifier generation does not accept a Smart Manage caller-provided UUID buffer. | Accept temporarily; update with compatible Google/Firebase releases. |
| `firebase-admin@13.10.0 > @google-cloud/storage > gaxios > uuid@9.0.1` | Transitive runtime dependency, affected operation not exposed | Used inside provider transport code; Smart Manage does not invoke the vulnerable namespace/buffer API. | Accept temporarily; update with compatible upstream releases. |
| `firebase-admin@13.10.0 > @google-cloud/storage > teeny-request > uuid@9.0.1` | Transitive runtime dependency, affected operation not exposed | Used inside provider transport code; no user-controlled UUID output buffer reaches it. | Accept temporarily; update with compatible upstream releases. |

The application also directly depends on `uuid@13.0.2`, which is not affected. No override or `npm audit fix --force` is applied because forcing a single major version across these dependency trees can break provider and Excel compatibility.

The remaining TanStack Virtual lint warning is accepted as low risk. React Compiler intentionally skips memoization for `useVirtualizer()`; it is not an ESLint error, and the 10,000-row virtualization regression test passes.
