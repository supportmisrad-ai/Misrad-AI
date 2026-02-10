# Script to apply trial_days migration
# Sets environment variables and runs prisma migrate resolve

# Load environment variables from .env.local
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Item -Path "env:$key" -Value $value
    }
}

Write-Host "Environment variables loaded from .env.local" -ForegroundColor Green
Write-Host "Running prisma migrate resolve..." -ForegroundColor Cyan

# Run the migration resolve command
npx.cmd prisma migrate resolve --applied 20260210125229_change_trial_days_default_to_7

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nMigration marked as applied successfully!" -ForegroundColor Green
    
    # Verify with migrate status
    Write-Host "`nVerifying migration status..." -ForegroundColor Cyan
    npx.cmd prisma migrate status
} else {
    Write-Host "`nFailed to mark migration as applied" -ForegroundColor Red
    exit 1
}
