param([Parameter(Mandatory=$true)][string]$DockerExecutable)
$ErrorActionPreference = 'Stop'
# Fixed local container only: never accepts a database URL or production project.
$testContainer = 'supabase_db_flavor-flow-isolated'
$containerState = & $DockerExecutable inspect --format '{{.State.Running}}' $testContainer
if ($LASTEXITCODE -ne 0 -or $containerState -ne 'true') { throw 'Isolated Supabase database is not running.' }
$existing = & $DockerExecutable exec $testContainer psql -U postgres -d postgres -Atc "select to_regclass('public.stores') is not null"
if ($LASTEXITCODE -ne 0) { throw 'Cannot inspect isolated database.' }
if ($existing -eq 't') { throw 'Test requires a fresh isolated database; nothing was overwritten.' }
$sql = "begin; set local statement_timeout='60s';`n"
Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '../supabase/migrations') -Filter '*.sql' |
 Sort-Object Name | ForEach-Object { $sql += (Get-Content -LiteralPath $_.FullName -Raw) + "`n" }
$sql += Get-Content -LiteralPath (Join-Path $PSScriptRoot '../tests/commercial-readiness.integration.sql') -Raw
$sql += Get-Content -LiteralPath (Join-Path $PSScriptRoot '../tests/support-isolation.integration.sql') -Raw
$sql += "`nrollback; select 'PASS: isolated schema and fixture tests rolled back';"
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$sql | & $DockerExecutable exec -i $testContainer psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q
if ($LASTEXITCODE -ne 0) { throw 'Isolated readiness test failed; transaction rolled back.' }
