param(
  [Parameter(Mandatory=$true)][string]$BackupPath,
  [Parameter(Mandatory=$true)][ValidatePattern('^[a-fA-F0-9]{64}$')][string]$ExpectedSha256,
  [Parameter(Mandatory=$true)][switch]$ApprovedIsolatedRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ApprovedIsolatedRestore) { throw 'Explicit isolated restore approval required' }
if ($env:PGHOST -notin @('localhost','127.0.0.1')) { throw 'Only local PostgreSQL accepted' }
if ($env:PGDATABASE -notmatch '^smart_manage_restore_test_[a-zA-Z0-9_]+$') { throw 'Dedicated restore database required' }
if ($env:PGSERVICE -or $env:PGSERVICEFILE -or $env:PGOPTIONS -or $env:DATABASE_URL) { throw 'Remove alternate connection configuration before restore' }
$backupFile = Get-Item -LiteralPath $BackupPath
if ((Get-FileHash -LiteralPath $backupFile.FullName -Algorithm SHA256).Hash -ne $ExpectedSha256) { throw 'Backup integrity mismatch' }
$serverVersion = & psql --no-password -X -At -c 'SHOW server_version_num'
if ($LASTEXITCODE -ne 0 -or [int]$serverVersion -lt 170000 -or [int]$serverVersion -ge 180000) { throw 'PostgreSQL 17 is required' }
$tables = & psql --no-password -X -At -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m')"
if ($LASTEXITCODE -ne 0 -or [int]$tables -ne 0) { throw 'Restore destination must be empty' }
# No --clean, no Production connection, no password/connection-string arguments.
# Run offline with approved sanitized roles pre-created; archive may contain private data.
& pg_restore --no-password --exit-on-error --single-transaction --no-owner --dbname $env:PGDATABASE $backupFile.FullName
if ($LASTEXITCODE -ne 0) { throw 'Restore failed; transaction rolled back' }
Write-Output 'Restore completed. Schema, ACL, ledger and application compatibility verification still required.'
