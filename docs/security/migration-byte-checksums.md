# Migration byte provenance

Reproduced using git show HEAD:path as a Buffer and SHA256, then replacing LF
with CRLF. No SQL content changes were made.

| Migration | Committed LF bytes / canonical LF | Windows CRLF bytes previously documented |
|---|---|---|
| 048 | ce15210c3d4165230d1909e73994738ddbbb1fd04fd12e2b23252ff3ca6e24d1 | fc3da9f13f6dea3d7d8d96d231b6af78bc6db464666541df82460e6f0a7c14ba |
| 044 | c6c6b14ad25235d0c25f15dcb097975548cfdefbe2e1b0ac47592747e9ceda10 | 20b3baa91e31565b97d5e9dca3e267132670261e3323a4208bdb0ff44d0eb1b9 |

048 git blob: afd8690465f384a8b91e3bb74020f008f5e99f19.
The earlier values describe Windows checkout bytes, not GitHub/Linux file bytes.
Operational documents naming the earlier hash must identify it as CRLF; executable
validators use canonical LF. Re-review the exact execution bytes and envelope
before Production authorization. This does not authorize changing migration SQL.
