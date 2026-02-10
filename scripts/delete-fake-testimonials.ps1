# Delete fake testimonials from database
# These were demo testimonials added in migration 20260203200000

Write-Host "Deleting fake testimonials from database..." -ForegroundColor Cyan

# Load environment variables
Get-Content .env.local | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        Set-Item -Path "env:$($matches[1].Trim())" -Value $matches[2].Trim()
    }
}

# Execute deletion
Get-Content scripts\delete-fake-testimonials.sql | npx.cmd prisma db execute --stdin

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Fake testimonials deleted successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Failed to delete testimonials" -ForegroundColor Red
    exit 1
}
