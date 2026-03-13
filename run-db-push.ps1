# Read DATABASE_URL from .env.prod_backup
$content = Get-Content .env.prod_backup -Raw
if ($content -match "DATABASE_URL=(.+?)[\r\n]") {
    $dbUrl = $matches[1].Trim()
    Write-Host "Found DATABASE_URL: $($dbUrl.Substring(0, [Math]::Min(20, $dbUrl.Length)))..."
    # Set environment variable and run prisma db push
    $env:DATABASE_URL = $dbUrl
    npx prisma db push --accept-data-loss
} else {
    Write-Error "DATABASE_URL not found in .env.prod_backup"
    Write-Host "File content preview:"
    Write-Host $content.Substring(0, [Math]::Min(200, $content.Length))
}
