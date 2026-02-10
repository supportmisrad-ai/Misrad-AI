# Verify trial_days defaults were changed to 7

# Load environment variables
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
    }
}

Write-Host "Verifying trial_days column defaults..." -ForegroundColor Cyan

# SQL query to check column defaults
$query = @"
SELECT 
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'trial_days'
  AND table_name IN ('social_organizations', 'social_team_members')
ORDER BY table_name;
"@

# Execute query
$query | npx.cmd prisma db execute --stdin

Write-Host "`nVerification complete!" -ForegroundColor Green
