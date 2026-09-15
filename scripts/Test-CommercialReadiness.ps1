param([Parameter(Mandatory=$true)][string]$SupabaseExecutable)
$ErrorActionPreference = 'Stop'
# Deliberately read-only after ROLLBACK; never use this runner to commit migrations.
$migrationNames = @(
 '20260912000400_commercial_authorization.sql',
 '20260912000500_kitchen_commands.sql',
 '20260912000600_campaign_destinations.sql',
 '20260912000700_subscription_lifecycle.sql',
 '20260912000800_sales_reporting.sql',
 '20260912000900_owner_setup.sql',
 '20260912001000_support_tickets.sql',
 '20260912001100_actionable_incidents.sql'
 '20260913000100_store_subscription_summary.sql'
)
$readinessSql = "begin; set local statement_timeout='30s';"
foreach ($migrationName in $migrationNames) {
 $readinessSql += Get-Content -LiteralPath (Join-Path $PSScriptRoot "../supabase/migrations/$migrationName") -Raw
}
$readinessSql += Get-Content -LiteralPath (Join-Path $PSScriptRoot '../tests/commercial-readiness.integration.sql') -Raw
$readinessSql += Get-Content -LiteralPath (Join-Path $PSScriptRoot '../tests/support-isolation.integration.sql') -Raw
$readinessSql += "rollback; select 'PASS: readiness integration fixtures rolled back' as result;"
$testArtifact = New-TemporaryFile
try {
 # Generated test input, not a source edit; file mode avoids Windows command-length limits.
 Set-Content -LiteralPath $testArtifact.FullName -Value $readinessSql -Encoding utf8
 & $SupabaseExecutable db query --linked --file $testArtifact.FullName
 if ($LASTEXITCODE -ne 0) { throw 'Readiness integration failed; no migration committed.' }
} finally {
 Remove-Item -LiteralPath $testArtifact.FullName
}
