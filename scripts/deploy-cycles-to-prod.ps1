# ═══════════════════════════════════════════════════════════════════
# Deploy Client Cycles Migration to Production
# ═══════════════════════════════════════════════════════════════════

# Read DATABASE_URL from .env.prod_backup
$envContent = Get-Content .env.prod_backup -Raw
$databaseUrl = ($envContent -split "`n" | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "^DATABASE_URL=", "" -replace '"', '' -replace "'", ''

if (-not $databaseUrl) {
    Write-Error "DATABASE_URL not found in .env.prod_backup"
    exit 1
}

Write-Host "Deploying migration to production DB..." -ForegroundColor Green
Write-Host "This will create the following tables:" -ForegroundColor Yellow
Write-Host "  - client_cycles" -ForegroundColor Cyan
Write-Host "  - cycle_clients" -ForegroundColor Cyan
Write-Host "  - cycle_tasks" -ForegroundColor Cyan
Write-Host "  - cycle_task_completions" -ForegroundColor Cyan
Write-Host "  - cycle_assets" -ForegroundColor Cyan
Write-Host ""

$confirmation = Read-Host "Are you sure you want to deploy to PRODUCTION? (type 'yes' to confirm)"
if ($confirmation -ne 'yes') {
    Write-Host "Deployment cancelled." -ForegroundColor Red
    exit 0
}

# Set the DATABASE_URL for this session
$env:DATABASE_URL = $databaseUrl

# Run the migration
npx prisma migrate deploy

Write-Host ""
Write-Host "Migration completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify tables were created in production DB" -ForegroundColor Cyan
Write-Host "  2. Commit and push changes to GitHub" -ForegroundColor Cyan
Write-Host "  3. Deploy application to production" -ForegroundColor Cyan
