# Update Blaster Webhook Secret in .env.local
# Run this to add the secret to your .env.local file

$secret = "c460767c3beeb636df2072746150b402d6295f8c90af33d9cc191824dc0b7630"
$envFile = ".env.local"

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    if ($content -match "BLASTER_WEBHOOK_SECRET=") {
        # Update existing
        $content = $content -replace "BLASTER_WEBHOOK_SECRET=.*", "BLASTER_WEBHOOK_SECRET=$secret"
        Set-Content $envFile $content
        Write-Host "✅ Updated BLASTER_WEBHOOK_SECRET in .env.local"
    } else {
        # Add new
        Add-Content $envFile "`n# Blaster Webhook`nBLASTER_WEBHOOK_SECRET=$secret"
        Write-Host "✅ Added BLASTER_WEBHOOK_SECRET to .env.local"
    }
} else {
    # Create new
    Set-Content $envFile "# Blaster Webhook`nBLASTER_WEBHOOK_SECRET=$secret"
    Write-Host "✅ Created .env.local with BLASTER_WEBHOOK_SECRET"
}
